/*
  # Active Threats Monitoring System

  1. New Tables
    - `active_threats`
      - `id` (uuid, primary key)
      - `threat_type` (text) - Type of threat (Malware, DDoS, Intrusion, etc.)
      - `severity` (text) - Threat severity (LOW, MEDIUM, HIGH, CRITICAL)
      - `source_country` (text) - Source country code
      - `target` (text) - Target system/endpoint
      - `status` (text) - Status (active, mitigating, resolved)
      - `detected_at` (timestamptz) - When threat was detected
      - `resolved_at` (timestamptz) - When threat was resolved
      - `updated_at` (timestamptz) - Last update
    
    - `threat_stats`
      - `id` (uuid, primary key)
      - `total_active` (integer) - Current active threats
      - `total_mitigating` (integer) - Threats being mitigated
      - `total_resolved_today` (integer) - Resolved today
      - `critical_count` (integer) - Critical severity count
      - `high_count` (integer) - High severity count
      - `medium_count` (integer) - Medium severity count
      - `low_count` (integer) - Low severity count
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Allow public read access for monitoring
  
  3. Functions
    - Auto-update threat stats on changes
*/

-- Create active threats table
CREATE TABLE IF NOT EXISTS active_threats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_type text NOT NULL,
  severity text NOT NULL,
  source_country text NOT NULL,
  target text NOT NULL,
  status text DEFAULT 'active',
  detected_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Create threat stats table
CREATE TABLE IF NOT EXISTS threat_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_active integer DEFAULT 0,
  total_mitigating integer DEFAULT 0,
  total_resolved_today integer DEFAULT 0,
  critical_count integer DEFAULT 0,
  high_count integer DEFAULT 0,
  medium_count integer DEFAULT 0,
  low_count integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE active_threats ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_stats ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to active threats"
  ON active_threats
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to threat stats"
  ON threat_stats
  FOR SELECT
  TO public
  USING (true);

-- Insert initial stats row
INSERT INTO threat_stats (total_active, total_mitigating, total_resolved_today, critical_count, high_count, medium_count, low_count)
VALUES (0, 0, 0, 0, 0, 0, 0)
ON CONFLICT DO NOTHING;

-- Function to update threat stats
CREATE OR REPLACE FUNCTION update_threat_stats()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE threat_stats
  SET 
    total_active = (SELECT COUNT(*) FROM active_threats WHERE status = 'active'),
    total_mitigating = (SELECT COUNT(*) FROM active_threats WHERE status = 'mitigating'),
    total_resolved_today = (SELECT COUNT(*) FROM active_threats WHERE status = 'resolved' AND resolved_at >= CURRENT_DATE),
    critical_count = (SELECT COUNT(*) FROM active_threats WHERE status = 'active' AND severity = 'CRITICAL'),
    high_count = (SELECT COUNT(*) FROM active_threats WHERE status = 'active' AND severity = 'HIGH'),
    medium_count = (SELECT COUNT(*) FROM active_threats WHERE status = 'active' AND severity = 'MEDIUM'),
    low_count = (SELECT COUNT(*) FROM active_threats WHERE status = 'active' AND severity = 'LOW'),
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create triggers for threat updates
DROP TRIGGER IF EXISTS on_threat_insert_update_stats ON active_threats;
CREATE TRIGGER on_threat_insert_update_stats
  AFTER INSERT ON active_threats
  FOR EACH ROW
  EXECUTE FUNCTION update_threat_stats();

DROP TRIGGER IF EXISTS on_threat_update_update_stats ON active_threats;
CREATE TRIGGER on_threat_update_update_stats
  AFTER UPDATE ON active_threats
  FOR EACH ROW
  EXECUTE FUNCTION update_threat_stats();

DROP TRIGGER IF EXISTS on_threat_delete_update_stats ON active_threats;
CREATE TRIGGER on_threat_delete_update_stats
  AFTER DELETE ON active_threats
  FOR EACH ROW
  EXECUTE FUNCTION update_threat_stats();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_active_threats_status ON active_threats(status);
CREATE INDEX IF NOT EXISTS idx_active_threats_severity ON active_threats(severity);
CREATE INDEX IF NOT EXISTS idx_active_threats_detected_at ON active_threats(detected_at DESC);
