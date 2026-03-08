import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface IPScoreResult {
  ip_address: string;
  score: number;
  risk_level: string;
  is_vpn: boolean;
  is_proxy: boolean;
  is_tor: boolean;
  is_hosting: boolean;
  country?: string;
  country_code?: string;
  city?: string;
  region?: string;
  isp?: string;
  asn?: string;
  organization?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  abuse_score: number;
  blacklists: string[];
  threat_types: string[];
  scan_metadata: Record<string, unknown>;
}

async function getIPInfo(ip: string): Promise<IPScoreResult> {
  try {
    const responses = await Promise.allSettled([
      fetch(`https://ipapi.co/${ip}/json/`),
      fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting`),
      fetch(`https://ipqualityscore.com/api/json/ip/demo/${ip}`).catch(() => null),
    ]);

    let score = 50;
    let risk_level = "medium";
    let is_vpn = false;
    let is_proxy = false;
    let is_tor = false;
    let is_hosting = false;
    let country = "";
    let country_code = "";
    let city = "";
    let region = "";
    let isp = "";
    let asn = "";
    let organization = "";
    let timezone = "";
    let latitude: number | undefined;
    let longitude: number | undefined;
    let abuse_score = 0;
    const blacklists: string[] = [];
    const threat_types: string[] = [];
    const scan_metadata: Record<string, unknown> = {};

    if (responses[0].status === "fulfilled") {
      const data = await responses[0].value.json();
      console.log("ipapi.co response:", data);
      if (!data.error && data.ip) {
        country = data.country_name || data.country || "";
        country_code = data.country_code || "";
        city = data.city || "";
        region = data.region || "";
        isp = data.org || "";
        asn = data.asn || "";
        timezone = data.timezone || "";
        latitude = data.latitude;
        longitude = data.longitude;
        is_hosting = data.asn?.includes("hosting") || data.org?.toLowerCase().includes("hosting") || false;
        scan_metadata.ipapi = data;
      }
    } else {
      console.error("ipapi.co failed:", responses[0].reason);
    }

    if (responses[1].status === "fulfilled") {
      const data = await responses[1].value.json();
      console.log("ip-api.com response:", data);
      if (data.status === "success") {
        country = country || data.country || "";
        country_code = country_code || data.countryCode || "";
        city = city || data.city || "";
        region = region || data.regionName || "";
        isp = isp || data.isp || "";
        organization = data.org || data.as || "";
        timezone = timezone || data.timezone || "";
        latitude = latitude || data.lat;
        longitude = longitude || data.lon;
        is_proxy = data.proxy || false;
        is_hosting = is_hosting || data.hosting || false;
        scan_metadata.ipapi_com = data;
      }
    } else {
      console.error("ip-api.com failed:", responses[1].reason);
    }

    if (responses[2].status === "fulfilled" && responses[2].value) {
      const data = await responses[2].value.json();
      if (data.success) {
        is_vpn = data.vpn || false;
        is_proxy = is_proxy || data.proxy || false;
        is_tor = data.tor || false;
        abuse_score = data.fraud_score || 0;
        scan_metadata.ipqs = data;

        if (data.recent_abuse) {
          threat_types.push("Recent Abuse");
          blacklists.push("IPQS Recent Abuse");
        }
        if (data.bot_status) {
          threat_types.push("Bot Activity");
        }
      }
    }

    if (is_tor) {
      score = 10;
      risk_level = "critical";
      threat_types.push("TOR Exit Node");
    } else if (is_vpn || is_proxy) {
      score = Math.max(20, 40 - abuse_score / 2);
      risk_level = abuse_score > 75 ? "critical" : abuse_score > 50 ? "high" : "medium";
      if (is_vpn) threat_types.push("VPN");
      if (is_proxy) threat_types.push("Proxy");
    } else if (is_hosting) {
      score = Math.max(30, 60 - abuse_score / 2);
      risk_level = abuse_score > 75 ? "high" : abuse_score > 50 ? "medium" : "low";
      threat_types.push("Hosting Provider");
    } else {
      score = Math.max(10, 100 - abuse_score);
      if (abuse_score > 75) {
        risk_level = "high";
      } else if (abuse_score > 50) {
        risk_level = "medium";
      } else {
        risk_level = "low";
      }
    }

    if (abuse_score > 50) {
      blacklists.push("High Abuse Score");
    }

    return {
      ip_address: ip,
      score,
      risk_level,
      is_vpn,
      is_proxy,
      is_tor,
      is_hosting,
      country,
      country_code,
      city,
      region,
      isp,
      asn,
      organization,
      timezone,
      latitude,
      longitude,
      abuse_score,
      blacklists,
      threat_types,
      scan_metadata,
    };
  } catch (error) {
    console.error("Error fetching IP info:", error);
    throw new Error("Failed to fetch IP reputation data");
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
    const url = new URL(req.url);
    const ip = url.searchParams.get("ip");

    if (!ip) {
      return new Response(
        JSON.stringify({ error: "IP address is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      return new Response(
        JSON.stringify({ error: "Invalid IP address format" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const result = await getIPInfo(ip);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in ip-score-lookup function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error"
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
