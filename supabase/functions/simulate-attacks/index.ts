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

    // Weighted country selection based on threat intelligence
    // Higher risk countries appear more frequently in attacks
    const countryWeights = [
      { code: 'CN', weight: 35 },  // 35% - Highest threat
      { code: 'RU', weight: 32 },  // 32% - Very high threat
      { code: 'KP', weight: 28 },  // 28% - High threat
      { code: 'IR', weight: 24 },  // 24% - High threat
      { code: 'US', weight: 18 },  // 18% - Elevated threat
      { code: 'BR', weight: 15 },  // 15% - Moderate threat
      { code: 'IN', weight: 12 },  // 12% - Lower threat
      { code: 'VN', weight: 10 },  // 10% - Lowest threat
    ];

    // Country-specific attack types based on real threat intelligence
    const countryAttackProfiles: Record<string, { types: string[], severities: string[] }> = {
      'CN': {
        types: ['APT Intrusion', 'Zero-Day Exploit', 'Supply Chain Attack', 'Espionage Campaign', 'Advanced Malware'],
        severities: ['HIGH', 'CRITICAL']
      },
      'RU': {
        types: ['Ransomware', 'DDoS Attack', 'Infrastructure Attack', 'Credential Theft', 'Wiper Malware'],
        severities: ['HIGH', 'CRITICAL']
      },
      'KP': {
        types: ['Banking Trojan', 'Cryptocurrency Theft', 'Spear Phishing', 'Watering Hole', 'APT Campaign'],
        severities: ['HIGH', 'CRITICAL']
      },
      'IR': {
        types: ['Wiper Attack', 'DDoS Attempt', 'Defacement', 'Infrastructure Attack', 'Destructive Malware'],
        severities: ['MEDIUM', 'HIGH', 'CRITICAL']
      },
      'US': {
        types: ['Ransomware', 'Phishing', 'SQL Injection', 'XSS Attack', 'Brute Force'],
        severities: ['LOW', 'MEDIUM', 'HIGH']
      },
      'BR': {
        types: ['Banking Trojan', 'Phishing', 'Credit Card Theft', 'Financial Fraud', 'SMS Fraud'],
        severities: ['LOW', 'MEDIUM', 'HIGH']
      },
      'IN': {
        types: ['SQL Injection', 'XSS Attack', 'Brute Force', 'Port Scan', 'Web Scraping'],
        severities: ['LOW', 'MEDIUM']
      },
      'VN': {
        types: ['Port Scan', 'Brute Force', 'Web Crawling', 'Bot Activity', 'Password Spray'],
        severities: ['LOW', 'MEDIUM']
      }
    };

    const categories = ['Network', 'Application', 'Authentication', 'Data Access', 'System'];
    const usernames = ['admin', 'root', 'user123', 'guest', 'system', 'dbadmin', 'webuser'];

    // Weighted random country selection
    const totalWeight = countryWeights.reduce((sum, c) => sum + c.weight, 0);
    let random = Math.random() * totalWeight;
    let randomCountry = 'CN';

    for (const country of countryWeights) {
      random -= country.weight;
      if (random <= 0) {
        randomCountry = country.code;
        break;
      }
    }

    // Select attack type and severity based on country profile
    const profile = countryAttackProfiles[randomCountry];
    const randomType = profile.types[Math.floor(Math.random() * profile.types.length)];
    const randomSeverity = profile.severities[Math.floor(Math.random() * profile.severities.length)];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const randomUsername = usernames[Math.floor(Math.random() * usernames.length)];

    // Generate realistic IPs
    const randomSourceIP = `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    const randomDestIP = `10.0.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;

    // Insert into live_attacks table
    const { data: attackData, error: attackError } = await supabase
      .from('live_attacks')
      .insert({
        country_code: randomCountry,
        attack_type: randomType,
        severity: randomSeverity,
        blocked: true,
      })
      .select()
      .single();

    if (attackError) {
      throw attackError;
    }

    // Insert into live_events table for the UI
    const { data: eventData, error: eventError } = await supabase
      .from('live_events')
      .insert({
        event_category: randomCategory,
        event_name: randomType,
        severity: randomSeverity,
        description: `${randomType} detected from ${randomCountry} targeting ${randomDestIP}`,
        metadata: {
          country: randomCountry,
          attack_type: randomType,
          blocked: true,
          user_agent: 'Mozilla/5.0 (compatible; AttackBot/1.0)',
          request_method: Math.random() > 0.5 ? 'POST' : 'GET',
          port: Math.floor(Math.random() * 65535),
          protocol: Math.random() > 0.5 ? 'TCP' : 'UDP',
        },
        source_ip: randomSourceIP,
        destination_ip: randomDestIP,
        username: Math.random() > 0.3 ? randomUsername : null,
        automated: true,
      })
      .select()
      .single();

    if (eventError) {
      throw eventError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        attack: attackData,
        event: eventData
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in simulate-attacks:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorStack,
        timestamp: new Date().toISOString()
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
