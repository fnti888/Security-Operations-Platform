import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function syncToSplunk(config: any, event: any): Promise<any> {
  const url = `${config.url}/services/collector/event`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Splunk ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event: event,
      sourcetype: config.sourcetype || 'soc_platform',
    }),
  });

  return await response.json();
}

async function syncToElastic(config: any, event: any): Promise<any> {
  const url = `${config.url}/${config.index}/_doc`;

  const auth = btoa(`${config.username}:${config.password}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  return await response.json();
}

async function syncToJira(config: any, event: any): Promise<any> {
  const url = `${config.url}/rest/api/3/issue`;

  const auth = btoa(`${config.email}:${config.api_token}`);

  const issue = {
    fields: {
      project: { key: config.project_key },
      summary: event.title || event.name || 'Security Event',
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: event.description || JSON.stringify(event),
              },
            ],
          },
        ],
      },
      issuetype: { name: config.issue_type || 'Task' },
      priority: { name: event.severity === 'critical' ? 'Highest' : event.severity === 'high' ? 'High' : 'Medium' },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(issue),
  });

  return await response.json();
}

async function syncToSlack(config: any, event: any): Promise<any> {
  const url = config.webhook_url;

  const color = event.severity === 'critical' ? 'danger' :
                event.severity === 'high' ? 'warning' :
                'good';

  const message = {
    attachments: [
      {
        color: color,
        title: event.title || event.name || 'Security Event',
        text: event.description || JSON.stringify(event, null, 2),
        fields: [
          {
            title: 'Severity',
            value: event.severity || 'unknown',
            short: true,
          },
          {
            title: 'Status',
            value: event.status || 'new',
            short: true,
          },
        ],
        footer: 'SOC Platform',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  return { status: response.status, ok: response.ok };
}

async function syncToWebhook(config: any, event: any): Promise<any> {
  const response = await fetch(config.url, {
    method: config.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.headers || {}),
    },
    body: JSON.stringify(event),
  });

  return await response.json();
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

    const { integration_id, event_type, payload } = await req.json();

    const { data: integration } = await supabase
      .from('external_integrations')
      .select('*')
      .eq('id', integration_id)
      .eq('enabled', true)
      .maybeSingle();

    if (!integration) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Integration not found or disabled',
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

    let syncResult;
    let status = 'success';
    let response: any = {};

    try {
      switch (integration.integration_type) {
        case 'siem':
          if (integration.configuration.platform === 'splunk') {
            syncResult = await syncToSplunk(integration.configuration, payload);
          } else if (integration.configuration.platform === 'elastic') {
            syncResult = await syncToElastic(integration.configuration, payload);
          }
          break;

        case 'ticketing':
          if (integration.configuration.platform === 'jira') {
            syncResult = await syncToJira(integration.configuration, payload);
          }
          break;

        case 'chat':
          if (integration.configuration.platform === 'slack') {
            syncResult = await syncToSlack(integration.configuration, payload);
          }
          break;

        case 'webhook':
          syncResult = await syncToWebhook(integration.configuration, payload);
          break;

        default:
          throw new Error(`Unsupported integration type: ${integration.integration_type}`);
      }

      response = syncResult;
    } catch (error: any) {
      status = 'failed';
      response = { error: error.message };
    }

    await supabase
      .from('integration_events')
      .insert({
        integration_id: integration.id,
        event_type,
        payload,
        status,
        response,
      });

    await supabase
      .from('external_integrations')
      .update({
        last_sync: new Date().toISOString(),
      })
      .eq('id', integration.id);

    return new Response(
      JSON.stringify({
        success: status === 'success',
        integration: integration.name,
        status,
        response,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error('Integration sync error:', error);
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
