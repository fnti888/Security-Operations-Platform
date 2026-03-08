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

    const authHeader = req.headers.get('Authorization');
    let userId = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const ipAddress = req.headers.get('x-forwarded-for') ||
                      req.headers.get('x-real-ip') ||
                      'unknown';

    const userAgent = req.headers.get('user-agent') || 'unknown';

    const {
      action,
      resource_type,
      resource_id,
      changes,
      success,
    } = await req.json();

    if (!action || !resource_type) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'action and resource_type are required',
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

    const { data: auditLog } = await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        resource_type,
        resource_id: resource_id || null,
        changes: changes || {},
        ip_address: ipAddress,
        user_agent: userAgent,
        success: success !== false,
      })
      .select()
      .single();

    const sensitiveActions = [
      'delete_user',
      'change_permissions',
      'export_data',
      'configuration_change',
      'security_setting_change',
    ];

    if (sensitiveActions.includes(action)) {
      await supabase
        .from('security_logs')
        .insert({
          event_type: 'audit_critical_action',
          severity: 'warning',
          user_id: userId,
          description: `Critical action performed: ${action}`,
          metadata: {
            resource_type,
            resource_id,
            changes,
          },
          ip_address: ipAddress,
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        audit_log: auditLog,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error('Audit logging error:', error);
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
