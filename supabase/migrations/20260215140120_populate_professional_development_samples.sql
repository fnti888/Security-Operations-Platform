/*
  # Populate Sample Professional Development Data

  1. Sample Data Added
    - Portfolio entries showcasing real security analysis examples
    - Incident response playbooks for common scenarios
    - Skills tracker entries demonstrating continuous learning
    - Security queries library with real detection examples

  2. Purpose
    - Demonstrates how to use these features effectively
    - Provides templates that can be customized
    - Shows best practices for documenting security investigations

  Note: This uses admin user's ID. Update user_id after running if needed.
*/

DO $$
DECLARE
  sample_user_id uuid;
BEGIN
  -- Get the first admin user
  SELECT id INTO sample_user_id FROM auth.users LIMIT 1;

  -- Only insert if we have a user
  IF sample_user_id IS NOT NULL THEN
    
    -- Sample Portfolio Entry: PCAP Analysis
    INSERT INTO portfolio_entries (user_id, title, entry_type, description, findings, tools_used, mitre_techniques, severity, evidence_links, is_public, tags)
    VALUES (
      sample_user_id,
      'Emotet Malware Traffic Analysis - PCAP Investigation',
      'pcap_analysis',
      'Analyzed network traffic from a compromised Windows workstation exhibiting signs of Emotet malware infection. Investigation focused on identifying C2 communications, malicious domains, and infection vectors.',
      E'FINDINGS:\n\n1. INITIAL INFECTION VECTOR:\n   - Phishing email with malicious macro-enabled Word document\n   - Document contacted: hxxp://malicious-domain[.]com/dl/payload.exe\n   - User-Agent indicates Microsoft Office making HTTP request\n\n2. COMMAND & CONTROL TRAFFIC:\n   - Identified 3 C2 IP addresses: 192.0.2.45, 198.51.100.89, 203.0.113.15\n   - HTTP POST requests to /api/bot.php every 60 seconds\n   - Encrypted payload in HTTP body (base64 encoded)\n\n3. LATERAL MOVEMENT ATTEMPTS:\n   - SMB scanning on internal subnet 10.0.1.0/24\n   - Multiple failed authentication attempts to domain controller\n   - Port 445 connections to 15 internal hosts\n\n4. DATA EXFILTRATION:\n   - Large HTTPS upload to pastebin-like service (15.2 MB)\n   - DNS queries for suspicious domains with DGA pattern\n\n5. INDICATORS OF COMPROMISE:\n   - Malicious IP: 192.0.2.45, 198.51.100.89\n   - Malicious Domain: delivery-notification-update[.]com\n   - File Hash (SHA256): a3c8f9e2d1b4c7a6e5f8d2b1a9c4e7f3...\n\nRECOMMENDATIONS:\n- Isolate affected workstation immediately\n- Block identified C2 IPs at firewall\n- Run full EDR scan on all systems in subnet\n- Force password reset for affected user\n- Review email gateway logs for similar phishing attempts',
      ARRAY['Wireshark', 'NetworkMiner', 'Snort', 'tcpdump'],
      ARRAY['T1566.001', 'T1071.001', 'T1041', 'T1021.002'],
      'critical',
      ARRAY['https://github.com/yourusername/pcap-analysis-emotet', 'https://malware-traffic-analysis.net/2023/01/15/index.html'],
      true,
      ARRAY['emotet', 'malware', 'pcap-analysis', 'c2-traffic', 'network-forensics']
    )
    ON CONFLICT DO NOTHING;

    -- Sample Portfolio Entry: Log Analysis
    INSERT INTO portfolio_entries (user_id, title, entry_type, description, findings, tools_used, mitre_techniques, severity, evidence_links, is_public, tags)
    VALUES (
      sample_user_id,
      'Brute Force Attack Detection - Splunk Investigation',
      'log_analysis',
      'Investigated suspicious authentication failures across multiple web applications. Created Splunk queries to identify brute force attempts and credential stuffing attacks.',
      E'ANALYSIS:\n\n1. ATTACK PATTERN:\n   - 15,000+ failed login attempts over 2-hour window\n   - Targeted 3 user accounts: admin, administrator, root\n   - Originating from 47 unique IP addresses (botnet)\n   - User-Agent rotation indicating automated tool\n\n2. SPLUNK QUERY DEVELOPED:\n   index=web_logs action=login status=failed\n   | stats count by src_ip, username, _time span=5m\n   | where count > 10\n   | table _time, src_ip, username, count\n\n3. AFFECTED SYSTEMS:\n   - Corporate VPN portal\n   - Admin dashboard (admin.company.com)\n   - Customer portal\n\n4. ATTACKER INFRASTRUCTURE:\n   - Primary IPs geolocated to Eastern Europe\n   - TOR exit nodes identified\n   - VPN/Proxy services detected\n\nACTIONS TAKEN:\n- Implemented rate limiting (5 attempts per 5 minutes)\n- Added CAPTCHA after 3 failed attempts\n- Blocked identified malicious IPs\n- Enabled MFA for admin accounts\n- Created automated alert for similar patterns',
      ARRAY['Splunk', 'Python', 'MaxMind GeoIP'],
      ARRAY['T1110.001', 'T1110.003', 'T1078'],
      'high',
      ARRAY['https://github.com/yourusername/splunk-brute-force-detection'],
      true,
      ARRAY['brute-force', 'log-analysis', 'splunk', 'authentication', 'detection']
    )
    ON CONFLICT DO NOTHING;

    -- Sample Skills: Wireshark
    INSERT INTO skills_tracker (user_id, skill_category, skill_name, proficiency_level, status, date_started, date_completed, hours_invested, notes)
    VALUES (
      sample_user_id,
      'tool_proficiency',
      'Wireshark - Packet Analysis',
      'advanced',
      'practicing',
      '2024-01-15',
      NULL,
      120,
      'Advanced packet analysis including protocol dissection, filter creation, and network forensics. Completed 25+ PCAP analysis exercises from malware-traffic-analysis.net. Can identify C2 traffic, data exfiltration, and attack patterns.'
    )
    ON CONFLICT DO NOTHING;

    -- Sample Skills: CySA+
    INSERT INTO skills_tracker (user_id, skill_category, skill_name, proficiency_level, status, date_started, date_completed, hours_invested, proof_url, notes)
    VALUES (
      sample_user_id,
      'certification',
      'CompTIA CySA+ (Cybersecurity Analyst)',
      'advanced',
      'learning',
      '2024-02-01',
      NULL,
      80,
      'https://www.comptia.org/certifications/cybersecurity-analyst',
      'Studying for CySA+ certification. Completed 60% of study material covering threat detection, vulnerability management, incident response, and security operations. Scheduled exam for end of month.'
    )
    ON CONFLICT DO NOTHING;

    -- Sample Skills: Splunk
    INSERT INTO skills_tracker (user_id, skill_category, skill_name, proficiency_level, status, date_started, date_completed, hours_invested, notes)
    VALUES (
      sample_user_id,
      'tool_proficiency',
      'Splunk SIEM',
      'intermediate',
      'learning',
      '2024-01-20',
      NULL,
      45,
      'Learning Splunk Search Processing Language (SPL). Created 30+ detection queries for common attack patterns. Completed Splunk Fundamentals 1 & 2 courses. Working through Boss of the SOC (BOTS) dataset challenges.'
    )
    ON CONFLICT DO NOTHING;

    -- Sample Skills: TryHackMe
    INSERT INTO skills_tracker (user_id, skill_category, skill_name, proficiency_level, status, date_started, date_completed, hours_invested, proof_url, notes)
    VALUES (
      sample_user_id,
      'hands_on_lab',
      'TryHackMe - SOC Level 1 Path',
      'intermediate',
      'completed',
      '2023-11-01',
      '2024-01-30',
      85,
      'https://tryhackme.com/path/outline/soclevel1',
      'Completed all modules in SOC Level 1 learning path. Covered network security monitoring, SIEM operations, phishing analysis, and incident response. Earned multiple badges and certificates.'
    )
    ON CONFLICT DO NOTHING;

    -- Sample Security Query: Splunk - PowerShell Encoded Command
    INSERT INTO security_queries (user_id, query_name, platform, query_text, description, use_case, mitre_technique, severity, tags, is_tested)
    VALUES (
      sample_user_id,
      'Detect Encoded PowerShell Commands',
      'splunk',
      E'index=windows sourcetype=WinEventLog:Security EventCode=4688\n| search CommandLine="*-EncodedCommand*" OR CommandLine="*-enc*"\n| table _time, Computer, User, CommandLine, ParentProcessName\n| sort - _time',
      'Detects execution of PowerShell with encoded commands, often used by attackers to obfuscate malicious scripts',
      'Identifies potential malware execution, living-off-the-land attacks, and script-based threats that use PowerShell encoding to evade detection',
      'T1059.001',
      'high',
      ARRAY['powershell', 'evasion', 'malware', 'windows'],
      true
    )
    ON CONFLICT DO NOTHING;

    -- Sample Security Query: Suricata - DNS Tunneling
    INSERT INTO security_queries (user_id, query_name, platform, query_text, description, use_case, mitre_technique, severity, tags, is_tested)
    VALUES (
      sample_user_id,
      'DNS Tunneling Detection',
      'suricata',
      E'alert dns any any -> any any (msg:"Possible DNS Tunneling - Excessive Subdomain Length"; dns_query; content:"."; pcre:"/^[a-zA-Z0-9]{50,}/"; threshold:type both, track by_src, count 10, seconds 60; classtype:policy-violation; sid:1000001; rev:1;)',
      'Detects potential DNS tunneling through unusually long subdomain queries that may indicate data exfiltration or C2 communications',
      'Identifies covert channels using DNS for command and control or data exfiltration, common in advanced persistent threats',
      'T1071.004',
      'critical',
      ARRAY['dns', 'exfiltration', 'c2', 'tunneling'],
      true
    )
    ON CONFLICT DO NOTHING;

  END IF;
END $$;
