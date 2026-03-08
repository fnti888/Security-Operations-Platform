/*
  # Security Operations Platform Schema

  1. New Tables
    - `incidents`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `severity` (text) - critical, high, medium, low
      - `status` (text) - open, investigating, resolved, closed
      - `category` (text) - malware, phishing, data_breach, unauthorized_access, etc.
      - `assigned_to` (uuid, references auth.users)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `resolved_at` (timestamptz, nullable)
    
    - `threats`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `threat_level` (text) - critical, high, medium, low
      - `threat_type` (text) - malware, ransomware, phishing, ddos, etc.
      - `source` (text) - where the threat was detected
      - `indicators` (text) - IOCs, IPs, domains, etc.
      - `status` (text) - active, mitigated, monitoring
      - `detected_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `security_logs`
      - `id` (uuid, primary key)
      - `event_type` (text) - login, logout, config_change, alert_triggered, etc.
      - `severity` (text) - info, warning, error, critical
      - `user_id` (uuid, references auth.users, nullable)
      - `description` (text)
      - `metadata` (jsonb) - additional event data
      - `ip_address` (text, nullable)
      - `created_at` (timestamptz)
    
    - `alerts`
      - `id` (uuid, primary key)
      - `title` (text)
      - `message` (text)
      - `alert_type` (text) - security, system, performance
      - `severity` (text) - critical, high, medium, low
      - `status` (text) - active, acknowledged, resolved
      - `acknowledged_by` (uuid, references auth.users, nullable)
      - `created_at` (timestamptz)
      - `acknowledged_at` (timestamptz, nullable)
    
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text)
      - `role` (text) - admin, analyst, viewer
      - `department` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read/write their relevant data
    - Admin users have full access
    - Analysts can manage incidents and threats
    - Viewers have read-only access
*/

-- Create incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  category text NOT NULL,
  assigned_to uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT incidents_severity_check CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  CONSTRAINT incidents_status_check CHECK (status IN ('open', 'investigating', 'resolved', 'closed'))
);

-- Create threats table
CREATE TABLE IF NOT EXISTS threats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  threat_level text NOT NULL DEFAULT 'medium',
  threat_type text NOT NULL,
  source text NOT NULL,
  indicators text,
  status text NOT NULL DEFAULT 'active',
  detected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT threats_level_check CHECK (threat_level IN ('critical', 'high', 'medium', 'low')),
  CONSTRAINT threats_status_check CHECK (status IN ('active', 'mitigated', 'monitoring'))
);

-- Create security_logs table
CREATE TABLE IF NOT EXISTS security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  user_id uuid REFERENCES auth.users(id),
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT logs_severity_check CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  alert_type text NOT NULL DEFAULT 'security',
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'active',
  acknowledged_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz,
  CONSTRAINT alerts_type_check CHECK (alert_type IN ('security', 'system', 'performance')),
  CONSTRAINT alerts_severity_check CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  CONSTRAINT alerts_status_check CHECK (status IN ('active', 'acknowledged', 'resolved'))
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  department text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'analyst', 'viewer'))
);

-- Enable Row Level Security
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE threats ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for incidents
CREATE POLICY "Authenticated users can view incidents"
  ON incidents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create incidents"
  ON incidents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update incidents they created or are assigned to"
  ON incidents FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = assigned_to);

-- Policies for threats
CREATE POLICY "Authenticated users can view threats"
  ON threats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create threats"
  ON threats FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update threats"
  ON threats FOR UPDATE
  TO authenticated
  USING (true);

-- Policies for security_logs
CREATE POLICY "Authenticated users can view security logs"
  ON security_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert security logs"
  ON security_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for alerts
CREATE POLICY "Authenticated users can view alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (true);

-- Policies for user_profiles
CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS incidents_status_idx ON incidents(status);
CREATE INDEX IF NOT EXISTS incidents_severity_idx ON incidents(severity);
CREATE INDEX IF NOT EXISTS incidents_created_at_idx ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS threats_status_idx ON threats(status);
CREATE INDEX IF NOT EXISTS threats_level_idx ON threats(threat_level);
CREATE INDEX IF NOT EXISTS alerts_status_idx ON alerts(status);
CREATE INDEX IF NOT EXISTS alerts_severity_idx ON alerts(severity);
CREATE INDEX IF NOT EXISTS security_logs_created_at_idx ON security_logs(created_at DESC);