import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CorrelationConditions {
  event_type?: string;
  group_by?: string;
  unique_field?: string;
  distinct_count_threshold?: number;
  pattern?: string;
  interval_variance?: number;
  min_occurrences?: number;
  threshold_bytes?: number;
  unusual_destination?: boolean;
  result?: string;
  suspicious_paths?: string[];
  suspicious_names?: string[];
  target_files?: string[];
  rapid_changes?: boolean;
  extension_changes?: boolean;
  threshold_files?: number;
  suspicious_patterns?: string[];
}

async function evaluateConditions(
  incidents: any[],
  conditions: CorrelationConditions,
  minEvents: number
): Promise<{ matched: boolean; groups: any[]; confidence: number }> {
  const groupBy = conditions.group_by || 'source_ip';
  const grouped: Record<string, any[]> = {};

  for (const incident of incidents) {
    const key = incident[groupBy] || 'unknown';
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(incident);
  }

  const matchedGroups: any[] = [];

  for (const [key, group] of Object.entries(grouped)) {
    if (group.length < minEvents) continue;

    let matches = true;
    let confidence = 50;

    if (conditions.event_type) {
      const typeMatch = group.filter((i: any) =>
        i.attack_type?.toLowerCase().includes(conditions.event_type!.toLowerCase()) ||
        i.category?.toLowerCase().includes(conditions.event_type!.toLowerCase())
      );
      if (typeMatch.length < minEvents) {
        matches = false;
        continue;
      }
      confidence += 10;
    }

    if (conditions.unique_field && conditions.distinct_count_threshold) {
      const uniqueValues = new Set(group.map((i: any) => i[conditions.unique_field!]));
      if (uniqueValues.size < conditions.distinct_count_threshold) {
        matches = false;
        continue;
      }
      confidence += 15;
    }

    if (conditions.pattern === 'periodic') {
      const timestamps = group.map((i: any) => new Date(i.created_at).getTime()).sort((a, b) => a - b);
      if (timestamps.length >= 3) {
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
          intervals.push(timestamps[i] - timestamps[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => {
          return sum + Math.abs(interval - avgInterval) / avgInterval;
        }, 0) / intervals.length;

        const varianceThreshold = conditions.interval_variance || 0.2;
        if (variance > varianceThreshold) {
          matches = false;
          continue;
        }
        confidence += 20;
      }
    }

    if (conditions.result) {
      const resultMatch = group.filter((i: any) => i.status === conditions.result);
      if (resultMatch.length < minEvents) {
        matches = false;
        continue;
      }
      confidence += 10;
    }

    if (conditions.suspicious_paths && conditions.suspicious_paths.length > 0) {
      const pathMatch = group.filter((i: any) =>
        conditions.suspicious_paths!.some(path =>
          i.description?.includes(path) || i.metadata?.file_path?.includes(path)
        )
      );
      if (pathMatch.length === 0) {
        matches = false;
        continue;
      }
      confidence += 15;
    }

    if (matches) {
      const severityScore = group.reduce((score: number, i: any) => {
        if (i.severity === 'critical') return score + 4;
        if (i.severity === 'high') return score + 3;
        if (i.severity === 'medium') return score + 2;
        return score + 1;
      }, 0);

      confidence = Math.min(100, confidence + Math.round(severityScore / group.length * 10));

      matchedGroups.push({
        key,
        incidents: group,
        count: group.length,
        confidence,
      });
    }
  }

  return {
    matched: matchedGroups.length > 0,
    groups: matchedGroups,
    confidence: matchedGroups.length > 0
      ? Math.round(matchedGroups.reduce((sum, g) => sum + g.confidence, 0) / matchedGroups.length)
      : 0,
  };
}

function extractAttackChain(incidents: any[]): any[] {
  const techniques = new Map();

  for (const incident of incidents) {
    const techniqueId = incident.mitre_technique_id;
    const techniqueName = incident.mitre_technique_name;
    const tactic = incident.mitre_tactic;

    if (techniqueId && techniqueId !== 'Unknown') {
      if (!techniques.has(techniqueId)) {
        techniques.set(techniqueId, {
          technique_id: techniqueId,
          technique_name: techniqueName,
          tactic,
          count: 0,
          first_seen: incident.created_at,
          last_seen: incident.created_at,
        });
      }
      const tech = techniques.get(techniqueId);
      tech.count++;
      tech.last_seen = incident.created_at;
    }
  }

  return Array.from(techniques.values()).sort((a, b) => {
    return new Date(a.first_seen).getTime() - new Date(b.first_seen).getTime();
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: rules } = await supabase
      .from('correlation_rules_v2')
      .select('*')
      .eq('is_enabled', true);

    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active correlation rules',
          correlations: [],
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const correlations = [];
    const stats = {
      rules_processed: 0,
      incidents_analyzed: 0,
      correlations_found: 0,
    };

    for (const rule of rules) {
      stats.rules_processed++;

      const timeWindowMs = parseInt(rule.time_window?.toString() || '3600000');
      const timeWindow = new Date(Date.now() - timeWindowMs).toISOString();

      const { data: incidents } = await supabase
        .from('incidents')
        .select('*')
        .gte('created_at', timeWindow)
        .order('created_at', { ascending: false })
        .limit(500);

      if (!incidents || incidents.length < (rule.min_events || 3)) {
        continue;
      }

      stats.incidents_analyzed += incidents.length;

      const conditions = rule.conditions as CorrelationConditions;
      const evaluation = await evaluateConditions(incidents, conditions, rule.min_events || 3);

      if (!evaluation.matched) {
        continue;
      }

      for (const group of evaluation.groups) {
        const incidentIds = group.incidents.map((i: any) => i.id);

        const { data: existing } = await supabase
          .from('incident_correlations')
          .select('id, incident_ids')
          .eq('correlation_rule_id', rule.id)
          .eq('status', 'open')
          .maybeSingle();

        if (existing) {
          const existingIds = existing.incident_ids || [];
          const newIds = incidentIds.filter((id: string) => !existingIds.includes(id));

          if (newIds.length > 0) {
            const allIds = [...existingIds, ...newIds];
            const { data: updated } = await supabase
              .from('incident_correlations')
              .update({
                incident_ids: allIds,
                event_count: allIds.length,
                confidence_score: group.confidence,
                last_seen: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id)
              .select()
              .single();

            if (updated) {
              correlations.push(updated);
              stats.correlations_found++;
            }
          }
        } else {
          const attackChain = extractAttackChain(group.incidents);
          const affectedAssets = [...new Set(group.incidents.map((i: any) => i.destination_ip || i.target).filter(Boolean))];
          const indicators = {
            source_ips: [...new Set(group.incidents.map((i: any) => i.source_ip).filter(Boolean))],
            attack_types: [...new Set(group.incidents.map((i: any) => i.attack_type).filter(Boolean))],
            techniques: attackChain.map(t => t.technique_id),
          };

          const { data: correlation } = await supabase
            .from('incident_correlations')
            .insert({
              correlation_rule_id: rule.id,
              incident_ids: incidentIds,
              severity: rule.severity || 'medium',
              title: `${rule.name}: ${group.key}`,
              description: `Detected ${group.count} correlated incidents matching pattern "${rule.name}"`,
              event_count: group.count,
              confidence_score: group.confidence,
              attack_chain: attackChain,
              mitre_tactics: rule.mitre_tactics || [],
              mitre_techniques: rule.mitre_techniques || [],
              affected_assets: affectedAssets,
              indicators,
              status: 'open',
            })
            .select()
            .single();

          if (correlation) {
            correlations.push(correlation);
            stats.correlations_found++;

            await supabase
              .from('correlation_rules_v2')
              .update({
                detection_count: rule.detection_count + 1,
                last_triggered: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', rule.id);

            await supabase
              .from('alerts')
              .insert({
                title: `Correlation Detected: ${rule.name}`,
                message: `Found ${group.count} related incidents with ${group.confidence}% confidence`,
                alert_type: 'correlation',
                severity: rule.severity || 'medium',
                status: 'active',
                metadata: {
                  correlation_id: correlation.id,
                  rule_id: rule.id,
                  event_count: group.count,
                  confidence: group.confidence,
                  indicators,
                },
              });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        correlations,
        stats,
        message: `Processed ${stats.rules_processed} rules, analyzed ${stats.incidents_analyzed} incidents, found ${stats.correlations_found} correlations`,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error('Correlation engine error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
