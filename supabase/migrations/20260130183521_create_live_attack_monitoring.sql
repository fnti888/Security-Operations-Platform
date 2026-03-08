/*
  # Live Attack Monitoring System

  1. New Tables
    - `country_attack_stats`
      - `id` (uuid, primary key)
      - `country_code` (text) - ISO country code
      - `country_name` (text) - Full country name
      - `country_flag` (text) - Flag emoji
      - `total_attacks` (integer) - Total blocked attacks
      - `last_attack_time` (timestamptz) - Last attack timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `live_attacks`
      - `id` (uuid, primary key)
      - `country_code` (text) - Source country
      - `attack_type` (text) - Type of attack
      - `severity` (text) - Attack severity level
      - `blocked` (boolean) - Whether attack was blocked
      - `created_at` (timestamptz) - Attack timestamp
  
  2. Security
    - Enable RLS on both tables
    - Allow public read access (monitoring display)
    - Restrict write access to service role only
  
  3. Functions
    - Trigger to update country stats when new attack is logged
*/

-- Create country attack stats table
CREATE TABLE IF NOT EXISTS country_attack_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL UNIQUE,
  country_name text NOT NULL,
  country_flag text NOT NULL,
  total_attacks integer DEFAULT 0,
  last_attack_time timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create live attacks table
CREATE TABLE IF NOT EXISTS live_attacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  attack_type text NOT NULL,
  severity text NOT NULL,
  blocked boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE country_attack_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_attacks ENABLE ROW LEVEL SECURITY;

-- Allow public read access for monitoring display
CREATE POLICY "Allow public read access to country stats"
  ON country_attack_stats
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to live attacks"
  ON live_attacks
  FOR SELECT
  TO public
  USING (true);

-- Insert initial country data
INSERT INTO country_attack_stats (country_code, country_name, country_flag, total_attacks)
VALUES
  ('CN', 'China', '🇨🇳', 2847),
  ('RU', 'Russia', '🇷🇺', 1923),
  ('US', 'USA', '🇺🇸', 1456),
  ('KP', 'N. Korea', '🇰🇵', 891),
  ('IR', 'Iran', '🇮🇷', 734),
  ('BR', 'Brazil', '🇧🇷', 623),
  ('IN', 'India', '🇮🇳', 512),
  ('VN', 'Vietnam', '🇻🇳', 389)
ON CONFLICT (country_code) DO NOTHING;

-- Function to update country stats when new attack is logged
CREATE OR REPLACE FUNCTION update_country_attack_stats()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE country_attack_stats
  SET 
    total_attacks = total_attacks + 1,
    last_attack_time = NEW.created_at,
    updated_at = now()
  WHERE country_code = NEW.country_code;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_new_attack_update_stats ON live_attacks;
CREATE TRIGGER on_new_attack_update_stats
  AFTER INSERT ON live_attacks
  FOR EACH ROW
  EXECUTE FUNCTION update_country_attack_stats();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_live_attacks_created_at ON live_attacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_attacks_country_code ON live_attacks(country_code);
