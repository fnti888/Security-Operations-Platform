/*
  # Security Portfolio & Skills Development Schema

  1. New Tables
    - `portfolio_entries`
      - Stores real security analysis work (PCAP analysis, log investigation, malware analysis)
      - Links to evidence files and findings
      - Includes MITRE ATT&CK mapping

    - `incident_playbooks`
      - Professional incident response procedures
      - Step-by-step IR workflows
      - Industry-standard templates

    - `security_queries`
      - Library of detection queries (Splunk, ELK, KQL, etc.)
      - Real threat hunting queries
      - Use case documentation

    - `skills_tracker`
      - Tracks learning progress on security tools
      - Certifications and training
      - Hands-on lab completion

    - `pcap_analysis`
      - Real packet capture analysis
      - Threat identification
      - Network forensics findings

  2. Security
    - Enable RLS on all tables
    - Allow authenticated users to manage their own portfolio
    - Public read access for portfolio sharing (optional)
*/

-- Portfolio Entries Table
CREATE TABLE IF NOT EXISTS portfolio_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('pcap_analysis', 'log_analysis', 'malware_analysis', 'threat_hunt', 'incident_response', 'vulnerability_assessment')),
  description text NOT NULL,
  findings text NOT NULL,
  tools_used text[] DEFAULT '{}',
  mitre_techniques text[] DEFAULT '{}',
  severity text CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  date_analyzed timestamptz DEFAULT now(),
  evidence_links text[] DEFAULT '{}',
  is_public boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Incident Response Playbooks
CREATE TABLE IF NOT EXISTS incident_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  playbook_name text NOT NULL,
  incident_type text NOT NULL,
  description text NOT NULL,
  preparation_steps jsonb DEFAULT '[]',
  detection_steps jsonb DEFAULT '[]',
  containment_steps jsonb DEFAULT '[]',
  eradication_steps jsonb DEFAULT '[]',
  recovery_steps jsonb DEFAULT '[]',
  lessons_learned jsonb DEFAULT '[]',
  mitre_techniques text[] DEFAULT '{}',
  required_tools text[] DEFAULT '{}',
  escalation_criteria text,
  is_template boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Security Detection Queries Library
CREATE TABLE IF NOT EXISTS security_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  query_name text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('splunk', 'elk', 'kql', 'sigma', 'suricata', 'snort', 'yara')),
  query_text text NOT NULL,
  description text NOT NULL,
  use_case text NOT NULL,
  mitre_technique text,
  severity text CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  false_positive_notes text,
  tags text[] DEFAULT '{}',
  is_tested boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Skills & Learning Tracker
CREATE TABLE IF NOT EXISTS skills_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_category text NOT NULL CHECK (skill_category IN ('tool_proficiency', 'certification', 'training_course', 'hands_on_lab', 'ctf_challenge')),
  skill_name text NOT NULL,
  proficiency_level text CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  status text CHECK (status IN ('learning', 'completed', 'certified', 'practicing')),
  date_started timestamptz,
  date_completed timestamptz,
  proof_url text,
  notes text,
  hours_invested integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- PCAP Analysis Entries
CREATE TABLE IF NOT EXISTS pcap_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_name text NOT NULL,
  source text NOT NULL,
  date_analyzed timestamptz DEFAULT now(),
  total_packets integer,
  suspicious_packets integer,
  protocols_found text[] DEFAULT '{}',
  threat_indicators jsonb DEFAULT '{}',
  iocs_found jsonb DEFAULT '{}',
  malicious_ips text[] DEFAULT '{}',
  malicious_domains text[] DEFAULT '{}',
  attack_summary text,
  mitre_techniques text[] DEFAULT '{}',
  tools_used text[] DEFAULT '{}',
  findings text NOT NULL,
  remediation_notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE portfolio_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcap_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portfolio_entries
CREATE POLICY "Users can view own portfolio entries"
  ON portfolio_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public portfolio entries"
  ON portfolio_entries FOR SELECT
  TO public
  USING (is_public = true);

CREATE POLICY "Users can create own portfolio entries"
  ON portfolio_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio entries"
  ON portfolio_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolio entries"
  ON portfolio_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for incident_playbooks
CREATE POLICY "Users can view own playbooks"
  ON incident_playbooks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_template = true);

CREATE POLICY "Users can create own playbooks"
  ON incident_playbooks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playbooks"
  ON incident_playbooks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own playbooks"
  ON incident_playbooks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for security_queries
CREATE POLICY "Users can view own queries"
  ON security_queries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own queries"
  ON security_queries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queries"
  ON security_queries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own queries"
  ON security_queries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for skills_tracker
CREATE POLICY "Users can view own skills"
  ON skills_tracker FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own skills"
  ON skills_tracker FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skills"
  ON skills_tracker FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own skills"
  ON skills_tracker FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for pcap_analysis
CREATE POLICY "Users can view own PCAP analysis"
  ON pcap_analysis FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own PCAP analysis"
  ON pcap_analysis FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own PCAP analysis"
  ON pcap_analysis FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own PCAP analysis"
  ON pcap_analysis FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolio_entries_user_id ON portfolio_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_entries_type ON portfolio_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_portfolio_entries_public ON portfolio_entries(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_incident_playbooks_user_id ON incident_playbooks(user_id);
CREATE INDEX IF NOT EXISTS idx_security_queries_user_id ON security_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_security_queries_platform ON security_queries(platform);
CREATE INDEX IF NOT EXISTS idx_skills_tracker_user_id ON skills_tracker(user_id);
CREATE INDEX IF NOT EXISTS idx_pcap_analysis_user_id ON pcap_analysis(user_id);
