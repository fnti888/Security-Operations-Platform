import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ThreatIntelQuery {
  indicator: string;
  indicator_type: 'ip' | 'domain' | 'hash' | 'url';
  sources?: string[];
}

async function checkCache(supabase: any, indicator: string): Promise<any | null> {
  const { data } = await supabase
    .from('threat_intel_cache')
    .select('*')
    .eq('indicator', indicator)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  return data;
}

async function queryAbuseIPDB(ip: string, apiKey: string): Promise<any> {
  try {
    const response = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90&verbose`, {
      headers: {
        'Key': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`AbuseIPDB API error: ${response.status}`);
    }

    const result = await response.json();
    return {
      source: 'abuseipdb',
      confidence_score: result.data?.abuseConfidenceScore || 0,
      threat_level: result.data?.abuseConfidenceScore > 75 ? 'high' :
                     result.data?.abuseConfidenceScore > 50 ? 'medium' :
                     result.data?.abuseConfidenceScore > 25 ? 'low' : 'clean',
      data: {
        ip: result.data?.ipAddress,
        is_public: result.data?.isPublic,
        is_whitelisted: result.data?.isWhitelisted,
        abuse_confidence_score: result.data?.abuseConfidenceScore,
        country_code: result.data?.countryCode,
        usage_type: result.data?.usageType,
        isp: result.data?.isp,
        domain: result.data?.domain,
        total_reports: result.data?.totalReports,
        num_distinct_users: result.data?.numDistinctUsers,
        last_reported_at: result.data?.lastReportedAt,
      },
      tags: result.data?.totalReports > 0 ? ['reported', 'malicious'] : ['clean'],
    };
  } catch (error: any) {
    console.error('AbuseIPDB query failed:', error);
    return null;
  }
}

async function queryVirusTotal(indicator: string, type: string, apiKey: string): Promise<any> {
  try {
    let endpoint = '';
    let id = indicator;

    if (type === 'ip') {
      endpoint = `https://www.virustotal.com/api/v3/ip_addresses/${indicator}`;
    } else if (type === 'domain') {
      endpoint = `https://www.virustotal.com/api/v3/domains/${indicator}`;
    } else if (type === 'hash') {
      endpoint = `https://www.virustotal.com/api/v3/files/${indicator}`;
    } else if (type === 'url') {
      const urlId = btoa(indicator).replace(/=/g, '');
      endpoint = `https://www.virustotal.com/api/v3/urls/${urlId}`;
    }

    const response = await fetch(endpoint, {
      headers: {
        'x-apikey': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`VirusTotal API error: ${response.status}`);
    }

    const result = await response.json();
    const stats = result.data?.attributes?.last_analysis_stats || {};
    const malicious = stats.malicious || 0;
    const suspicious = stats.suspicious || 0;
    const total = Object.values(stats).reduce((sum: number, val: any) => sum + val, 0) as number;

    return {
      source: 'virustotal',
      confidence_score: total > 0 ? Math.round(((malicious + suspicious) / total) * 100) : 0,
      threat_level: malicious > 5 ? 'high' :
                     malicious > 2 ? 'medium' :
                     malicious > 0 || suspicious > 0 ? 'low' : 'clean',
      data: {
        malicious,
        suspicious,
        harmless: stats.harmless || 0,
        undetected: stats.undetected || 0,
        reputation: result.data?.attributes?.reputation,
        last_analysis_date: result.data?.attributes?.last_analysis_date,
        categories: result.data?.attributes?.categories,
      },
      tags: malicious > 0 ? ['malicious', 'detected'] : suspicious > 0 ? ['suspicious'] : ['clean'],
    };
  } catch (error: any) {
    console.error('VirusTotal query failed:', error);
    return null;
  }
}

async function queryOTX(indicator: string, type: string): Promise<any> {
  try {
    let endpoint = '';

    if (type === 'ip') {
      endpoint = `https://otx.alienvault.com/api/v1/indicators/IPv4/${indicator}/general`;
    } else if (type === 'domain') {
      endpoint = `https://otx.alienvault.com/api/v1/indicators/domain/${indicator}/general`;
    } else if (type === 'hash') {
      endpoint = `https://otx.alienvault.com/api/v1/indicators/file/${indicator}/general`;
    }

    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(`OTX API error: ${response.status}`);
    }

    const result = await response.json();
    const pulseCount = result.pulse_info?.count || 0;

    return {
      source: 'alienvault_otx',
      confidence_score: pulseCount > 10 ? 90 : pulseCount > 5 ? 70 : pulseCount > 0 ? 50 : 0,
      threat_level: pulseCount > 10 ? 'high' : pulseCount > 5 ? 'medium' : pulseCount > 0 ? 'low' : 'clean',
      data: {
        pulse_count: pulseCount,
        reputation: result.reputation || 0,
        country: result.country_name,
        asn: result.asn,
        tags: result.pulse_info?.pulses?.map((p: any) => p.name) || [],
      },
      tags: pulseCount > 0 ? ['threat-intelligence', 'otx-pulse'] : ['clean'],
    };
  } catch (error: any) {
    console.error('OTX query failed:', error);
    return null;
  }
}

function aggregateResults(results: any[]): any {
  const validResults = results.filter(r => r !== null);

  if (validResults.length === 0) {
    return {
      threat_level: 'unknown',
      confidence_score: 0,
      sources: [],
      aggregated_data: {},
      tags: [],
    };
  }

  const avgConfidence = Math.round(
    validResults.reduce((sum, r) => sum + r.confidence_score, 0) / validResults.length
  );

  const threatLevels = validResults.map(r => r.threat_level);
  const highestThreat = threatLevels.includes('high') ? 'high' :
                         threatLevels.includes('medium') ? 'medium' :
                         threatLevels.includes('low') ? 'low' : 'clean';

  const allTags = Array.from(new Set(validResults.flatMap(r => r.tags || [])));

  return {
    threat_level: highestThreat,
    confidence_score: avgConfidence,
    sources: validResults.map(r => r.source),
    source_data: validResults,
    aggregated_data: {
      source_count: validResults.length,
      sources: validResults.reduce((acc, r) => {
        acc[r.source] = r.data;
        return acc;
      }, {}),
    },
    tags: allTags,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get('Authorization');
    let userId = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      userId = user?.id;
    }

    const { indicator, indicator_type, sources, use_cache = true } = await req.json() as ThreatIntelQuery & { use_cache?: boolean };

    if (!indicator || !indicator_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: indicator and indicator_type' }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (use_cache) {
      const cached = await checkCache(supabaseClient, indicator);
      if (cached) {
        return new Response(
          JSON.stringify({
            success: true,
            cached: true,
            indicator,
            indicator_type,
            ...cached.data,
            expires_at: cached.expires_at,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const { data: credentials } = await supabaseClient
      .from('api_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    const apiKeys: Record<string, string> = {};
    credentials?.forEach((cred: any) => {
      apiKeys[cred.service_name] = cred.api_key;
    });

    const queries: Promise<any>[] = [];

    if (indicator_type === 'ip') {
      if (apiKeys.abuseipdb) {
        queries.push(queryAbuseIPDB(indicator, apiKeys.abuseipdb));
      }
      queries.push(queryOTX(indicator, indicator_type));
    }

    if (apiKeys.virustotal) {
      queries.push(queryVirusTotal(indicator, indicator_type, apiKeys.virustotal));
    }

    if (!apiKeys.virustotal && !apiKeys.abuseipdb && indicator_type === 'ip') {
      queries.push(queryOTX(indicator, indicator_type));
    }

    if (queries.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No API credentials configured. Please add API keys in settings.',
          indicator,
          indicator_type,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results = await Promise.all(queries);
    const aggregated = aggregateResults(results);

    const cacheEntry = {
      indicator,
      indicator_type,
      source: aggregated.sources.join(','),
      data: aggregated,
      confidence_score: aggregated.confidence_score,
      threat_level: aggregated.threat_level,
      tags: aggregated.tags,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    await supabaseClient
      .from('threat_intel_cache')
      .insert(cacheEntry);

    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        indicator,
        indicator_type,
        ...aggregated,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error('Threat intelligence error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
