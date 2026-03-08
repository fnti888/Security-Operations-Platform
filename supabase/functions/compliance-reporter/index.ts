import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FRAMEWORKS = {
  SOC2: {
    name: 'SOC 2',
    version: '2017',
    requirements: [
      { id: 'CC6.1', name: 'Logical and Physical Access Controls', category: 'Common Criteria' },
      { id: 'CC6.6', name: 'Vulnerability Management', category: 'Common Criteria' },
      { id: 'CC6.7', name: 'Threat Detection and Prevention', category: 'Common Criteria' },
      { id: 'CC7.2', name: 'System Monitoring', category: 'Common Criteria' },
      { id: 'CC8.1', name: 'Change Management', category: 'Common Criteria' },
    ],
  },
  ISO27001: {
    name: 'ISO 27001',
    version: '2022',
    requirements: [
      { id: 'A.8.8', name: 'Management of Technical Vulnerabilities', category: 'Technical' },
      { id: 'A.8.16', name: 'Monitoring Activities', category: 'Technical' },
      { id: 'A.5.24', name: 'Information Security Incident Management', category: 'Organizational' },
      { id: 'A.8.7', name: 'Protection Against Malware', category: 'Technical' },
      { id: 'A.5.28', name: 'Collection of Evidence', category: 'Organizational' },
    ],
  },
  'PCI-DSS': {
    name: 'PCI DSS',
    version: '4.0',
    requirements: [
      { id: '1.1', name: 'Network Security Controls', category: 'Network Security' },
      { id: '5.1', name: 'Malware Protection', category: 'Vulnerability Management' },
      { id: '6.1', name: 'Security Vulnerabilities', category: 'Vulnerability Management' },
      { id: '10.1', name: 'Logging and Monitoring', category: 'Monitoring' },
      { id: '11.1', name: 'Security Testing', category: 'Testing' },
    ],
  },
};

async function assessCompliance(framework: string, supabase: any): Promise<any[]> {
  const evidence = [];

  const { count: vulnerabilityCount } = await supabase
    .from('vulnerability_findings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open');

  const { count: criticalVulns } = await supabase
    .from('vulnerability_findings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open')
    .eq('severity', 'critical');

  const { count: incidentCount } = await supabase
    .from('incidents')
    .select('*', { count: 'exact', head: true })
    .in('status', ['open', 'investigating']);

  const { count: sslIssues } = await supabase
    .from('ssl_vulnerabilities')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open');

  const { count: auditLogCount } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const { data: recentScans } = await supabase
    .from('vulnerability_scans')
    .select('*')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  const frameworkData = FRAMEWORKS[framework as keyof typeof FRAMEWORKS];
  if (!frameworkData) {
    return [];
  }

  for (const req of frameworkData.requirements) {
    let status = 'partial';
    let score = 50;
    let evidenceData: any = {};

    if (req.id.includes('6.1') || req.id.includes('6.6') || req.id.includes('A.8.8')) {
      status = vulnerabilityCount === 0 ? 'compliant' : criticalVulns === 0 ? 'partial' : 'non_compliant';
      score = Math.max(0, 100 - (vulnerabilityCount || 0) * 2);
      evidenceData = {
        vulnerability_count: vulnerabilityCount,
        critical_vulnerabilities: criticalVulns,
        last_scan: recentScans?.[0]?.created_at || null,
      };
    } else if (req.id.includes('7.2') || req.id.includes('10.1') || req.id.includes('A.8.16')) {
      status = auditLogCount > 0 ? 'compliant' : 'non_compliant';
      score = auditLogCount > 100 ? 100 : 50;
      evidenceData = {
        audit_logs_24h: auditLogCount,
        monitoring_active: true,
      };
    } else if (req.id.includes('6.7') || req.id.includes('5.1') || req.id.includes('A.8.7')) {
      status = incidentCount === 0 ? 'compliant' : incidentCount < 5 ? 'partial' : 'non_compliant';
      score = Math.max(0, 100 - (incidentCount || 0) * 5);
      evidenceData = {
        open_incidents: incidentCount,
        threat_detection_enabled: true,
      };
    } else if (req.id.includes('1.1')) {
      const { count: networkScans } = await supabase
        .from('network_scans')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      status = networkScans > 0 ? 'compliant' : 'partial';
      score = networkScans > 0 ? 90 : 50;
      evidenceData = {
        network_scans_7d: networkScans,
        ssl_issues: sslIssues,
      };
    } else {
      status = 'partial';
      score = 65;
      evidenceData = {
        manual_review_required: true,
      };
    }

    evidence.push({
      requirement_id: req.id,
      evidence_type: req.category,
      evidence_data: evidenceData,
      status,
      score,
      next_collection: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return evidence;
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

    const { framework } = await req.json();

    if (!FRAMEWORKS[framework as keyof typeof FRAMEWORKS]) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid framework. Supported: SOC2, ISO27001, PCI-DSS',
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

    const { data: existingFramework } = await supabase
      .from('compliance_frameworks')
      .select('id')
      .eq('name', framework)
      .maybeSingle();

    let frameworkId = existingFramework?.id;

    if (!frameworkId) {
      const frameworkData = FRAMEWORKS[framework as keyof typeof FRAMEWORKS];
      const { data: newFramework } = await supabase
        .from('compliance_frameworks')
        .insert({
          name: framework,
          description: `${frameworkData.name} compliance framework`,
          version: frameworkData.version,
          requirements: frameworkData.requirements,
          enabled: true,
        })
        .select()
        .single();

      frameworkId = newFramework?.id;
    }

    const evidence = await assessCompliance(framework, supabase);

    for (const ev of evidence) {
      const { data: existing } = await supabase
        .from('compliance_evidence')
        .select('id')
        .eq('framework_id', frameworkId)
        .eq('requirement_id', ev.requirement_id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('compliance_evidence')
          .update({
            evidence_data: ev.evidence_data,
            status: ev.status,
            score: ev.score,
            collected_at: new Date().toISOString(),
            next_collection: ev.next_collection,
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('compliance_evidence')
          .insert({
            framework_id: frameworkId,
            requirement_id: ev.requirement_id,
            evidence_type: ev.evidence_type,
            evidence_data: ev.evidence_data,
            status: ev.status,
            score: ev.score,
            next_collection: ev.next_collection,
          });
      }
    }

    const overallScore = Math.round(evidence.reduce((sum, e) => sum + e.score, 0) / evidence.length);
    const compliantCount = evidence.filter(e => e.status === 'compliant').length;
    const nonCompliantCount = evidence.filter(e => e.status === 'non_compliant').length;

    return new Response(
      JSON.stringify({
        success: true,
        framework,
        framework_id: frameworkId,
        overall_score: overallScore,
        compliant_controls: compliantCount,
        non_compliant_controls: nonCompliantCount,
        partial_controls: evidence.length - compliantCount - nonCompliantCount,
        total_controls: evidence.length,
        evidence,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error('Compliance reporting error:', error);
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
