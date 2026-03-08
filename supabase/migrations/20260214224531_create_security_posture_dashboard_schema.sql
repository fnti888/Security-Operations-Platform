/*
  # Security Posture Dashboard Schema

  ## Overview
  Centralized security metrics and scoring system that aggregates data from all security tools to provide executive-level visibility.

  ## New Tables

  ### 1. `security_posture_scores`
  Overall security posture metrics per user per day
  - `id` (uuid, primary key) - Unique record identifier
  - `user_id` (uuid, foreign key) - User
  - `date` (date) - Metrics date
  - `overall_score` (integer) - Overall security score (0-100)
  - `network_score` (integer) - Network security score (0-100)
  - `vulnerability_score` (integer) - Vulnerability management score (0-100)
  - `ssl_tls_score` (integer) - SSL/TLS configuration score (0-100)
  - `incident_score` (integer) - Incident response score (0-100)
  - `total_assets` (integer) - Total network assets discovered
  - `vulnerable_assets` (integer) - Assets with vulnerabilities
  - `critical_vulnerabilities` (integer) - Count of critical vulnerabilities
  - `high_vulnerabilities` (integer) - Count of high vulnerabilities
  - `ssl_issues` (integer) - SSL/TLS configuration issues
  - `open_incidents` (integer) - Open security incidents
  - `risk_level` (text) - Overall risk level: 'critical', 'high', 'medium', 'low'
  - `compliance_status` (text) - Compliance status: 'compliant', 'non_compliant', 'partial'
  - `created_at` (timestamptz) - Record creation timestamp

  ### 2. `security_metrics_history`
  Historical trend data for security metrics
  - `id` (uuid, primary key) - Unique record identifier
  - `user_id` (uuid, foreign key) - User
  - `metric_name` (text) - Metric identifier
  - `metric_value` (numeric) - Metric value
  - `metric_type` (text) - Type: 'score', 'count', 'percentage'
  - `recorded_at` (timestamptz) - When metric was recorded
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. `security_recommendations`
  Actionable security recommendations based on current posture
  - `id` (uuid, primary key) - Unique recommendation identifier
  - `user_id` (uuid, foreign key) - User
  - `category` (text) - Category: 'vulnerability', 'configuration', 'policy', 'compliance'
  - `priority` (text) - Priority: 'critical', 'high', 'medium', 'low'
  - `title` (text) - Recommendation title
  - `description` (text) - Detailed description
  - `impact` (text) - Expected impact of implementing
  - `effort` (text) - Implementation effort: 'low', 'medium', 'high'
  - `status` (text) - Status: 'open', 'in_progress', 'completed', 'dismissed'
  - `assigned_to` (uuid) - User assigned to implement
  - `due_date` (date) - Target completion date
  - `completed_at` (timestamptz) - When completed
  - `created_at` (timestamptz) - Record creation timestamp

  ### 4. `compliance_checks`
  Compliance framework checks and results
  - `id` (uuid, primary key) - Unique check identifier
  - `user_id` (uuid, foreign key) - User
  - `framework` (text) - Framework: 'NIST', 'ISO27001', 'PCI-DSS', 'HIPAA', 'SOC2'
  - `control_id` (text) - Control identifier
  - `control_name` (text) - Control name
  - `control_description` (text) - Control description
  - `status` (text) - Status: 'pass', 'fail', 'partial', 'not_applicable'
  - `evidence` (text) - Evidence of compliance
  - `last_checked` (timestamptz) - Last check timestamp
  - `next_check_due` (timestamptz) - Next scheduled check
  - `created_at` (timestamptz) - Record creation timestamp

  ### 5. `security_alerts`
  High-priority security alerts requiring immediate attention
  - `id` (uuid, primary key) - Unique alert identifier
  - `user_id` (uuid, foreign key) - User
  - `alert_type` (text) - Type: 'critical_vuln', 'ssl_expiry', 'network_breach', 'compliance_violation'
  - `severity` (text) - Severity: 'critical', 'high', 'medium', 'low'
  - `title` (text) - Alert title
  - `message` (text) - Alert message
  - `source` (text) - Source system/scan
  - `status` (text) - Status: 'new', 'acknowledged', 'resolved'
  - `acknowledged_by` (uuid) - User who acknowledged
  - `acknowledged_at` (timestamptz) - When acknowledged
  - `resolved_at` (timestamptz) - When resolved
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - RLS enabled on all tables
  - Users can only access their own security posture data
  - Separate policies for select, insert, update, delete operations
*/

-- Create security_posture_scores table
CREATE TABLE IF NOT EXISTS security_posture_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  overall_score integer DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  network_score integer DEFAULT 0 CHECK (network_score >= 0 AND network_score <= 100),
  vulnerability_score integer DEFAULT 0 CHECK (vulnerability_score >= 0 AND vulnerability_score <= 100),
  ssl_tls_score integer DEFAULT 0 CHECK (ssl_tls_score >= 0 AND ssl_tls_score <= 100),
  incident_score integer DEFAULT 0 CHECK (incident_score >= 0 AND incident_score <= 100),
  total_assets integer DEFAULT 0,
  vulnerable_assets integer DEFAULT 0,
  critical_vulnerabilities integer DEFAULT 0,
  high_vulnerabilities integer DEFAULT 0,
  ssl_issues integer DEFAULT 0,
  open_incidents integer DEFAULT 0,
  risk_level text DEFAULT 'medium' CHECK (risk_level IN ('critical', 'high', 'medium', 'low')),
  compliance_status text DEFAULT 'partial' CHECK (compliance_status IN ('compliant', 'non_compliant', 'partial')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create security_metrics_history table
CREATE TABLE IF NOT EXISTS security_metrics_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_type text NOT NULL CHECK (metric_type IN ('score', 'count', 'percentage')),
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create security_recommendations table
CREATE TABLE IF NOT EXISTS security_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('vulnerability', 'configuration', 'policy', 'compliance')),
  priority text NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  title text NOT NULL,
  description text,
  impact text,
  effort text CHECK (effort IN ('low', 'medium', 'high')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'dismissed')),
  assigned_to uuid REFERENCES auth.users(id),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create compliance_checks table
CREATE TABLE IF NOT EXISTS compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  framework text NOT NULL CHECK (framework IN ('NIST', 'ISO27001', 'PCI-DSS', 'HIPAA', 'SOC2')),
  control_id text NOT NULL,
  control_name text NOT NULL,
  control_description text,
  status text DEFAULT 'partial' CHECK (status IN ('pass', 'fail', 'partial', 'not_applicable')),
  evidence text,
  last_checked timestamptz DEFAULT now(),
  next_check_due timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create security_alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('critical_vuln', 'ssl_expiry', 'network_breach', 'compliance_violation')),
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title text NOT NULL,
  message text,
  source text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved')),
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_posture_scores_user_date ON security_posture_scores(user_id, date);
CREATE INDEX IF NOT EXISTS idx_security_metrics_history_user_metric ON security_metrics_history(user_id, metric_name);
CREATE INDEX IF NOT EXISTS idx_security_metrics_history_recorded_at ON security_metrics_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_security_recommendations_user_status ON security_recommendations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_security_recommendations_priority ON security_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_user_framework ON compliance_checks(user_id, framework);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_status ON compliance_checks(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user_status ON security_alerts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);

-- Enable Row Level Security
ALTER TABLE security_posture_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security_posture_scores
CREATE POLICY "Users can view own security posture scores"
  ON security_posture_scores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own security posture scores"
  ON security_posture_scores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own security posture scores"
  ON security_posture_scores FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own security posture scores"
  ON security_posture_scores FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for security_metrics_history
CREATE POLICY "Users can view own security metrics history"
  ON security_metrics_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own security metrics history"
  ON security_metrics_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own security metrics history"
  ON security_metrics_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own security metrics history"
  ON security_metrics_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for security_recommendations
CREATE POLICY "Users can view own security recommendations"
  ON security_recommendations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own security recommendations"
  ON security_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own security recommendations"
  ON security_recommendations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own security recommendations"
  ON security_recommendations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for compliance_checks
CREATE POLICY "Users can view own compliance checks"
  ON compliance_checks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own compliance checks"
  ON compliance_checks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own compliance checks"
  ON compliance_checks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own compliance checks"
  ON compliance_checks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for security_alerts
CREATE POLICY "Users can view own security alerts"
  ON security_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own security alerts"
  ON security_alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own security alerts"
  ON security_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own security alerts"
  ON security_alerts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);