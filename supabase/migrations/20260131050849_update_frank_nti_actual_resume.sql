/*
  # Update Frank Nti Resume with Actual Information
  
  ## Overview
  Updates the existing Frank Nti profile with accurate resume information
  including correct contact details, work experience, education, and skills.
  
  ## Changes
  
  1. Profile Updates
    - Correct contact information (email, phone, location)
    - Updated professional title and summary
  
  2. Work Experience Updates
    - Security Operations Contractor via Discord Community (2019-Present)
    - IT Systems Administrator at Judge Rotenberg Center (2020-2024)
  
  3. Education Updates
    - Per Scholas Cybersecurity Program
  
  4. Skills Updates
    - Accurate technical skills matching resume
*/

DO $$
DECLARE
  v_profile_id uuid;
BEGIN
  -- Get the existing profile
  SELECT id INTO v_profile_id FROM profiles WHERE full_name = 'Frank Nti' LIMIT 1;
  
  IF v_profile_id IS NOT NULL THEN
    -- Update profile with correct information
    UPDATE profiles SET
      title = 'SOC Analyst | Cybersecurity Analyst | Jr. Cyber Security',
      summary = 'Cybersecurity professional with hands-on experience in security operations, threat detection, and vulnerability management, supported by prior experience in systems and network administration. Familiar with SIEM monitoring, log analysis, and incident response using tools such as Splunk, Wireshark, and Nessus. Brings a strong analytical mindset, clear communication skills, and a proactive approach to strengthening security posture. Currently pursuing CompTIA CySA+ and Security+ certifications.',
      email = 'fnti888@outlook.com',
      phone = '617-685-8224',
      linkedin_url = 'https://linkedin.com/in/frank-nti-',
      location = '02132',
      updated_at = now()
    WHERE id = v_profile_id;

    -- Delete existing work experiences
    DELETE FROM work_experiences WHERE profile_id = v_profile_id;
    
    -- Insert correct work experiences
    INSERT INTO work_experiences (profile_id, company, position, location, start_date, end_date, description, display_order) VALUES
    (v_profile_id, 'Discord Community (Self-Employed)', 'Security Operations Contractor', 'Remote', '2019-01-01', NULL, '• Investigated 20+ security incidents including phishing attempts, spams and suspicious user activity
• Delivered security awareness guidance to 50+ end users, contributing to a measurable reduction in successful phishing attempts over time
• Performed routine vulnerability scans and implement security patches and remediation
• Monitored security alerts and responded to potential threats following established incident response

Skills: Incident Response | Vulnerability Assessment | Network Security | Firewall / IDS/IPS', 0),

    (v_profile_id, 'Judge Rotenberg Center', 'IT Systems Administrator', 'Canton, MA', '2020-01-01', '2024-01-01', '• Provided Tier 1/2 technical support for 300+ users across multiple departments
• Administered Active Directory with 400+ user accounts; implemented multi-factor authentication (MFA)
• Managed network security infrastructure including firewalls, switches, and wireless access points
• Conducted monthly security audits and implemented security patches and system hardening measures', 1);

    -- Delete existing education
    DELETE FROM education WHERE profile_id = v_profile_id;
    
    -- Insert correct education
    INSERT INTO education (profile_id, institution, degree, field_of_study, start_date, end_date, description, display_order) VALUES
    (v_profile_id, 'Per Scholas', 'Certificate', 'Cybersecurity Program', '2025-11-01', '2026-03-31', '15 week Cybersecurity Program (Full-time) focused on the CompTIA CySA+ certification', 0),
    (v_profile_id, 'CompTIA', 'Security+', 'Cybersecurity Certification', '2025-11-01', '2026-03-31', 'Expected March 2026', 1);

    -- Delete existing skills
    DELETE FROM skills WHERE profile_id = v_profile_id;
    
    -- Insert correct skills
    INSERT INTO skills (profile_id, name, category, proficiency_level, display_order) VALUES
    -- Security Operations
    (v_profile_id, 'SIEM (Splunk, Security Onion)', 'Security Operations', 'Advanced', 0),
    (v_profile_id, 'IDS/IPS', 'Security Operations', 'Advanced', 1),
    (v_profile_id, 'Threat Hunting', 'Security Operations', 'Intermediate', 2),
    (v_profile_id, 'Log Analysis', 'Security Operations', 'Advanced', 3),
    (v_profile_id, 'Incident Response', 'Security Operations', 'Advanced', 4),

    -- Security Tools
    (v_profile_id, 'Wireshark', 'Security Tools', 'Advanced', 5),
    (v_profile_id, 'Nmap', 'Security Tools', 'Advanced', 6),
    (v_profile_id, 'Nessus', 'Security Tools', 'Advanced', 7),
    (v_profile_id, 'OpenVAS', 'Security Tools', 'Intermediate', 8),
    (v_profile_id, 'Metasploit', 'Security Tools', 'Intermediate', 9),
    (v_profile_id, 'Vulnerability Scanning', 'Security Tools', 'Advanced', 10),
    (v_profile_id, 'Malware Analysis', 'Security Tools', 'Intermediate', 11),

    -- Systems & Admin
    (v_profile_id, 'Windows Server (2016/2019)', 'Systems & Admin', 'Advanced', 12),
    (v_profile_id, 'Linux (Ubuntu, Kali)', 'Systems & Admin', 'Advanced', 13),
    (v_profile_id, 'Active Directory', 'Systems & Admin', 'Advanced', 14),
    (v_profile_id, 'PowerShell', 'Systems & Admin', 'Advanced', 15),
    (v_profile_id, 'Bash', 'Systems & Admin', 'Advanced', 16),

    -- Networking
    (v_profile_id, 'TCP/IP', 'Networking', 'Advanced', 17),
    (v_profile_id, 'DNS', 'Networking', 'Advanced', 18),
    (v_profile_id, 'DHCP', 'Networking', 'Advanced', 19),
    (v_profile_id, 'Firewalls', 'Networking', 'Advanced', 20),
    (v_profile_id, 'VPN', 'Networking', 'Advanced', 21),
    (v_profile_id, 'Subnetting', 'Networking', 'Advanced', 22),
    (v_profile_id, 'Network Monitoring', 'Networking', 'Advanced', 23),
    (v_profile_id, 'Traffic Analysis', 'Networking', 'Advanced', 24),

    -- Cloud Platforms
    (v_profile_id, 'AWS (EC2)', 'Cloud Platforms', 'Intermediate', 25),
    (v_profile_id, 'Azure AD', 'Cloud Platforms', 'Intermediate', 26),
    (v_profile_id, 'Microsoft 365', 'Cloud Platforms', 'Advanced', 27);
  END IF;
END $$;
