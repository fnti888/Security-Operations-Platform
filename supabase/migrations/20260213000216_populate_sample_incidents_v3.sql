/*
  # Populate Sample Security Incidents
  
  1. Purpose
    - Add sample incident data to demonstrate the incident management system
    - Provides realistic security incident examples for testing and demo purposes
    
  2. Sample Data
    - Creates 8 security incidents with varying severities and statuses
    - Incidents cover common security scenarios: malware, phishing, DDoS, data breach, etc.
    - Mix of statuses: open, investigating, resolved, closed
    - Realistic timestamps and descriptions
    
  3. Notes
    - Uses NULL for created_by field (system-generated sample data)
    - All incidents are visible to authenticated users per existing RLS policies
    - Data is idempotent - safe to run multiple times
*/

DO $$
BEGIN
  -- Insert sample incidents only if none exist
  IF NOT EXISTS (SELECT 1 FROM incidents LIMIT 1) THEN
    INSERT INTO incidents (title, description, severity, status, category, created_by, created_at, updated_at, resolved_at) VALUES
    (
      'Ransomware Detection on File Server',
      'Multiple files on the primary file server have been encrypted with a .locked extension. Preliminary analysis indicates Ryuk ransomware variant. Immediate containment actions have been initiated.',
      'critical',
      'investigating',
      'Malware',
      NULL::uuid,
      now() - interval '2 hours',
      now() - interval '30 minutes',
      NULL
    ),
    (
      'Phishing Campaign Targeting Executives',
      'Detected coordinated phishing emails impersonating IT support requesting password resets. 15 executives received similar emails. Security awareness team notified.',
      'high',
      'open',
      'Phishing',
      NULL::uuid,
      now() - interval '5 hours',
      now() - interval '5 hours',
      NULL
    ),
    (
      'DDoS Attack on Web Infrastructure',
      'Significant traffic spike detected from multiple IP addresses. Web services experiencing degraded performance. CDN mitigation activated.',
      'high',
      'investigating',
      'DDoS',
      NULL::uuid,
      now() - interval '1 day',
      now() - interval '12 hours',
      NULL
    ),
    (
      'Unauthorized Access Attempt - Admin Portal',
      'Multiple failed login attempts detected on admin portal from IP 185.220.101.47. Brute force protection triggered. Source IP has been blocked.',
      'medium',
      'resolved',
      'Unauthorized Access',
      NULL::uuid,
      now() - interval '3 days',
      now() - interval '2 days',
      now() - interval '2 days'
    ),
    (
      'Suspicious Data Exfiltration Activity',
      'Unusual outbound data transfer detected from database server to unknown external IP. Investigation in progress to determine scope and impact.',
      'critical',
      'investigating',
      'Data Breach',
      NULL::uuid,
      now() - interval '6 hours',
      now() - interval '1 hour',
      NULL
    ),
    (
      'Malicious Chrome Extension Detected',
      'Employee workstation found running unauthorized browser extension with keylogging capabilities. Extension removed, credentials rotated.',
      'medium',
      'resolved',
      'Malware',
      NULL::uuid,
      now() - interval '5 days',
      now() - interval '4 days',
      now() - interval '4 days'
    ),
    (
      'SQL Injection Attempt on API Endpoint',
      'WAF detected and blocked SQL injection attempts on /api/v1/users endpoint. Attack vectors included UNION-based and blind SQL injection techniques.',
      'high',
      'closed',
      'Web Attack',
      NULL::uuid,
      now() - interval '7 days',
      now() - interval '6 days',
      now() - interval '6 days'
    ),
    (
      'Insider Threat - Unusual File Access',
      'Employee accessed 500+ confidential files outside normal work hours. Pattern inconsistent with job role. HR and legal teams notified.',
      'high',
      'investigating',
      'Insider Threat',
      NULL::uuid,
      now() - interval '8 hours',
      now() - interval '2 hours',
      NULL
    );
  END IF;
END $$;
