/*
  # Forensic Investigation Tables

  1. New Tables
    - `investigations`
      - `id` (uuid, primary key)
      - `case_number` (text, unique)
      - `title` (text)
      - `description` (text)
      - `investigator_id` (uuid, references auth.users)
      - `status` (text) - open, active, closed, archived
      - `priority` (text) - critical, high, medium, low
      - `created_at` (timestamptz)
      - `closed_at` (timestamptz)
    
    - `evidence`
      - `id` (uuid, primary key)
      - `investigation_id` (uuid, references investigations)
      - `evidence_number` (text)
      - `evidence_type` (text) - file, memory, network, log, disk
      - `file_path` (text)
      - `file_hash_md5` (text)
      - `file_hash_sha1` (text)
      - `file_hash_sha256` (text)
      - `file_size` (bigint)
      - `description` (text)
      - `collected_by` (uuid, references auth.users)
      - `collected_at` (timestamptz)
      - `chain_of_custody` (jsonb)
    
    - `artifacts`
      - `id` (uuid, primary key)
      - `investigation_id` (uuid, references investigations)
      - `artifact_type` (text) - registry, browser, email, file_metadata, network_conn
      - `source` (text)
      - `artifact_data` (jsonb)
      - `timeline_date` (timestamptz)
      - `relevant` (boolean)
      - `notes` (text)
      - `discovered_at` (timestamptz)
    
    - `memory_analysis`
      - `id` (uuid, primary key)
      - `investigation_id` (uuid, references investigations)
      - `process_name` (text)
      - `pid` (integer)
      - `parent_pid` (integer)
      - `memory_region` (text)
      - `start_address` (text)
      - `end_address` (text)
      - `protection` (text)
      - `hex_dump` (text)
      - `strings_found` (text[])
      - `suspicious` (boolean)
      - `analyzed_at` (timestamptz)
    
    - `forensic_timeline`
      - `id` (uuid, primary key)
      - `investigation_id` (uuid, references investigations)
      - `timestamp` (timestamptz)
      - `event_type` (text)
      - `source` (text)
      - `description` (text)
      - `artifact_id` (uuid, references artifacts)
      - `evidence_id` (uuid, references evidence)
      - `metadata` (jsonb)

  2. Security
    - Enable RLS on all tables
    - Investigators can manage their investigations
    - Evidence has strict chain of custody tracking
*/

-- Create investigations table
CREATE TABLE IF NOT EXISTS investigations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  investigator_id uuid REFERENCES auth.users(id) NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  CONSTRAINT investigation_status_check CHECK (status IN ('open', 'active', 'closed', 'archived')),
  CONSTRAINT investigation_priority_check CHECK (priority IN ('critical', 'high', 'medium', 'low'))
);

-- Create evidence table
CREATE TABLE IF NOT EXISTS evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid REFERENCES investigations(id) ON DELETE CASCADE NOT NULL,
  evidence_number text NOT NULL,
  evidence_type text NOT NULL,
  file_path text,
  file_hash_md5 text,
  file_hash_sha1 text,
  file_hash_sha256 text,
  file_size bigint DEFAULT 0,
  description text NOT NULL,
  collected_by uuid REFERENCES auth.users(id) NOT NULL,
  collected_at timestamptz DEFAULT now(),
  chain_of_custody jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT evidence_type_check CHECK (evidence_type IN ('file', 'memory', 'network', 'log', 'disk', 'volatile'))
);

-- Create artifacts table
CREATE TABLE IF NOT EXISTS artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid REFERENCES investigations(id) ON DELETE CASCADE NOT NULL,
  artifact_type text NOT NULL,
  source text NOT NULL,
  artifact_data jsonb DEFAULT '{}'::jsonb,
  timeline_date timestamptz NOT NULL,
  relevant boolean DEFAULT true,
  notes text,
  discovered_at timestamptz DEFAULT now(),
  CONSTRAINT artifact_type_check CHECK (artifact_type IN ('registry', 'browser', 'email', 'file_metadata', 'network_conn', 'process', 'user_activity'))
);

-- Create memory_analysis table
CREATE TABLE IF NOT EXISTS memory_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid REFERENCES investigations(id) ON DELETE CASCADE NOT NULL,
  process_name text NOT NULL,
  pid integer NOT NULL,
  parent_pid integer,
  memory_region text,
  start_address text,
  end_address text,
  protection text,
  hex_dump text,
  strings_found text[],
  suspicious boolean DEFAULT false,
  analyzed_at timestamptz DEFAULT now()
);

-- Create forensic_timeline table
CREATE TABLE IF NOT EXISTS forensic_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid REFERENCES investigations(id) ON DELETE CASCADE NOT NULL,
  timestamp timestamptz NOT NULL,
  event_type text NOT NULL,
  source text NOT NULL,
  description text NOT NULL,
  artifact_id uuid REFERENCES artifacts(id),
  evidence_id uuid REFERENCES evidence(id),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE forensic_timeline ENABLE ROW LEVEL SECURITY;

-- Policies for investigations
CREATE POLICY "Users can view all investigations"
  ON investigations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create investigations"
  ON investigations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = investigator_id);

CREATE POLICY "Investigators can update their investigations"
  ON investigations FOR UPDATE
  TO authenticated
  USING (auth.uid() = investigator_id);

-- Policies for evidence
CREATE POLICY "Users can view evidence"
  ON evidence FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can collect evidence"
  ON evidence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = collected_by);

CREATE POLICY "Collectors can update their evidence"
  ON evidence FOR UPDATE
  TO authenticated
  USING (auth.uid() = collected_by);

-- Policies for artifacts
CREATE POLICY "Users can view artifacts"
  ON artifacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create artifacts"
  ON artifacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update artifacts"
  ON artifacts FOR UPDATE
  TO authenticated
  USING (true);

-- Policies for memory_analysis
CREATE POLICY "Users can view memory analysis"
  ON memory_analysis FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create memory analysis"
  ON memory_analysis FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for forensic_timeline
CREATE POLICY "Users can view timeline"
  ON forensic_timeline FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create timeline events"
  ON forensic_timeline FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS investigations_investigator_idx ON investigations(investigator_id);
CREATE INDEX IF NOT EXISTS investigations_status_idx ON investigations(status);
CREATE INDEX IF NOT EXISTS evidence_investigation_idx ON evidence(investigation_id);
CREATE INDEX IF NOT EXISTS evidence_hash_sha256_idx ON evidence(file_hash_sha256);
CREATE INDEX IF NOT EXISTS artifacts_investigation_idx ON artifacts(investigation_id);
CREATE INDEX IF NOT EXISTS artifacts_timeline_date_idx ON artifacts(timeline_date);
CREATE INDEX IF NOT EXISTS memory_analysis_investigation_idx ON memory_analysis(investigation_id);
CREATE INDEX IF NOT EXISTS memory_analysis_suspicious_idx ON memory_analysis(suspicious);
CREATE INDEX IF NOT EXISTS forensic_timeline_investigation_idx ON forensic_timeline(investigation_id);
CREATE INDEX IF NOT EXISTS forensic_timeline_timestamp_idx ON forensic_timeline(timestamp);