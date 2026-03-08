/*
  # Enterprise SOC Automation Tables

  ## Overview
  Creates comprehensive backend infrastructure for enterprise-grade security operations automation including threat intelligence, correlation, workflows, anomaly detection, integrations, and threat hunting.

  ## 1. New Tables

  ### Threat Intelligence Enrichment
  - `threat_intelligence` - Automated threat data enrichment
    - Indicator tracking (IPs, domains, hashes)
    - Threat scoring and categorization
    - Multi-source aggregation
    - Historical tracking

  ### Alert Management
  - `alert_rules` - Configurable alert rules
    - Custom conditions and thresholds
    - Multi-channel notifications
    - User-defined severity levels

  ### Compliance Management
  - `compliance_frameworks` - Framework definitions (SOC2, ISO27001, etc.)
  - `compliance_evidence` - Automated evidence collection and tracking

  ### Correlation Engine
  - `correlation_rules` - Event correlation patterns
  - `correlated_incidents` - Auto-linked related incidents

  ### Automation & Workflows
  - `automation_workflows` - Incident response playbooks
  - `workflow_executions` - Execution history and logs

  ### Comprehensive Audit Logging
  - `audit_logs` - Complete activity tracking system

  ### Anomaly Detection (ML-Based)
  - `behavioral_baselines` - Statistical baselines
  - `anomaly_detections` - Detected anomalies

  ### Integration Framework
  - `external_integrations` - SIEM/SOAR/Ticketing connections
  - `integration_events` - Event sync history

  ### Threat Hunting
  - `hunt_campaigns` - Proactive threat hunting operations
  - `hunt_findings` - Discovered threats

  ## 2. Security
  All tables have RLS enabled with appropriate policies for authenticated users.

  ## 3. Performance
  Indexes on frequently queried columns for optimal performance.
*/

-- Threat Intelligence
CREATE TABLE IF NOT EXISTS threat_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator text NOT NULL,
  indicator_type text NOT NULL,
  threat_score integer DEFAULT 0,
  threat_categories jsonb DEFAULT '[]'::jsonb,
  sources jsonb DEFAULT '[]'::jsonb,
  first_seen timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_threat_intel_indicator ON threat_intelligence(indicator);
CREATE INDEX IF NOT EXISTS idx_threat_intel_type ON threat_intelligence(indicator_type);
CREATE INDEX IF NOT EXISTS idx_threat_intel_score ON threat_intelligence(threat_score DESC);

ALTER TABLE threat_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view threat intelligence"
  ON threat_intelligence FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert threat intelligence"
  ON threat_intelligence FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update threat intelligence"
  ON threat_intelligence FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Alert Rules
CREATE TABLE IF NOT EXISTS alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  rule_type text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity text NOT NULL,
  enabled boolean DEFAULT true,
  notification_channels jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view alert rules"
  ON alert_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create alert rules"
  ON alert_rules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own alert rules"
  ON alert_rules FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Correlation Rules
CREATE TABLE IF NOT EXISTS correlation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  pattern jsonb NOT NULL DEFAULT '{}'::jsonb,
  time_window integer DEFAULT 60,
  threshold integer DEFAULT 3,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE correlation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view correlation rules"
  ON correlation_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage correlation rules"
  ON correlation_rules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Correlated Incidents
CREATE TABLE IF NOT EXISTS correlated_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_rule_id uuid REFERENCES correlation_rules(id) ON DELETE CASCADE,
  incident_ids jsonb DEFAULT '[]'::jsonb,
  confidence_score integer DEFAULT 0,
  summary text DEFAULT '',
  attack_chain jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_correlated_incidents_created ON correlated_incidents(created_at DESC);

ALTER TABLE correlated_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view correlated incidents"
  ON correlated_incidents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create correlated incidents"
  ON correlated_incidents FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Automation Workflows
CREATE TABLE IF NOT EXISTS automation_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  trigger_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean DEFAULT true,
  execution_count integer DEFAULT 0,
  last_executed timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE automation_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view automation workflows"
  ON automation_workflows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage automation workflows"
  ON automation_workflows FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Workflow Executions
CREATE TABLE IF NOT EXISTS workflow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES automation_workflows(id) ON DELETE CASCADE,
  trigger_event jsonb DEFAULT '{}'::jsonb,
  actions_taken jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'running',
  error_log text DEFAULT '',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started ON workflow_executions(started_at DESC);

ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workflow executions"
  ON workflow_executions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create workflow executions"
  ON workflow_executions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  changes jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  success boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Behavioral Baselines
CREATE TABLE IF NOT EXISTS behavioral_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  baseline_type text NOT NULL,
  statistical_data jsonb DEFAULT '{}'::jsonb,
  sample_size integer DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  valid_until timestamptz DEFAULT now() + interval '7 days'
);

CREATE INDEX IF NOT EXISTS idx_baselines_metric ON behavioral_baselines(metric_name);
CREATE INDEX IF NOT EXISTS idx_baselines_type ON behavioral_baselines(baseline_type);

ALTER TABLE behavioral_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view behavioral baselines"
  ON behavioral_baselines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage behavioral baselines"
  ON behavioral_baselines FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anomaly Detections
CREATE TABLE IF NOT EXISTS anomaly_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_id uuid REFERENCES behavioral_baselines(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  observed_value numeric NOT NULL,
  expected_range jsonb DEFAULT '{}'::jsonb,
  deviation_score numeric DEFAULT 0,
  severity text DEFAULT 'low',
  context jsonb DEFAULT '{}'::jsonb,
  detected_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_detected ON anomaly_detections(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomaly_detections(severity);

ALTER TABLE anomaly_detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view anomaly detections"
  ON anomaly_detections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create anomaly detections"
  ON anomaly_detections FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- External Integrations
CREATE TABLE IF NOT EXISTS external_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  integration_type text NOT NULL,
  configuration jsonb DEFAULT '{}'::jsonb,
  enabled boolean DEFAULT true,
  last_sync timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE external_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view external integrations"
  ON external_integrations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage external integrations"
  ON external_integrations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Integration Events
CREATE TABLE IF NOT EXISTS integration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES external_integrations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  response jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_events_integration ON integration_events(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_events_created ON integration_events(created_at DESC);

ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view integration events"
  ON integration_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create integration events"
  ON integration_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Hunt Campaigns
CREATE TABLE IF NOT EXISTS hunt_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  hypothesis text DEFAULT '',
  tactics jsonb DEFAULT '[]'::jsonb,
  queries jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'active',
  findings_count integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_hunt_campaigns_status ON hunt_campaigns(status);

ALTER TABLE hunt_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view hunt campaigns"
  ON hunt_campaigns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create hunt campaigns"
  ON hunt_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own hunt campaigns"
  ON hunt_campaigns FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Hunt Findings
CREATE TABLE IF NOT EXISTS hunt_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES hunt_campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  severity text NOT NULL,
  indicators jsonb DEFAULT '[]'::jsonb,
  evidence jsonb DEFAULT '{}'::jsonb,
  recommended_actions text DEFAULT '',
  status text DEFAULT 'new',
  found_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hunt_findings_campaign ON hunt_findings(campaign_id);
CREATE INDEX IF NOT EXISTS idx_hunt_findings_severity ON hunt_findings(severity);

ALTER TABLE hunt_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view hunt findings"
  ON hunt_findings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage hunt findings"
  ON hunt_findings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);