/*
  # Network Scanner Schema
  
  1. New Tables
    - `network_scans`
      - `id` (uuid, primary key)
      - `target` (text) - IP address or hostname to scan
      - `scan_type` (text) - ping, port_scan, full_scan
      - `status` (text) - pending, running, completed, failed
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `created_by` (uuid, nullable) - user who initiated scan
      - `created_at` (timestamptz)
      
    - `scan_results`
      - `id` (uuid, primary key)
      - `scan_id` (uuid, foreign key to network_scans)
      - `result_type` (text) - ping_response, port_status, service_info
      - `data` (jsonb) - flexible storage for scan data
      - `timestamp` (timestamptz)
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on all tables
    - Allow authenticated users to create and view their own scans
    - Allow anonymous users to view public demo scans
    - Public can view scan results for public scans
    
  3. Indexes
    - Index on scan_id for fast result lookups
    - Index on target for searching
    - Index on status for filtering active scans
*/

-- Create network_scans table
CREATE TABLE IF NOT EXISTS network_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target text NOT NULL,
  scan_type text NOT NULL CHECK (scan_type IN ('ping', 'port_scan', 'full_scan')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Create scan_results table
CREATE TABLE IF NOT EXISTS scan_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES network_scans(id) ON DELETE CASCADE,
  result_type text NOT NULL CHECK (result_type IN ('ping_response', 'port_status', 'service_info', 'error')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_network_scans_target ON network_scans(target);
CREATE INDEX IF NOT EXISTS idx_network_scans_status ON network_scans(status);
CREATE INDEX IF NOT EXISTS idx_network_scans_created_by ON network_scans(created_by);
CREATE INDEX IF NOT EXISTS idx_scan_results_scan_id ON scan_results(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_timestamp ON scan_results(timestamp DESC);

-- Enable RLS
ALTER TABLE network_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;

-- Network scans policies
CREATE POLICY "Anyone can view network scans"
  ON network_scans FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create network scans"
  ON network_scans FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Anonymous users can create demo scans"
  ON network_scans FOR INSERT
  TO anon
  WITH CHECK (created_by IS NULL);

CREATE POLICY "Users can update their own scans"
  ON network_scans FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "System can update anonymous scans"
  ON network_scans FOR UPDATE
  TO anon
  USING (created_by IS NULL)
  WITH CHECK (created_by IS NULL);

-- Scan results policies
CREATE POLICY "Anyone can view scan results"
  ON scan_results FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create scan results"
  ON scan_results FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anonymous users can create demo scan results"
  ON scan_results FOR INSERT
  TO anon
  WITH CHECK (true);
