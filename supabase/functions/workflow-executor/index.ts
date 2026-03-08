import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function executeAction(action: any, event: any, supabase: any, context: any): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    switch (action.type) {
      case 'create_alert':
        const { data: alert } = await supabase
          .from('alerts')
          .insert({
            title: action.params.title || `Automated Alert: ${event.type}`,
            message: action.params.message || JSON.stringify(event),
            alert_type: action.params.alert_type || 'security',
            severity: action.params.severity || event.severity || 'medium',
            status: 'active',
            metadata: {
              workflow_id: context.workflow_id,
              execution_id: context.execution_id,
              trigger_event: event.type,
            },
          })
          .select()
          .single();
        return { success: true, result: alert };

      case 'update_incident':
        if (event.incident_id) {
          const updateData: any = {};
          if (action.params.status) updateData.status = action.params.status;
          if (action.params.severity) updateData.severity = action.params.severity;
          if (action.params.assigned_to) updateData.assigned_to = action.params.assigned_to;
          if (action.params.notes) {
            updateData.notes = supabase.raw(`notes || '${action.params.notes}'`);
          }

          const { data: incident } = await supabase
            .from('incidents')
            .update(updateData)
            .eq('id', event.incident_id)
            .select()
            .single();
          return { success: true, result: incident };
        }
        return { success: false, error: 'No incident_id in event' };

      case 'enrich_threat':
        if (event.indicator) {
          const enrichResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/threat-intelligence`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              indicator: event.indicator,
              indicator_type: event.indicator_type || 'ip',
              use_cache: true,
            }),
          });
          const enrichData = await enrichResponse.json();

          if (enrichData.success && enrichData.threat_level !== 'clean') {
            await supabase
              .from('alerts')
              .insert({
                title: `Threat Intelligence: ${event.indicator}`,
                message: `Threat detected with ${enrichData.confidence_score}% confidence from ${enrichData.sources?.join(', ')}`,
                alert_type: 'threat_intelligence',
                severity: enrichData.threat_level === 'high' ? 'high' : 'medium',
                status: 'active',
                metadata: enrichData,
              });
          }

          return { success: true, result: enrichData };
        }
        return { success: false, error: 'No indicator in event' };

      case 'create_hunt_finding':
        const { data: finding } = await supabase
          .from('hunt_findings')
          .insert({
            campaign_id: action.params.campaign_id,
            title: action.params.title || event.title,
            description: action.params.description || event.description,
            severity: action.params.severity || event.severity || 'medium',
            indicators: event.indicators || [],
            evidence: event.evidence || {},
            status: 'new',
            metadata: {
              workflow_generated: true,
              workflow_id: context.workflow_id,
            },
          })
          .select()
          .single();
        return { success: true, result: finding };

      case 'log_audit':
        await supabase
          .from('audit_logs')
          .insert({
            user_id: event.user_id || context.user_id,
            action: action.params.action || 'workflow_execution',
            resource_type: action.params.resource_type || 'workflow',
            resource_id: context.workflow_id,
            changes: {
              event,
              action: action.type,
              params: action.params,
            },
            success: true,
          });
        return { success: true };

      case 'block_ip':
        if (event.source_ip || event.ip) {
          const ipToBlock = event.source_ip || event.ip;
          const { data: blockRule } = await supabase
            .from('firewall_rules')
            .insert({
              rule_type: 'block',
              source_ip: ipToBlock,
              reason: action.params.reason || `Automated block via workflow`,
              severity: event.severity || 'high',
              enabled: true,
              expires_at: action.params.duration
                ? new Date(Date.now() + action.params.duration * 1000).toISOString()
                : null,
            })
            .select()
            .single();
          return { success: true, result: blockRule };
        }
        return { success: false, error: 'No IP address to block' };

      case 'quarantine_file':
        if (event.file_path || event.file_hash) {
          const { data: quarantine } = await supabase
            .from('quarantined_files')
            .insert({
              file_path: event.file_path,
              file_hash: event.file_hash,
              file_size: event.file_size,
              reason: action.params.reason || 'Automated quarantine',
              detected_by: 'workflow_automation',
              status: 'quarantined',
            })
            .select()
            .single();
          return { success: true, result: quarantine };
        }
        return { success: false, error: 'No file information provided' };

      case 'send_notification':
        const { data: notification } = await supabase
          .from('notifications')
          .insert({
            user_id: action.params.user_id || event.user_id,
            title: action.params.title || event.title || 'Security Alert',
            message: action.params.message || event.message || JSON.stringify(event),
            type: action.params.notification_type || 'alert',
            severity: action.params.severity || event.severity || 'medium',
            read: false,
          })
          .select()
          .single();
        return { success: true, result: notification };

      case 'correlate_events':
        const timeWindow = action.params.time_window_minutes || 60;
        const { data: recentIncidents } = await supabase
          .from('incidents')
          .select('*')
          .gte('created_at', new Date(Date.now() - timeWindow * 60 * 1000).toISOString())
          .eq('status', 'open');

        const correlationCriteria = action.params.criteria || {};
        const correlated = recentIncidents?.filter((incident: any) => {
          if (correlationCriteria.source_ip && incident.source_ip !== event.source_ip) return false;
          if (correlationCriteria.attack_type && incident.attack_type !== event.attack_type) return false;
          if (correlationCriteria.severity && incident.severity !== event.severity) return false;
          return true;
        });

        if (correlated && correlated.length >= (action.params.min_events || 3)) {
          const { data: correlatedIncident } = await supabase
            .from('incident_correlations')
            .insert({
              title: `Correlated Attack: ${event.attack_type || 'Multiple Events'}`,
              description: `Detected ${correlated.length} related events within ${timeWindow} minutes`,
              severity: 'high',
              event_count: correlated.length,
              incident_ids: correlated.map((i: any) => i.id),
              status: 'open',
              indicators: {
                source_ips: [...new Set(correlated.map((i: any) => i.source_ip))],
                attack_types: [...new Set(correlated.map((i: any) => i.attack_type))],
              },
            })
            .select()
            .single();
          return { success: true, result: { correlated: true, incident: correlatedIncident, event_count: correlated.length } };
        }
        return { success: true, result: { correlated: false, event_count: correlated?.length || 0 } };

      case 'run_hunt_query':
        const huntQuery = action.params.query || event.query;
        if (!huntQuery) {
          return { success: false, error: 'No hunt query provided' };
        }

        const { data: huntResults } = await supabase
          .from(huntQuery.table || 'incidents')
          .select('*')
          .limit(action.params.limit || 100);

        if (huntResults && huntResults.length > 0) {
          const { data: huntFinding } = await supabase
            .from('hunt_findings')
            .insert({
              campaign_id: action.params.campaign_id,
              title: action.params.finding_title || 'Automated Hunt Finding',
              description: `Found ${huntResults.length} matching records`,
              severity: action.params.severity || 'medium',
              indicators: huntResults.map((r: any) => r.source_ip || r.indicator).filter(Boolean),
              evidence: { results: huntResults },
              status: 'new',
            })
            .select()
            .single();
          return { success: true, result: { found: true, count: huntResults.length, finding: huntFinding } };
        }
        return { success: true, result: { found: false, count: 0 } };

      case 'escalate_incident':
        if (event.incident_id) {
          const { data: incident } = await supabase
            .from('incidents')
            .update({
              severity: action.params.new_severity || 'critical',
              priority: action.params.priority || 1,
              status: action.params.status || 'escalated',
            })
            .eq('id', event.incident_id)
            .select()
            .single();

          await supabase
            .from('notifications')
            .insert({
              user_id: action.params.escalate_to,
              title: 'Incident Escalated',
              message: `Incident ${event.incident_id} has been escalated to ${action.params.new_severity}`,
              type: 'escalation',
              severity: 'high',
              read: false,
            });

          return { success: true, result: incident };
        }
        return { success: false, error: 'No incident_id provided' };

      case 'conditional':
        const condition = action.params.condition;
        const leftValue = event[condition.field];
        let conditionMet = false;

        switch (condition.operator) {
          case 'equals':
            conditionMet = leftValue === condition.value;
            break;
          case 'not_equals':
            conditionMet = leftValue !== condition.value;
            break;
          case 'greater_than':
            conditionMet = leftValue > condition.value;
            break;
          case 'less_than':
            conditionMet = leftValue < condition.value;
            break;
          case 'contains':
            conditionMet = String(leftValue).includes(condition.value);
            break;
          case 'in':
            conditionMet = Array.isArray(condition.value) && condition.value.includes(leftValue);
            break;
          default:
            conditionMet = false;
        }

        if (conditionMet && action.params.then_actions) {
          const results = [];
          for (const thenAction of action.params.then_actions) {
            const result = await executeAction(thenAction, event, supabase, context);
            results.push(result);
          }
          return { success: true, result: { condition_met: true, results } };
        }
        return { success: true, result: { condition_met: false } };

      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  } catch (error: any) {
    console.error(`Action execution error (${action.type}):`, error);
    return { success: false, error: error.message };
  }
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

    const { workflow_id, trigger_event } = await req.json();

    if (!workflow_id || !trigger_event) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: workflow_id and trigger_event',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: workflow } = await supabase
      .from('automation_workflows')
      .select('*')
      .eq('id', workflow_id)
      .eq('enabled', true)
      .maybeSingle();

    if (!workflow) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Workflow not found or disabled',
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

    const { data: execution } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id: workflow.id,
        trigger_event,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    const context = {
      workflow_id: workflow.id,
      execution_id: execution.id,
      user_id: workflow.created_by,
    };

    const actionsTaken = [];
    let hasError = false;
    let errorLog = '';

    const actions = workflow.actions as any[];
    for (const action of actions) {
      const result = await executeAction(action, trigger_event, supabase, context);

      actionsTaken.push({
        action: action.type,
        params: action.params,
        result: result.success ? result.result : null,
        error: result.error || null,
        timestamp: new Date().toISOString(),
      });

      if (!result.success) {
        hasError = true;
        errorLog += `${action.type}: ${result.error}\n`;

        if (action.params?.stop_on_error) {
          break;
        }
      }
    }

    await supabase
      .from('workflow_executions')
      .update({
        actions_taken: actionsTaken,
        status: hasError ? 'failed' : 'success',
        error_log: errorLog || null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', execution.id);

    await supabase
      .from('automation_workflows')
      .update({
        execution_count: workflow.execution_count + 1,
        last_executed: new Date().toISOString(),
      })
      .eq('id', workflow.id);

    return new Response(
      JSON.stringify({
        success: !hasError,
        execution_id: execution.id,
        workflow_id: workflow.id,
        actions_taken: actionsTaken,
        total_actions: actions.length,
        successful_actions: actionsTaken.filter(a => !a.error).length,
        failed_actions: actionsTaken.filter(a => a.error).length,
        error_log: errorLog || null,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error('Workflow execution error:', error);
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
