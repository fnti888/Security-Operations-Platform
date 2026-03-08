import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    const { indicator, indicator_type } = await req.json();

    let threatData: any = {
      indicator,
      indicator_type,
      threat_score: 0,
      threat_categories: [],
      sources: [],
      metadata: {},
    };

    if (indicator_type === 'ip') {
      const abuseResponse = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${indicator}`, {
        headers: {
          'Key': Deno.env.get("ABUSEIPDB_API_KEY") || 'demo',
          'Accept': 'application/json',
        },
      });

      if (abuseResponse.ok) {
        const abuseData = await abuseResponse.json();
        if (abuseData.data) {
          threatData.threat_score = abuseData.data.abuseConfidenceScore || 0;
          threatData.threat_categories = abuseData.data.usageType ? [abuseData.data.usageType] : [];
          threatData.sources.push('AbuseIPDB');
          threatData.metadata.country = abuseData.data.countryCode;
          threatData.metadata.isp = abuseData.data.isp;
          threatData.metadata.reports = abuseData.data.totalReports;
        }
      }

      const vtResponse = await fetch(`https://www.virustotal.com/api/v3/ip_addresses/${indicator}`, {
        headers: {
          'x-apikey': Deno.env.get("VIRUSTOTAL_API_KEY") || 'demo',
        },
      });

      if (vtResponse.ok) {
        const vtData = await vtResponse.json();
        if (vtData.data) {
          const stats = vtData.data.attributes?.last_analysis_stats;
          if (stats) {
            const malicious = stats.malicious || 0;
            const suspicious = stats.suspicious || 0;
            const total = Object.values(stats).reduce((a: number, b: number) => a + b, 0);

            threatData.threat_score = Math.max(threatData.threat_score, Math.round((malicious + suspicious) / total * 100));
            threatData.sources.push('VirusTotal');
            threatData.metadata.vt_detections = `${malicious}/${total}`;
          }
        }
      }
    }

    const { data: existing } = await supabase
      .from('threat_intelligence')
      .select('id')
      .eq('indicator', indicator)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('threat_intelligence')
        .update({
          ...threatData,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('threat_intelligence')
        .insert({
          ...threatData,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: threatData,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error('Threat enrichment error:', error);
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
