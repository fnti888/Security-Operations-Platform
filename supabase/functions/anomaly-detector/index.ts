import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface StatisticalData {
  mean: number;
  stddev: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
}

function calculateStatistics(values: number[]): StatisticalData {
  if (values.length === 0) {
    return { mean: 0, stddev: 0, min: 0, max: 0, p95: 0, p99: 0 };
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stddev = Math.sqrt(variance);

  const sorted = [...values].sort((a, b) => a - b);
  const p95Index = Math.floor(values.length * 0.95);
  const p99Index = Math.floor(values.length * 0.99);

  return {
    mean,
    stddev,
    min: Math.min(...values),
    max: Math.max(...values),
    p95: sorted[p95Index] || sorted[sorted.length - 1],
    p99: sorted[p99Index] || sorted[sorted.length - 1],
  };
}

function detectAnomaly(value: number, baseline: StatisticalData): {
  isAnomaly: boolean;
  severity: string;
  deviationScore: number;
} {
  const deviation = Math.abs(value - baseline.mean);
  const deviationScore = baseline.stddev > 0 ? deviation / baseline.stddev : 0;

  let isAnomaly = false;
  let severity = 'low';

  if (deviationScore > 3) {
    isAnomaly = true;
    severity = 'critical';
  } else if (deviationScore > 2) {
    isAnomaly = true;
    severity = 'high';
  } else if (deviationScore > 1.5) {
    isAnomaly = true;
    severity = 'medium';
  } else if (deviationScore > 1) {
    isAnomaly = true;
    severity = 'low';
  }

  return { isAnomaly, severity, deviationScore };
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

    const metrics = [
      { name: 'cpu_usage', table: 'system_metrics', column: 'cpu_usage' },
      { name: 'memory_usage', table: 'system_metrics', column: 'memory_usage' },
      { name: 'network_usage', table: 'system_metrics', column: 'network_usage' },
      { name: 'active_threats', table: 'system_metrics', column: 'active_threats' },
      { name: 'incident_rate', table: 'incidents', column: 'count' },
      { name: 'alert_rate', table: 'alerts', column: 'count' },
    ];

    const anomaliesDetected = [];

    for (const metric of metrics) {
      const lookbackHours = 24;
      const lookbackDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

      let values: number[] = [];
      let currentValue = 0;

      if (metric.table === 'system_metrics') {
        const { data: historical } = await supabase
          .from(metric.table)
          .select(metric.column)
          .gte('recorded_at', lookbackDate)
          .order('recorded_at', { ascending: false });

        if (historical && historical.length > 0) {
          values = historical.map((row: any) => row[metric.column] || 0);
          currentValue = values[0];
        }
      } else if (metric.table === 'incidents' || metric.table === 'alerts') {
        const { count } = await supabase
          .from(metric.table)
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

        currentValue = count || 0;

        for (let i = 1; i <= 24; i++) {
          const startTime = new Date(Date.now() - (i + 1) * 60 * 60 * 1000).toISOString();
          const endTime = new Date(Date.now() - i * 60 * 60 * 1000).toISOString();

          const { count: hourCount } = await supabase
            .from(metric.table)
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startTime)
            .lt('created_at', endTime);

          values.push(hourCount || 0);
        }
      }

      if (values.length < 10) {
        continue;
      }

      const stats = calculateStatistics(values);

      let { data: baseline } = await supabase
        .from('behavioral_baselines')
        .select('*')
        .eq('metric_name', metric.name)
        .eq('baseline_type', 'hourly')
        .gt('valid_until', new Date().toISOString())
        .maybeSingle();

      if (!baseline) {
        const { data: newBaseline } = await supabase
          .from('behavioral_baselines')
          .insert({
            metric_name: metric.name,
            baseline_type: 'hourly',
            statistical_data: stats,
            sample_size: values.length,
          })
          .select()
          .single();

        baseline = newBaseline;
      } else {
        await supabase
          .from('behavioral_baselines')
          .update({
            statistical_data: stats,
            sample_size: values.length,
            calculated_at: new Date().toISOString(),
          })
          .eq('id', baseline.id);
      }

      const baselineStats = baseline?.statistical_data as StatisticalData;
      const { isAnomaly, severity, deviationScore } = detectAnomaly(currentValue, baselineStats);

      if (isAnomaly) {
        const { data: anomaly } = await supabase
          .from('anomaly_detections')
          .insert({
            baseline_id: baseline?.id,
            metric_name: metric.name,
            observed_value: currentValue,
            expected_range: {
              min: baselineStats.mean - 2 * baselineStats.stddev,
              max: baselineStats.mean + 2 * baselineStats.stddev,
              mean: baselineStats.mean,
            },
            deviation_score: deviationScore,
            severity,
            context: {
              historical_mean: baselineStats.mean,
              historical_stddev: baselineStats.stddev,
              sample_size: values.length,
            },
          })
          .select()
          .single();

        if (anomaly) {
          anomaliesDetected.push(anomaly);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        anomalies: anomaliesDetected,
        message: `Analyzed ${metrics.length} metrics, detected ${anomaliesDetected.length} anomalies`,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error('Anomaly detection error:', error);
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
