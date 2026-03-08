/*
  # Populate Resume Data for Frank Nti
  
  ## Overview
  Populates the resume database with comprehensive professional information
  for Frank Nti, including profile details, work experience, education, and skills.
  
  ## Changes
  
  1. Profile Information
    - Creates a public profile for Frank Nti
    - Includes contact information and professional summary
    - Cybersecurity and Digital Forensics Specialist
  
  2. Work Experience (4 positions)
    - Senior Cybersecurity Analyst at FBI (Current)
    - Digital Forensics Investigator at Mandiant
    - SOC Analyst at Booz Allen Hamilton
    - IT Security Specialist at DoD
  
  3. Education (4 entries)
    - M.S. in Cybersecurity from Johns Hopkins University
    - B.S. in Computer Science from University of Maryland
    - GIAC Certified Forensic Examiner (GCFE)
    - Certified Ethical Hacker (CEH)
  
  4. Skills (41 skills across 6 categories)
    - Digital Forensics (8 skills)
    - Malware Analysis (6 skills)
    - Security Tools (8 skills)
    - Programming (6 skills)
    - Operating Systems (4 skills)
    - Cybersecurity (5 skills)
    - Compliance (4 skills)
  
  ## Security
  - Profile is set to public for portfolio visibility
  - user_id is null since this is a public portfolio
  - All data properly associated with profile_id
*/

DO $$
DECLARE
  v_profile_id uuid;
BEGIN
  -- Check if profile already exists
  SELECT id INTO v_profile_id FROM profiles WHERE full_name = 'Frank Nti' LIMIT 1;
  
  -- Only insert if profile doesn't exist
  IF v_profile_id IS NULL THEN
    -- Insert profile data
    INSERT INTO profiles (
      user_id,
      full_name,
      title,
      summary,
      email,
      phone,
      linkedin_url,
      location,
      is_public
    ) VALUES (
      NULL,
      'Frank Nti',
      'Cybersecurity & Digital Forensics Specialist',
      'Experienced cybersecurity professional with 8+ years of expertise in digital forensics, incident response, and threat intelligence. Proven track record in conducting complex cybercrime investigations, implementing security solutions, and leading incident response operations. Specialized in malware analysis, network forensics, and security operations center management. Passionate about protecting organizations from evolving cyber threats through proactive security measures and comprehensive forensic analysis.',
      'frank.nti@securemail.com',
      '+1 (555) 123-4567',
      'https://www.linkedin.com/in/franknti',
      'Washington, DC',
      true
    ) RETURNING id INTO v_profile_id;

    -- Insert work experiences
    INSERT INTO work_experiences (profile_id, company, position, location, start_date, end_date, description, display_order) VALUES
    (v_profile_id, 'Federal Bureau of Investigation (FBI)', 'Senior Cybersecurity Analyst', 'Washington, DC', '2020-01-01', NULL, 'Lead digital forensics investigations for high-profile cybercrime cases involving nation-state actors and organized cybercrime groups. Conduct advanced malware analysis, reverse engineering, and memory forensics using tools like Volatility, IDA Pro, and Ghidra.

• Led forensic analysis team in resolving 50+ critical security incidents, reducing response time by 40%
• Developed automated forensic analysis scripts using Python, improving evidence collection efficiency by 60%
• Collaborated with international law enforcement agencies on cross-border cybercrime investigations
• Provided expert testimony in federal court cases involving computer fraud and cyber intrusions
• Mentored junior analysts on digital forensics techniques and incident response procedures', 0),

    (v_profile_id, 'Mandiant (FireEye)', 'Digital Forensics Investigator', 'Reston, VA', '2018-01-01', '2019-12-31', 'Performed comprehensive digital forensic investigations for Fortune 500 clients experiencing security breaches. Specialized in endpoint forensics, network traffic analysis, and threat actor attribution.

• Investigated 100+ security incidents across various industries including finance, healthcare, and government
• Analyzed compromised systems to identify indicators of compromise (IOCs) and attack vectors
• Created detailed forensic reports documenting findings, timeline analysis, and remediation recommendations
• Conducted threat hunting operations to identify hidden malware and persistent threats
• Utilized EnCase, FTK, X-Ways Forensics, and open-source tools for evidence acquisition and analysis', 1),

    (v_profile_id, 'Booz Allen Hamilton', 'Security Operations Center (SOC) Analyst', 'McLean, VA', '2016-06-01', '2017-12-31', 'Monitored and analyzed security events from SIEM platforms, IDS/IPS systems, and endpoint detection tools. Responded to security alerts, performed triage, and escalated critical incidents for investigation.

• Monitored security events for classified government networks serving 10,000+ users
• Reduced false positive alerts by 35% through SIEM rule optimization and threat intelligence integration
• Developed incident response playbooks for common attack scenarios
• Performed log analysis using Splunk to identify suspicious activities and potential breaches
• Participated in tabletop exercises and red team engagements to improve security posture', 2),

    (v_profile_id, 'Department of Defense (DoD)', 'IT Security Specialist', 'Fort Meade, MD', '2015-01-01', '2016-05-31', 'Implemented and maintained security controls for classified information systems. Conducted vulnerability assessments, security audits, and compliance monitoring.

• Ensured compliance with DoD security requirements including STIGs, NIST, and FISMA standards
• Conducted quarterly vulnerability assessments and penetration testing on critical systems
• Implemented security hardening measures reducing vulnerabilities by 70%
• Managed Public Key Infrastructure (PKI) for secure communications
• Coordinated security incidents with CIRT teams and documented lessons learned', 3);

    -- Insert education
    INSERT INTO education (profile_id, institution, degree, field_of_study, start_date, end_date, description, display_order) VALUES
    (v_profile_id, 'Johns Hopkins University', 'Master of Science (M.S.)', 'Cybersecurity', '2017-09-01', '2019-05-31', 'Advanced studies in digital forensics, malware analysis, cryptography, and network security. Thesis: "Advanced Persistent Threat Detection Using Machine Learning and Behavioral Analysis."

Relevant Coursework:
• Digital Forensics and Incident Response
• Malware Reverse Engineering
• Network Security and Penetration Testing
• Cryptographic Systems
• Security Risk Management', 0),

    (v_profile_id, 'University of Maryland', 'Bachelor of Science (B.S.)', 'Computer Science', '2011-09-01', '2015-05-31', 'Concentrated in cybersecurity and network administration. Dean''s List all semesters. President of Cybersecurity Club.

Relevant Coursework:
• Computer Networks and Security
• Operating Systems
• Computer Architecture
• Database Systems
• Software Engineering', 1),

    (v_profile_id, 'SANS Institute', 'GIAC Certified Forensic Examiner (GCFE)', 'Digital Forensics', '2019-03-01', '2019-03-31', 'Advanced certification in digital forensics and incident response. Focuses on forensic analysis of Windows and Linux systems, file system analysis, registry forensics, and timeline creation.', 2),

    (v_profile_id, 'EC-Council', 'Certified Ethical Hacker (CEH)', 'Penetration Testing', '2018-06-01', '2018-06-30', 'Comprehensive ethical hacking certification covering penetration testing methodologies, vulnerability assessment, and exploitation techniques.', 3);

    -- Insert skills
    INSERT INTO skills (profile_id, name, category, proficiency_level, display_order) VALUES
    -- Digital Forensics
    (v_profile_id, 'EnCase Forensic', 'Digital Forensics', 'Expert', 0),
    (v_profile_id, 'FTK (Forensic Toolkit)', 'Digital Forensics', 'Expert', 1),
    (v_profile_id, 'X-Ways Forensics', 'Digital Forensics', 'Advanced', 2),
    (v_profile_id, 'Autopsy', 'Digital Forensics', 'Expert', 3),
    (v_profile_id, 'Volatility Framework', 'Digital Forensics', 'Expert', 4),
    (v_profile_id, 'Sleuth Kit', 'Digital Forensics', 'Advanced', 5),
    (v_profile_id, 'Wireshark', 'Digital Forensics', 'Expert', 6),
    (v_profile_id, 'NetworkMiner', 'Digital Forensics', 'Advanced', 7),

    -- Malware Analysis
    (v_profile_id, 'IDA Pro', 'Malware Analysis', 'Advanced', 8),
    (v_profile_id, 'Ghidra', 'Malware Analysis', 'Advanced', 9),
    (v_profile_id, 'OllyDbg', 'Malware Analysis', 'Advanced', 10),
    (v_profile_id, 'Cuckoo Sandbox', 'Malware Analysis', 'Expert', 11),
    (v_profile_id, 'YARA Rules', 'Malware Analysis', 'Expert', 12),
    (v_profile_id, 'REMnux', 'Malware Analysis', 'Advanced', 13),

    -- Security Tools
    (v_profile_id, 'Splunk', 'Security Tools', 'Expert', 14),
    (v_profile_id, 'QRadar', 'Security Tools', 'Advanced', 15),
    (v_profile_id, 'Nessus', 'Security Tools', 'Expert', 16),
    (v_profile_id, 'Metasploit', 'Security Tools', 'Advanced', 17),
    (v_profile_id, 'Burp Suite', 'Security Tools', 'Advanced', 18),
    (v_profile_id, 'Nmap', 'Security Tools', 'Expert', 19),
    (v_profile_id, 'Snort', 'Security Tools', 'Advanced', 20),
    (v_profile_id, 'Suricata', 'Security Tools', 'Advanced', 21),

    -- Programming & Scripting
    (v_profile_id, 'Python', 'Programming', 'Expert', 22),
    (v_profile_id, 'PowerShell', 'Programming', 'Advanced', 23),
    (v_profile_id, 'Bash/Shell Scripting', 'Programming', 'Expert', 24),
    (v_profile_id, 'SQL', 'Programming', 'Advanced', 25),
    (v_profile_id, 'JavaScript', 'Programming', 'Intermediate', 26),
    (v_profile_id, 'C/C++', 'Programming', 'Intermediate', 27),

    -- Operating Systems
    (v_profile_id, 'Windows Forensics', 'Operating Systems', 'Expert', 28),
    (v_profile_id, 'Linux Administration', 'Operating Systems', 'Expert', 29),
    (v_profile_id, 'macOS Forensics', 'Operating Systems', 'Advanced', 30),
    (v_profile_id, 'Active Directory', 'Operating Systems', 'Advanced', 31),

    -- Incident Response
    (v_profile_id, 'Incident Response', 'Cybersecurity', 'Expert', 32),
    (v_profile_id, 'Threat Intelligence', 'Cybersecurity', 'Expert', 33),
    (v_profile_id, 'Threat Hunting', 'Cybersecurity', 'Advanced', 34),
    (v_profile_id, 'MITRE ATT&CK', 'Cybersecurity', 'Expert', 35),
    (v_profile_id, 'Security Information and Event Management (SIEM)', 'Cybersecurity', 'Expert', 36),

    -- Compliance & Standards
    (v_profile_id, 'NIST Framework', 'Compliance', 'Expert', 37),
    (v_profile_id, 'ISO 27001', 'Compliance', 'Advanced', 38),
    (v_profile_id, 'HIPAA', 'Compliance', 'Advanced', 39),
    (v_profile_id, 'PCI DSS', 'Compliance', 'Advanced', 40);
  END IF;
END $$;
