import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function evaluateRule(rule: any, supabase: any): Promise<{ triggered: boolean; sourceData?: any }> {
  const conditions = rule.conditions as any;

  if (rule.rule_type === 'threshold') {
    const { metric, operator, value, timeWindow } = conditions;
    const since = new Date(Date.now() - (timeWindow || 3600) * 1000).toISOString();

    let currentValue = 0;

    if (metric === 'vulnerability_count') {
      const { count } = await supabase
        .from('vulnerability_findings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')
        .eq('severity', 'critical');
      currentValue = count || 0;
    } else if (metric === 'incident_count') {
      const { count } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'investigating'])
        .gte('created_at', since);
      currentValue = count || 0;
    } else if (metric === 'failed_login_attempts') {
      const { count } = await supabase
        .from('security_logs')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'login_failed')
        .gte('created_at', since);
      currentValue = count || 0;
    } else if (metric === 'ssl_expiring') {
      const { count } = await supabase
        .from('ssl_certificates')
        .select('*', { count: 'exact', head: true })
        .lt('days_until_expiry', 30)
        .eq('is_expired', false);
      currentValue = count || 0;
    }

    let triggered = false;
    if (operator === 'gt' && currentValue > value) triggered = true;
    if (operator === 'lt' && currentValue < value) triggered = true;
    if (operator === 'eq' && currentValue === value) triggered = true;
    if (operator === 'gte' && currentValue >= value) triggered = true;
    if (operator === 'lte' && currentValue <= value) triggered = true;

    return {
      triggered,
      sourceData: {
        metric,
        currentValue,
        threshold: value,
        operator,
        timeWindow,
      },
    };
  } else if (rule.rule_type === 'anomaly') {
    const { data: recentAnomalies } = await supabase
      .from('anomaly_detections')
      .select('*')
      .gte('detected_at', new Date(Date.now() - 3600 * 1000).toISOString())
      .gte('deviation_score', conditions.minDeviationScore || 2);

    return {
      triggered: recentAnomalies && recentAnomalies.length > 0,
      sourceData: {
        anomalies: recentAnomalies?.length || 0,
        details: recentAnomalies,
      },
    };
  } else if (rule.rule_type === 'correlation') {
    const { data: correlations } = await supabase
      .from('correlated_incidents')
      .select('*')
      .gte('created_at', new Date(Date.now() - 3600 * 1000).toISOString())
      .gte('confidence_score', conditions.minConfidence || 70);

    return {
      triggered: correlations && correlations.length > 0,
      sourceData: {
        correlations: correlations?.length || 0,
        details: correlations,
      },
    };
  }

  return { triggered: false };
}

async function sendNotification(alert: any, channels: string[]): Promise<void> {
  for (const channel of channels) {
    if (channel === 'in_app') {
      console.log(`In-app notification sent for alert: ${alert.title}`);
    } else if (channel === 'email') {
      console.log(`Email notification would be sent for alert: ${alert.title}`);
    } else if (channel === 'slack') {
      console.log(`Slack notification would be sent for alert: ${alert.title}`);
    } else if (channel === 'webhook') {
      console.log(`Webhook notification would be sent for alert: ${alert.title}`);
    }
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

    const { data: rules } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('enabled', true);

    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active alert rules',
          alerts_created: 0,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const alertsCreated = [];

    for (const rule of rules) {
      const { triggered, sourceData } = await evaluateRule(rule, supabase);

      if (triggered) {
        const { data: recentAlert } = await supabase
          .from('alerts')
          .select('*')
          .eq('rule_id', rule.id)
          .eq('status', 'new')
          .gte('created_at', new Date(Date.now() - 3600 * 1000).toISOString())
          .maybeSingle();

        if (!recentAlert) {
          const { data: alert } = await supabase
            .from('alerts')
            .insert({
              rule_id: rule.id,
              title: rule.name,
              description: rule.description,
              severity: rule.severity,
              status: 'new',
              source_data: sourceData,
            })
            .select()
            .single();

          if (alert) {
            await sendNotification(alert, rule.notification_channels || ['in_app']);
            alertsCreated.push(alert);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        rules_evaluated: rules.length,
        alerts_created: alertsCreated.length,
        alerts: alertsCreated,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error('Alert processing error:', error);
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
