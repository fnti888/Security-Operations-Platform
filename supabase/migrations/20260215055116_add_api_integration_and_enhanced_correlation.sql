/*
  # API Integration and Enhanced Correlation System

  ## Overview
  Adds real threat intelligence API integration and sophisticated alert correlation engine.

  ## New Tables
  
  ### `api_credentials`
  Stores API keys for external threat intelligence services (AbuseIPDB, VirusTotal, etc.)
  
  ### `threat_intel_cache`
  Caches threat intelligence data to minimize API calls and improve performance
  
  ### `correlation_rules_v2`
  Enhanced correlation rules with sophisticated conditions and patterns
  
  ### `incident_correlations`
  Tracks correlated incidents and attack chains

  ## Security
  - All tables have RLS enabled with proper access controls
  - API keys are stored per-user for security
  - Threat intelligence cache is shared for efficiency
*/

-- API Credentials Table
CREATE TABLE IF NOT EXISTS api_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_name text NOT NULL,
  api_key text NOT NULL,
  is_active boolean DEFAULT true,
  rate_limit integer DEFAULT 1000,
  requests_today integer DEFAULT 0,
  last_reset timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, service_name)
);

ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own API credentials" ON api_credentials;
CREATE POLICY "Users can view own API credentials"
  ON api_credentials FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own API credentials" ON api_credentials;
CREATE POLICY "Users can insert own API credentials"
  ON api_credentials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own API credentials" ON api_credentials;
CREATE POLICY "Users can update own API credentials"
  ON api_credentials FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own API credentials" ON api_credentials;
CREATE POLICY "Users can delete own API credentials"
  ON api_credentials FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Threat Intelligence Cache Table
CREATE TABLE IF NOT EXISTS threat_intel_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator text NOT NULL,
  indicator_type text NOT NULL,
  source text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  confidence_score integer DEFAULT 0,
  threat_level text DEFAULT 'unknown',
  tags text[] DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_threat_intel_indicator ON threat_intel_cache(indicator);
CREATE INDEX IF NOT EXISTS idx_threat_intel_expires ON threat_intel_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_threat_intel_source ON threat_intel_cache(source);

ALTER TABLE threat_intel_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated users can read threat intel cache" ON threat_intel_cache;
CREATE POLICY "All authenticated users can read threat intel cache"
  ON threat_intel_cache FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "System can manage threat intel cache" ON threat_intel_cache;
CREATE POLICY "System can manage threat intel cache"
  ON threat_intel_cache FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Enhanced Correlation Rules Table
CREATE TABLE IF NOT EXISTS correlation_rules_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  rule_type text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}',
  time_window interval DEFAULT '1 hour',
  min_events integer DEFAULT 3,
  severity text DEFAULT 'medium',
  mitre_tactics text[] DEFAULT '{}',
  mitre_techniques text[] DEFAULT '{}',
  is_enabled boolean DEFAULT true,
  false_positive_rate numeric DEFAULT 0.0,
  detection_count integer DEFAULT 0,
  last_triggered timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_correlation_rules_v2_type ON correlation_rules_v2(rule_type);
CREATE INDEX IF NOT EXISTS idx_correlation_rules_v2_enabled ON correlation_rules_v2(is_enabled);

ALTER TABLE correlation_rules_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated users can read correlation rules v2" ON correlation_rules_v2;
CREATE POLICY "All authenticated users can read correlation rules v2"
  ON correlation_rules_v2 FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create correlation rules v2" ON correlation_rules_v2;
CREATE POLICY "Authenticated users can create correlation rules v2"
  ON correlation_rules_v2 FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

DROP POLICY IF EXISTS "Users can update correlation rules v2" ON correlation_rules_v2;
CREATE POLICY "Users can update correlation rules v2"
  ON correlation_rules_v2 FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR created_by IS NULL)
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

-- Incident Correlations Table
CREATE TABLE IF NOT EXISTS incident_correlations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_rule_id uuid REFERENCES correlation_rules_v2(id),
  incident_ids uuid[] NOT NULL DEFAULT '{}',
  severity text NOT NULL,
  title text NOT NULL,
  description text,
  event_count integer DEFAULT 0,
  confidence_score integer DEFAULT 0,
  attack_chain jsonb DEFAULT '[]',
  mitre_tactics text[] DEFAULT '{}',
  mitre_techniques text[] DEFAULT '{}',
  affected_assets text[] DEFAULT '{}',
  indicators jsonb DEFAULT '{}',
  first_seen timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  status text DEFAULT 'open',
  assigned_to uuid REFERENCES auth.users(id),
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incident_correlations_status ON incident_correlations(status);
CREATE INDEX IF NOT EXISTS idx_incident_correlations_severity ON incident_correlations(severity);
CREATE INDEX IF NOT EXISTS idx_incident_correlations_rule ON incident_correlations(correlation_rule_id);

ALTER TABLE incident_correlations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated users can read incident correlations" ON incident_correlations;
CREATE POLICY "All authenticated users can read incident correlations"
  ON incident_correlations FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create incident correlations" ON incident_correlations;
CREATE POLICY "Authenticated users can create incident correlations"
  ON incident_correlations FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update incident correlations" ON incident_correlations;
CREATE POLICY "Authenticated users can update incident correlations"
  ON incident_correlations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default enhanced correlation rules
INSERT INTO correlation_rules_v2 (name, description, rule_type, conditions, time_window, min_events, severity, mitre_tactics, mitre_techniques, is_enabled, created_by)
VALUES
  (
    'Brute Force Authentication Attack',
    'Detects multiple failed login attempts from the same source IP',
    'authentication',
    '{"event_type": "authentication", "result": "failure", "group_by": "source_ip"}',
    '15 minutes',
    5,
    'high',
    ARRAY['TA0006'],
    ARRAY['T1110'],
    true,
    NULL
  ),
  (
    'Network Port Scanning',
    'Identifies port scanning activity through rapid connection attempts',
    'reconnaissance',
    '{"event_type": "connection_attempt", "group_by": "source_ip", "unique_field": "destination_port", "distinct_count_threshold": 10}',
    '5 minutes',
    10,
    'high',
    ARRAY['TA0043'],
    ARRAY['T1046'],
    true,
    NULL
  ),
  (
    'Command and Control Beaconing',
    'Detects periodic C2 communication patterns indicating malware',
    'command_control',
    '{"event_type": "outbound_connection", "pattern": "periodic", "interval_variance": 0.15, "min_occurrences": 4}',
    '1 hour',
    4,
    'critical',
    ARRAY['TA0011'],
    ARRAY['T1071', 'T1095'],
    true,
    NULL
  ),
  (
    'Large Data Exfiltration',
    'Identifies unusually large outbound data transfers',
    'exfiltration',
    '{"event_type": "data_transfer", "direction": "outbound", "threshold_bytes": 104857600, "unusual_destination": true}',
    '30 minutes',
    3,
    'critical',
    ARRAY['TA0010'],
    ARRAY['T1041', 'T1048'],
    true,
    NULL
  ),
  (
    'Privilege Escalation Pattern',
    'Detects multiple privilege escalation attempts',
    'privilege_escalation',
    '{"event_type": "privilege_change", "result": "denied", "group_by": "user"}',
    '10 minutes',
    3,
    'high',
    ARRAY['TA0004'],
    ARRAY['T1068', 'T1078'],
    true,
    NULL
  ),
  (
    'Lateral Movement Detection',
    'Identifies lateral movement across network hosts',
    'lateral_movement',
    '{"event_type": "remote_connection", "group_by": "source_host", "unique_field": "destination_host", "min_unique_destinations": 5}',
    '1 hour',
    5,
    'high',
    ARRAY['TA0008'],
    ARRAY['T1021', 'T1570'],
    true,
    NULL
  ),
  (
    'Suspicious Process Execution Chain',
    'Detects unusual process execution patterns',
    'execution',
    '{"event_type": "process_creation", "suspicious_paths": ["/tmp/", "\\\\Windows\\\\Temp\\\\"], "suspicious_names": ["cmd.exe", "powershell.exe", "bash"], "group_by": "parent_process"}',
    '15 minutes',
    3,
    'medium',
    ARRAY['TA0002'],
    ARRAY['T1059'],
    true,
    NULL
  ),
  (
    'Credential Dumping Attempt',
    'Detects attempts to dump credentials from system',
    'credential_access',
    '{"event_type": "file_access", "target_files": ["SAM", "SYSTEM", "SECURITY", "/etc/shadow", "/etc/passwd"]}',
    '10 minutes',
    2,
    'critical',
    ARRAY['TA0006'],
    ARRAY['T1003'],
    true,
    NULL
  ),
  (
    'Ransomware Behavior Pattern',
    'Identifies file encryption patterns typical of ransomware',
    'impact',
    '{"event_type": "file_modification", "rapid_changes": true, "extension_changes": true, "threshold_files": 50}',
    '5 minutes',
    50,
    'critical',
    ARRAY['TA0040'],
    ARRAY['T1486'],
    true,
    NULL
  ),
  (
    'Web Application Attack',
    'Detects web application attack patterns',
    'initial_access',
    '{"event_type": "web_request", "suspicious_patterns": ["union select", "../", "script>", "eval("], "group_by": "source_ip"}',
    '20 minutes',
    10,
    'high',
    ARRAY['TA0001'],
    ARRAY['T1190'],
    true,
    NULL
  )
ON CONFLICT DO NOTHING;

-- Function to clean expired threat intelligence cache
CREATE OR REPLACE FUNCTION clean_expired_threat_intel_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM threat_intel_cache
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to reset API rate limits
CREATE OR REPLACE FUNCTION reset_api_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE api_credentials
  SET requests_today = 0,
      last_reset = now()
  WHERE last_reset < now() - interval '1 day';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Function to increment API request count
CREATE OR REPLACE FUNCTION increment_api_requests(p_user_id uuid, p_service_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_requests integer;
  current_limit integer;
BEGIN
  SELECT requests_today, rate_limit
  INTO current_requests, current_limit
  FROM api_credentials
  WHERE user_id = p_user_id AND service_name = p_service_name AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  IF current_requests >= current_limit THEN
    RETURN false;
  END IF;
  
  UPDATE api_credentials
  SET requests_today = requests_today + 1,
      updated_at = now()
  WHERE user_id = p_user_id AND service_name = p_service_name;
  
  RETURN true;
END;
$$;