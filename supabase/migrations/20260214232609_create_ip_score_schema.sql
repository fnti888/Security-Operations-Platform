/*
  # Create IP Score Schema

  1. New Tables
    - `ip_score_lookups`
      - `id` (uuid, primary key) - Unique identifier for each lookup
      - `ip_address` (text, not null) - The IP address being checked
      - `score` (integer) - Overall reputation score (0-100)
      - `risk_level` (text) - Risk classification (low, medium, high, critical)
      - `is_vpn` (boolean) - Whether IP is from a VPN
      - `is_proxy` (boolean) - Whether IP is a proxy
      - `is_tor` (boolean) - Whether IP is a TOR exit node
      - `is_hosting` (boolean) - Whether IP is from a hosting provider
      - `country` (text) - Country code
      - `city` (text) - City name
      - `isp` (text) - Internet Service Provider
      - `abuse_score` (integer) - Abuse confidence score
      - `blacklists` (jsonb) - Array of blacklists the IP appears on
      - `threat_types` (jsonb) - Array of detected threat types
      - `scan_metadata` (jsonb) - Additional scan information
      - `created_by` (uuid) - User who performed the lookup (nullable for anonymous)
      - `created_at` (timestamptz) - When the lookup was performed

  2. Security
    - Enable RLS on `ip_score_lookups` table
    - Add policies for authenticated users to manage their own lookups
    - Add policy for anonymous users to create lookups (for demo purposes)
    - Add policy for users to view their own lookup history

  3. Indexes
    - Index on `ip_address` for quick lookups
    - Index on `created_by` for user history
    - Index on `created_at` for time-based queries
*/

-- Create ip_score_lookups table
CREATE TABLE IF NOT EXISTS ip_score_lookups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  score integer DEFAULT 0,
  risk_level text DEFAULT 'unknown',
  is_vpn boolean DEFAULT false,
  is_proxy boolean DEFAULT false,
  is_tor boolean DEFAULT false,
  is_hosting boolean DEFAULT false,
  country text,
  city text,
  isp text,
  abuse_score integer DEFAULT 0,
  blacklists jsonb DEFAULT '[]'::jsonb,
  threat_types jsonb DEFAULT '[]'::jsonb,
  scan_metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ip_score_lookups ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create IP score lookups (for demo purposes)
CREATE POLICY "Anyone can create IP score lookups"
  ON ip_score_lookups
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Users can view their own lookups
CREATE POLICY "Users can view own IP score lookups"
  ON ip_score_lookups
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- Policy: Anonymous users can view their recent lookups (last 24 hours)
CREATE POLICY "Anonymous users can view recent lookups"
  ON ip_score_lookups
  FOR SELECT
  TO anon
  USING (created_at > now() - interval '24 hours' AND created_by IS NULL);

-- Policy: Users can delete their own lookups
CREATE POLICY "Users can delete own IP score lookups"
  ON ip_score_lookups
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ip_score_lookups_ip_address ON ip_score_lookups(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_score_lookups_created_by ON ip_score_lookups(created_by);
CREATE INDEX IF NOT EXISTS idx_ip_score_lookups_created_at ON ip_score_lookups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_score_lookups_risk_level ON ip_score_lookups(risk_level);
