/*
  # Update Sample Incidents with MITRE ATT&CK Data

  1. Purpose
    - Add MITRE ATT&CK mappings to existing sample incidents
    - Ensures demo data has complete threat intelligence information
    
  2. Updates
    - Updates each sample incident with appropriate MITRE tactic, technique, and recommendations
    - Maps based on incident category and type
    - Sets "Unknown" for incidents without clear MITRE mappings
    
  3. Notes
    - Only updates incidents that don't already have MITRE data
    - Idempotent - safe to run multiple times
*/

-- Update Ransomware incident (Malware) - set to Unknown as generic malware
UPDATE incidents 
SET 
  mitre_tactic = 'Unknown',
  mitre_technique_id = 'Unknown',
  mitre_technique_name = 'Unknown',
  mitre_description = 'Unknown',
  recommended_action = 'Unknown'
WHERE title = 'Ransomware Detection on File Server' 
  AND (mitre_tactic IS NULL OR mitre_tactic = 'Unknown');

-- Update Phishing Campaign - set to Unknown (no direct mapping)
UPDATE incidents 
SET 
  mitre_tactic = 'Unknown',
  mitre_technique_id = 'Unknown',
  mitre_technique_name = 'Unknown',
  mitre_description = 'Unknown',
  recommended_action = 'Unknown'
WHERE title = 'Phishing Campaign Targeting Executives' 
  AND (mitre_tactic IS NULL OR mitre_tactic = 'Unknown');

-- Update DDoS Attack - set to Unknown (no direct mapping)
UPDATE incidents 
SET 
  mitre_tactic = 'Unknown',
  mitre_technique_id = 'Unknown',
  mitre_technique_name = 'Unknown',
  mitre_description = 'Unknown',
  recommended_action = 'Unknown'
WHERE title = 'DDoS Attack on Web Infrastructure' 
  AND (mitre_tactic IS NULL OR mitre_tactic = 'Unknown');

-- Update Unauthorized Access/Brute Force - map to BRUTE_FORCE
UPDATE incidents 
SET 
  mitre_tactic = 'Credential Access',
  mitre_technique_id = 'T1110',
  mitre_technique_name = 'Brute Force',
  mitre_description = 'Adversaries may use brute force techniques to gain access to accounts when passwords are unknown or when password hashes are obtained. This includes password guessing, password spraying, and credential stuffing attacks.',
  recommended_action = 'Implement account lockout policies, enable multi-factor authentication, monitor for multiple failed login attempts, and review authentication logs for suspicious patterns.'
WHERE title = 'Unauthorized Access Attempt - Admin Portal' 
  AND (mitre_tactic IS NULL OR mitre_tactic = 'Unknown');

-- Update Data Exfiltration - set to Unknown (no direct mapping)
UPDATE incidents 
SET 
  mitre_tactic = 'Unknown',
  mitre_technique_id = 'Unknown',
  mitre_technique_name = 'Unknown',
  mitre_description = 'Unknown',
  recommended_action = 'Unknown'
WHERE title = 'Suspicious Data Exfiltration Activity' 
  AND (mitre_tactic IS NULL OR mitre_tactic = 'Unknown');

-- Update Malicious Extension - set to Unknown (generic malware)
UPDATE incidents 
SET 
  mitre_tactic = 'Unknown',
  mitre_technique_id = 'Unknown',
  mitre_technique_name = 'Unknown',
  mitre_description = 'Unknown',
  recommended_action = 'Unknown'
WHERE title = 'Malicious Chrome Extension Detected' 
  AND (mitre_tactic IS NULL OR mitre_tactic = 'Unknown');

-- Update SQL Injection - map to WEB_EXPLOIT
UPDATE incidents 
SET 
  mitre_tactic = 'Initial Access',
  mitre_technique_id = 'T1190',
  mitre_technique_name = 'Exploit Public-Facing Application',
  mitre_description = 'Adversaries may attempt to exploit a weakness in an Internet-facing host or system to initially access a network. The weakness in the system can be a software bug, a temporary glitch, or a misconfiguration.',
  recommended_action = 'Apply security patches promptly, implement web application firewalls, conduct regular vulnerability assessments, and use input validation and sanitization.'
WHERE title = 'SQL Injection Attempt on API Endpoint' 
  AND (mitre_tactic IS NULL OR mitre_tactic = 'Unknown');

-- Update Insider Threat - set to Unknown (no direct mapping)
UPDATE incidents 
SET 
  mitre_tactic = 'Unknown',
  mitre_technique_id = 'Unknown',
  mitre_technique_name = 'Unknown',
  mitre_description = 'Unknown',
  recommended_action = 'Unknown'
WHERE title = 'Insider Threat - Unusual File Access' 
  AND (mitre_tactic IS NULL OR mitre_tactic = 'Unknown');