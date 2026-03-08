import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ScanRequest {
  scanName: string;
  targetHost: string;
  targetPort?: number;
}

const calculateGrade = (certScore: number, protocolScore: number, cipherScore: number): string => {
  const avgScore = (certScore + protocolScore + cipherScore) / 3;
  if (avgScore >= 95) return 'A+';
  if (avgScore >= 90) return 'A';
  if (avgScore >= 80) return 'B';
  if (avgScore >= 70) return 'C';
  if (avgScore >= 60) return 'D';
  return 'F';
};

const generateMockCertificate = (host: string, port: number) => {
  const now = new Date();
  const validFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const validTo = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const daysUntilExpiry = Math.floor((validTo.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  const certTypes = [
    { subject: `CN=${host}`, issuer: "Let's Encrypt Authority X3", selfSigned: false, keySize: 2048, keyType: 'RSA' },
    { subject: `CN=${host}`, issuer: "DigiCert SHA2 Secure Server CA", selfSigned: false, keySize: 2048, keyType: 'RSA' },
    { subject: `CN=*.${host}`, issuer: "Cloudflare Inc ECC CA-3", selfSigned: false, keySize: 256, keyType: 'ECDSA' },
    { subject: `CN=${host}`, issuer: `CN=${host}`, selfSigned: true, keySize: 2048, keyType: 'RSA' },
  ];

  const certType = certTypes[Math.floor(Math.random() * certTypes.length)];

  return {
    subject: certType.subject,
    issuer: certType.issuer,
    serial_number: Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join(':'),
    valid_from: validFrom.toISOString(),
    valid_to: validTo.toISOString(),
    days_until_expiry: daysUntilExpiry,
    is_expired: daysUntilExpiry < 0,
    is_self_signed: certType.selfSigned,
    is_wildcard: certType.subject.includes('*'),
    signature_algorithm: 'SHA256withRSA',
    key_type: certType.keyType,
    key_size: certType.keySize,
    san_entries: [`DNS:${host}`, `DNS:www.${host}`],
    chain_length: certType.selfSigned ? 1 : 3,
    chain_issues: certType.selfSigned ? ['Self-signed certificate'] : [],
  };
};

const generateProtocolsAndCiphers = (host: string, port: number) => {
  const protocols = [
    { version: 'SSLv3', enabled: Math.random() < 0.1, deprecated: true },
    { version: 'TLS1.0', enabled: Math.random() < 0.3, deprecated: true },
    { version: 'TLS1.1', enabled: Math.random() < 0.4, deprecated: true },
    { version: 'TLS1.2', enabled: true, deprecated: false },
    { version: 'TLS1.3', enabled: Math.random() < 0.7, deprecated: false },
  ];

  const ciphers = [
    { name: 'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384', weak: false, keyEx: 'ECDHE', auth: 'RSA', enc: 'AES-256-GCM', bits: 256, mac: 'SHA384', vulns: [] },
    { name: 'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256', weak: false, keyEx: 'ECDHE', auth: 'RSA', enc: 'AES-128-GCM', bits: 128, mac: 'SHA256', vulns: [] },
    { name: 'TLS_AES_256_GCM_SHA384', weak: false, keyEx: 'ECDHE', auth: 'ECDSA', enc: 'AES-256-GCM', bits: 256, mac: 'SHA384', vulns: [] },
    { name: 'TLS_RSA_WITH_AES_256_CBC_SHA', weak: true, keyEx: 'RSA', auth: 'RSA', enc: 'AES-256-CBC', bits: 256, mac: 'SHA1', vulns: ['BEAST'] },
    { name: 'TLS_RSA_WITH_3DES_EDE_CBC_SHA', weak: true, keyEx: 'RSA', auth: 'RSA', enc: '3DES-CBC', bits: 112, mac: 'SHA1', vulns: ['SWEET32'] },
    { name: 'TLS_RSA_WITH_RC4_128_SHA', weak: true, keyEx: 'RSA', auth: 'RSA', enc: 'RC4', bits: 128, mac: 'SHA1', vulns: ['RC4'] },
  ];

  const enabledCiphers = ciphers.filter(() => Math.random() < 0.6);

  return { protocols, ciphers: enabledCiphers };
};

const analyzeSecurityIssues = (cert: any, protocols: any[], ciphers: any[]) => {
  const issues: any[] = [];

  if (cert.is_expired) {
    issues.push({
      vulnerability_type: 'expired_cert',
      title: 'Certificate Expired',
      description: 'The SSL/TLS certificate has expired and is no longer valid',
      severity: 'critical',
      remediation: 'Renew the SSL/TLS certificate immediately',
      cve_ids: [],
    });
  }

  if (cert.days_until_expiry > 0 && cert.days_until_expiry < 30) {
    issues.push({
      vulnerability_type: 'expired_cert',
      title: 'Certificate Expiring Soon',
      description: `Certificate will expire in ${cert.days_until_expiry} days`,
      severity: 'medium',
      remediation: 'Plan certificate renewal before expiration',
      cve_ids: [],
    });
  }

  if (cert.is_self_signed) {
    issues.push({
      vulnerability_type: 'chain_issue',
      title: 'Self-Signed Certificate',
      description: 'Certificate is self-signed and not trusted by browsers',
      severity: 'high',
      remediation: 'Obtain a certificate from a trusted Certificate Authority',
      cve_ids: [],
    });
  }

  if (cert.key_size < 2048 && cert.key_type === 'RSA') {
    issues.push({
      vulnerability_type: 'configuration',
      title: 'Weak Key Size',
      description: `RSA key size of ${cert.key_size} bits is considered weak`,
      severity: 'high',
      remediation: 'Use at least 2048-bit RSA keys or 256-bit ECC keys',
      cve_ids: [],
    });
  }

  protocols.forEach(proto => {
    if (proto.enabled && proto.deprecated) {
      issues.push({
        vulnerability_type: 'deprecated_protocol',
        title: `Deprecated Protocol: ${proto.version}`,
        description: `${proto.version} is deprecated and has known security vulnerabilities`,
        severity: proto.version === 'SSLv3' ? 'critical' : 'high',
        remediation: `Disable ${proto.version} and use only TLS 1.2 or higher`,
        cve_ids: proto.version === 'SSLv3' ? ['CVE-2014-3566'] : [],
      });
    }
  });

  ciphers.forEach(cipher => {
    if (cipher.weak) {
      issues.push({
        vulnerability_type: 'weak_cipher',
        title: `Weak Cipher Suite: ${cipher.name}`,
        description: `This cipher suite is considered weak or insecure. Vulnerabilities: ${cipher.vulns.join(', ')}`,
        severity: cipher.vulns.includes('RC4') ? 'high' : 'medium',
        remediation: 'Disable weak cipher suites and use only modern, strong algorithms',
        cve_ids: [],
      });
    }
  });

  const hasForwardSecrecy = ciphers.some(c => c.keyEx === 'ECDHE');
  if (!hasForwardSecrecy) {
    issues.push({
      vulnerability_type: 'configuration',
      title: 'No Forward Secrecy',
      description: 'Server does not support Forward Secrecy (Perfect Forward Secrecy)',
      severity: 'medium',
      remediation: 'Enable cipher suites with ECDHE key exchange',
      cve_ids: [],
    });
  }

  return issues;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    if (req.method === "POST") {
      const { scanName, targetHost, targetPort = 443 }: ScanRequest = await req.json();

      const scanId = crypto.randomUUID();
      const now = new Date().toISOString();

      const { error: scanError } = await supabase
        .from("ssl_scans")
        .insert({
          id: scanId,
          user_id: user.id,
          scan_name: scanName,
          target_host: targetHost,
          target_port: targetPort,
          status: "scanning",
          started_at: now,
        });

      if (scanError) throw scanError;

      const cert = generateMockCertificate(targetHost, targetPort);
      const { protocols, ciphers } = generateProtocolsAndCiphers(targetHost, targetPort);
      const vulnerabilities = analyzeSecurityIssues(cert, protocols, ciphers);

      const { error: certError } = await supabase
        .from("ssl_certificates")
        .insert({
          scan_id: scanId,
          user_id: user.id,
          host: targetHost,
          port: targetPort,
          ...cert,
        });

      if (certError) throw certError;

      const protocolRecords = protocols.map(p => ({
        scan_id: scanId,
        user_id: user.id,
        host: targetHost,
        port: targetPort,
        protocol_version: p.version,
        protocol_enabled: p.enabled,
        is_deprecated: p.deprecated,
      }));

      const cipherRecords = ciphers.map(c => ({
        scan_id: scanId,
        user_id: user.id,
        host: targetHost,
        port: targetPort,
        protocol_version: 'TLS1.2',
        protocol_enabled: true,
        cipher_suite: c.name,
        key_exchange: c.keyEx,
        authentication: c.auth,
        encryption: c.enc,
        encryption_bits: c.bits,
        mac_algorithm: c.mac,
        is_weak: c.weak,
        is_deprecated: c.weak,
        vulnerability_names: c.vulns,
      }));

      if (protocolRecords.length > 0) {
        await supabase.from("ssl_cipher_suites").insert(protocolRecords);
      }

      if (cipherRecords.length > 0) {
        await supabase.from("ssl_cipher_suites").insert(cipherRecords);
      }

      if (vulnerabilities.length > 0) {
        const vulnRecords = vulnerabilities.map(v => ({
          scan_id: scanId,
          user_id: user.id,
          host: targetHost,
          port: targetPort,
          ...v,
        }));
        await supabase.from("ssl_vulnerabilities").insert(vulnRecords);
      }

      let certScore = 100;
      if (cert.is_expired) certScore -= 50;
      if (cert.is_self_signed) certScore -= 30;
      if (cert.key_size < 2048) certScore -= 20;
      certScore = Math.max(0, certScore);

      let protocolScore = 100;
      if (protocols.find(p => p.version === 'SSLv3' && p.enabled)) protocolScore -= 40;
      if (protocols.find(p => p.version === 'TLS1.0' && p.enabled)) protocolScore -= 20;
      if (protocols.find(p => p.version === 'TLS1.1' && p.enabled)) protocolScore -= 10;
      if (!protocols.find(p => p.version === 'TLS1.3' && p.enabled)) protocolScore -= 10;
      protocolScore = Math.max(0, protocolScore);

      let cipherScore = 100;
      const weakCiphers = ciphers.filter(c => c.weak).length;
      cipherScore -= weakCiphers * 15;
      cipherScore = Math.max(0, cipherScore);

      const hasForwardSecrecy = ciphers.some(c => c.keyEx === 'ECDHE');
      const supportsTLS13 = protocols.some(p => p.version === 'TLS1.3' && p.enabled);
      const vulnerableToDowngrade = protocols.some(p => p.deprecated && p.enabled);

      const overallGrade = calculateGrade(certScore, protocolScore, cipherScore);

      await supabase.from("ssl_grade_scores").insert({
        scan_id: scanId,
        user_id: user.id,
        host: targetHost,
        port: targetPort,
        overall_grade: overallGrade,
        certificate_score: certScore,
        protocol_score: protocolScore,
        cipher_score: cipherScore,
        key_exchange_score: hasForwardSecrecy ? 100 : 50,
        has_forward_secrecy: hasForwardSecrecy,
        supports_tls13: supportsTLS13,
        vulnerable_to_downgrade: vulnerableToDowngrade,
      });

      await supabase
        .from("ssl_scans")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", scanId);

      return new Response(
        JSON.stringify({
          success: true,
          scanId,
          grade: overallGrade,
          vulnerabilitiesFound: vulnerabilities.length,
          certificateScore: certScore,
          protocolScore: protocolScore,
          cipherScore: cipherScore,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "GET") {
      const url = new URL(req.url);
      const scanId = url.searchParams.get("scanId");

      if (scanId) {
        const { data: scan, error: scanError } = await supabase
          .from("ssl_scans")
          .select("*")
          .eq("id", scanId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (scanError) throw scanError;

        const { data: certificate } = await supabase
          .from("ssl_certificates")
          .select("*")
          .eq("scan_id", scanId)
          .maybeSingle();

        const { data: ciphers } = await supabase
          .from("ssl_cipher_suites")
          .select("*")
          .eq("scan_id", scanId);

        const { data: vulnerabilities } = await supabase
          .from("ssl_vulnerabilities")
          .select("*")
          .eq("scan_id", scanId)
          .order("severity", { ascending: true });

        const { data: gradeScore } = await supabase
          .from("ssl_grade_scores")
          .select("*")
          .eq("scan_id", scanId)
          .maybeSingle();

        return new Response(
          JSON.stringify({ scan, certificate, ciphers, vulnerabilities, gradeScore }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: scans, error: scansError } = await supabase
        .from("ssl_scans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (scansError) throw scansError;

      return new Response(
        JSON.stringify({ scans }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
