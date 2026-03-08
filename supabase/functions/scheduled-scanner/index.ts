import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function startVulnerabilityScan(supabase: any, targets: string[]): Promise<any> {
  const scanPromises = targets.map(async (target) => {
    const { data: scan } = await supabase
      .from('vulnerability_scans')
      .insert({
        scan_name: `Scheduled Scan - ${target}`,
        target_type: 'single_host',
        target_value: target,
        status: 'queued',
      })
      .select()
      .single();

    if (scan) {
      const scanResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/vulnerability-scanner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          target: target,
          scan_id: scan.id,
        }),
      });

      return await scanResponse.json();
    }

    return null;
  });

  return await Promise.all(scanPromises);
}

async function startSSLScan(supabase: any, targets: string[]): Promise<any> {
  const scanPromises = targets.map(async (target) => {
    const { data: scan } = await supabase
      .from('ssl_scans')
      .insert({
        scan_name: `Scheduled SSL Scan - ${target}`,
        target_host: target,
        target_port: 443,
        status: 'queued',
      })
      .select()
      .single();

    if (scan) {
      const scanResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ssl-tls-analyzer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          host: target,
          port: 443,
          scan_id: scan.id,
        }),
      });

      return await scanResponse.json();
    }

    return null;
  });

  return await Promise.all(scanPromises);
}

async function startNetworkScan(supabase: any, targets: string[]): Promise<any> {
  const scanPromises = targets.map(async (target) => {
    const { data: scan } = await supabase
      .from('network_scans')
      .insert({
        target: target,
        scan_type: 'full_scan',
        status: 'pending',
      })
      .select()
      .single();

    if (scan) {
      const scanResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/network-scanner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          target: target,
          scanType: 'full_scan',
          scanId: scan.id,
        }),
      });

      return await scanResponse.json();
    }

    return null;
  });

  return await Promise.all(scanPromises);
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

    const { scan_type, targets } = await req.json();

    if (!targets || targets.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No targets provided',
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

    let results;

    switch (scan_type) {
      case 'vulnerability':
        results = await startVulnerabilityScan(supabase, targets);
        break;

      case 'ssl':
        results = await startSSLScan(supabase, targets);
        break;

      case 'network':
        results = await startNetworkScan(supabase, targets);
        break;

      case 'all':
        const vulnResults = await startVulnerabilityScan(supabase, targets);
        const sslResults = await startSSLScan(supabase, targets);
        const networkResults = await startNetworkScan(supabase, targets);
        results = {
          vulnerability: vulnResults,
          ssl: sslResults,
          network: networkResults,
        };
        break;

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid scan type. Supported: vulnerability, ssl, network, all',
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

    await supabase
      .from('audit_logs')
      .insert({
        action: 'scheduled_scan_started',
        resource_type: 'scan',
        resource_id: scan_type,
        changes: {
          scan_type,
          targets,
          results,
        },
        success: true,
      });

    return new Response(
      JSON.stringify({
        success: true,
        scan_type,
        targets_scanned: targets.length,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error('Scheduled scanner error:', error);
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
