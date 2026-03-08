/*
  # Enhanced IP Score System - Advanced Features

  ## Overview
  This migration adds comprehensive features to transform IP Score into a 10/10 threat intelligence platform.

  ## New Tables

  ### 1. ip_reputation_cache
  - Caches IP lookup results to improve performance
  - Auto-expires after 24 hours
  - Reduces API calls for frequently checked IPs
  
  ### 2. ip_reputation_trends
  - Tracks historical reputation changes
  - Enables trend analysis and pattern detection
  - Powers reputation timeline visualization
  
  ### 3. ip_batch_scans
  - Manages bulk IP scanning operations
  - Tracks scan progress and results
  - Enables enterprise-scale IP analysis
  
  ### 4. ip_comparisons
  - Stores side-by-side IP comparisons
  - Facilitates threat correlation analysis
  
  ### 5. ip_alerts
  - User-configurable alert rules
  - Triggers notifications for high-risk IPs
  - Supports custom thresholds and conditions
  
  ### 6. ip_alert_history
  - Logs all triggered alerts
  - Audit trail for security events
  
  ### 7. ip_whois_cache
  - Caches WHOIS data for IPs
  - Enriches threat intelligence
  
  ## Security
  - All tables have RLS enabled
  - Policies restrict access to authenticated users
  - Anonymous users can perform lookups but not access history
  - Alert system ensures users only see their own alerts

  ## Performance
  - Indexes on frequently queried columns
  - Cached data reduces external API calls
  - Efficient batch processing
*/

-- IP Reputation Cache Table
CREATE TABLE IF NOT EXISTS ip_reputation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text UNIQUE NOT NULL,
  score int NOT NULL,
  risk_level text NOT NULL,
  is_vpn boolean DEFAULT false,
  is_proxy boolean DEFAULT false,
  is_tor boolean DEFAULT false,
  is_hosting boolean DEFAULT false,
  country text,
  country_code text,
  city text,
  region text,
  isp text,
  asn text,
  organization text,
  timezone text,
  latitude numeric,
  longitude numeric,
  abuse_score numeric DEFAULT 0,
  blacklists jsonb DEFAULT '[]'::jsonb,
  threat_types jsonb DEFAULT '[]'::jsonb,
  scan_metadata jsonb DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_reputation_cache_ip ON ip_reputation_cache(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_reputation_cache_expires ON ip_reputation_cache(expires_at);

-- IP Reputation Trends Table
CREATE TABLE IF NOT EXISTS ip_reputation_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  score int NOT NULL,
  risk_level text NOT NULL,
  abuse_score numeric DEFAULT 0,
  is_vpn boolean DEFAULT false,
  is_proxy boolean DEFAULT false,
  is_tor boolean DEFAULT false,
  threat_types jsonb DEFAULT '[]'::jsonb,
  blacklists jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ip_reputation_trends_ip ON ip_reputation_trends(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_reputation_trends_recorded_at ON ip_reputation_trends(recorded_at);

-- Batch Scans Table
CREATE TABLE IF NOT EXISTS ip_batch_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  total_ips int DEFAULT 0,
  completed_ips int DEFAULT 0,
  failed_ips int DEFAULT 0,
  high_risk_count int DEFAULT 0,
  medium_risk_count int DEFAULT 0,
  low_risk_count int DEFAULT 0,
  results jsonb DEFAULT '[]'::jsonb,
  error_log jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ip_batch_scans_created_by ON ip_batch_scans(created_by);
CREATE INDEX IF NOT EXISTS idx_ip_batch_scans_status ON ip_batch_scans(status);

-- IP Comparisons Table
CREATE TABLE IF NOT EXISTS ip_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  ip_addresses text[] NOT NULL,
  comparison_data jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_comparisons_created_by ON ip_comparisons(created_by);

-- IP Alerts Table
CREATE TABLE IF NOT EXISTS ip_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  enabled boolean DEFAULT true,
  conditions jsonb NOT NULL,
  notification_methods jsonb DEFAULT '["in_app"]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_alerts_created_by ON ip_alerts(created_by);
CREATE INDEX IF NOT EXISTS idx_ip_alerts_enabled ON ip_alerts(enabled);

-- IP Alert History Table
CREATE TABLE IF NOT EXISTS ip_alert_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES ip_alerts(id) ON DELETE CASCADE NOT NULL,
  ip_address text NOT NULL,
  alert_data jsonb NOT NULL,
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_alert_history_alert_id ON ip_alert_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_ip_alert_history_created_by ON ip_alert_history(created_by);
CREATE INDEX IF NOT EXISTS idx_ip_alert_history_acknowledged ON ip_alert_history(acknowledged);

-- WHOIS Cache Table
CREATE TABLE IF NOT EXISTS ip_whois_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text UNIQUE NOT NULL,
  whois_data jsonb NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_whois_cache_ip ON ip_whois_cache(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_whois_cache_expires ON ip_whois_cache(expires_at);

-- Enable RLS
ALTER TABLE ip_reputation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_reputation_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_batch_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_whois_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ip_reputation_cache
CREATE POLICY "Anyone can read cached IP reputation data"
  ON ip_reputation_cache FOR SELECT
  TO authenticated, anon
  USING (expires_at > now());

CREATE POLICY "Anyone can insert cached IP reputation data"
  ON ip_reputation_cache FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update cached IP reputation data"
  ON ip_reputation_cache FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- RLS Policies for ip_reputation_trends
CREATE POLICY "Users can read their own IP reputation trends"
  ON ip_reputation_trends FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can insert IP reputation trends"
  ON ip_reputation_trends FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- RLS Policies for ip_batch_scans
CREATE POLICY "Users can read their own batch scans"
  ON ip_batch_scans FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can insert batch scans"
  ON ip_batch_scans FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own batch scans"
  ON ip_batch_scans FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own batch scans"
  ON ip_batch_scans FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for ip_comparisons
CREATE POLICY "Users can read their own IP comparisons"
  ON ip_comparisons FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can insert IP comparisons"
  ON ip_comparisons FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own IP comparisons"
  ON ip_comparisons FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for ip_alerts
CREATE POLICY "Users can read their own IP alerts"
  ON ip_alerts FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can insert IP alerts"
  ON ip_alerts FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own IP alerts"
  ON ip_alerts FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own IP alerts"
  ON ip_alerts FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for ip_alert_history
CREATE POLICY "Users can read their own IP alert history"
  ON ip_alert_history FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can insert IP alert history"
  ON ip_alert_history FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own IP alert history"
  ON ip_alert_history FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- RLS Policies for ip_whois_cache
CREATE POLICY "Anyone can read cached WHOIS data"
  ON ip_whois_cache FOR SELECT
  TO authenticated, anon
  USING (expires_at > now());

CREATE POLICY "Anyone can insert cached WHOIS data"
  ON ip_whois_cache FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_ip_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM ip_reputation_cache WHERE expires_at < now();
  DELETE FROM ip_whois_cache WHERE expires_at < now();
END;
$$;