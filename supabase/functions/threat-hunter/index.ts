import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function executeHuntQuery(query: any, supabase: any): Promise<any[]> {
  const results = [];

  if (query.type === 'suspicious_ips') {
    const { data: threatIntel } = await supabase
      .from('threat_intelligence')
      .select('*')
      .gte('threat_score', query.params.minScore || 70)
      .order('threat_score', { ascending: false })
      .limit(100);

    if (threatIntel) {
      for (const intel of threatIntel) {
        const { count: incidentCount } = await supabase
          .from('incidents')
          .select('*', { count: 'exact', head: true })
          .or(`description.ilike.%${intel.indicator}%,title.ilike.%${intel.indicator}%`);

        if (incidentCount > 0) {
          results.push({
            indicator: intel.indicator,
            threat_score: intel.threat_score,
            related_incidents: incidentCount,
            metadata: intel.metadata,
          });
        }
      }
    }
  } else if (query.type === 'anomalous_behavior') {
    const { data: anomalies } = await supabase
      .from('anomaly_detections')
      .select('*')
      .gte('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .in('severity', ['high', 'critical'])
      .order('detected_at', { ascending: false });

    if (anomalies) {
      results.push(...anomalies.map(a => ({
        type: 'anomaly',
        metric: a.metric_name,
        severity: a.severity,
        deviation_score: a.deviation_score,
        detected_at: a.detected_at,
        context: a.context,
      })));
    }
  } else if (query.type === 'persistence_mechanisms') {
    const { data: processes } = await supabase
      .from('system_processes')
      .select('*')
      .eq('status', 'suspicious')
      .order('created_at', { ascending: false })
      .limit(50);

    if (processes) {
      results.push(...processes.map(p => ({
        type: 'suspicious_process',
        process_name: p.process_name,
        pid: p.pid,
        command_line: p.command_line,
        username: p.username,
        detected_at: p.detected_at,
      })));
    }

    const { data: fileEvents } = await supabase
      .from('file_events')
      .select('*')
      .eq('suspicious', true)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (fileEvents) {
      results.push(...fileEvents.map(f => ({
        type: 'suspicious_file',
        file_path: f.file_path,
        event_type: f.event_type,
        file_hash: f.file_hash,
        username: f.username,
        timestamp: f.timestamp,
      })));
    }
  } else if (query.type === 'lateral_movement') {
    const { data: correlations } = await supabase
      .from('correlated_incidents')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .gte('confidence_score', 70)
      .order('created_at', { ascending: false });

    if (correlations) {
      results.push(...correlations.map(c => ({
        type: 'correlated_attack',
        summary: c.summary,
        confidence_score: c.confidence_score,
        incident_count: (c.incident_ids as any[]).length,
        attack_chain: c.attack_chain,
        created_at: c.created_at,
      })));
    }
  } else if (query.type === 'data_exfiltration') {
    const { data: networkTraffic } = await supabase
      .from('network_traffic')
      .select('*')
      .eq('threat_detected', true)
      .order('captured_at', { ascending: false })
      .limit(100);

    if (networkTraffic) {
      results.push(...networkTraffic.map(n => ({
        type: 'suspicious_traffic',
        source_ip: n.source_ip,
        destination_ip: n.destination_ip,
        protocol: n.protocol,
        packet_size: n.packet_size,
        country: n.country,
        captured_at: n.captured_at,
      })));
    }
  }

  return results;
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

    const { campaign_id } = await req.json();

    const { data: campaign } = await supabase
      .from('hunt_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .maybeSingle();

    if (!campaign) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Campaign not found',
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    await supabase
      .from('hunt_campaigns')
      .update({ status: 'active' })
      .eq('id', campaign_id);

    const queries = campaign.queries as any[];
    let allFindings: any[] = [];

    for (const query of queries) {
      const queryResults = await executeHuntQuery(query, supabase);
      allFindings = allFindings.concat(queryResults);
    }

    const groupedFindings: Record<string, any[]> = {};

    for (const finding of allFindings) {
      const key = finding.type || 'general';
      if (!groupedFindings[key]) {
        groupedFindings[key] = [];
      }
      groupedFindings[key].push(finding);
    }

    const createdFindings = [];

    for (const [type, findings] of Object.entries(groupedFindings)) {
      if (findings.length > 0) {
        const severity = findings.some((f: any) => f.severity === 'critical') ? 'critical' :
                        findings.some((f: any) => f.severity === 'high') ? 'high' :
                        findings.length > 10 ? 'high' : 'medium';

        const { data: finding } = await supabase
          .from('hunt_findings')
          .insert({
            campaign_id: campaign_id,
            title: `${type} detected (${findings.length} items)`,
            description: `Found ${findings.length} instances of ${type} during threat hunting`,
            severity,
            indicators: findings.map((f: any) => f.indicator || f.metric || f.process_name || f.file_path || 'N/A'),
            evidence: { findings },
            recommended_actions: getRecommendedActions(type),
            status: 'new',
          })
          .select()
          .single();

        if (finding) {
          createdFindings.push(finding);
        }
      }
    }

    await supabase
      .from('hunt_campaigns')
      .update({
        findings_count: createdFindings.length,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaign_id);

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id,
        findings_count: createdFindings.length,
        findings: createdFindings,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error('Threat hunting error:', error);
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

function getRecommendedActions(findingType: string): string {
  const actions: Record<string, string> = {
    suspicious_ips: 'Block identified malicious IPs, investigate associated incidents, update firewall rules',
    anomaly: 'Investigate root cause, review system logs, check for unauthorized changes',
    suspicious_process: 'Terminate suspicious processes, scan for malware, review process origins',
    suspicious_file: 'Quarantine suspicious files, run antivirus scan, check file signatures',
    correlated_attack: 'Investigate full attack chain, isolate affected systems, review security controls',
    suspicious_traffic: 'Monitor destination IPs, check for data leakage, review network policies',
  };

  return actions[findingType] || 'Investigate further and take appropriate remediation actions';
}
