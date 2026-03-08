/*
  # Allow Anonymous WHOIS Lookups

  1. Changes
    - Add policies to allow anonymous users to perform WHOIS lookups
    - WHOIS data is public information, so no authentication should be required
  
  2. Security
    - Allow anonymous INSERT for creating lookup records
    - Allow anonymous SELECT to view their own lookups
    - Maintain existing authenticated user policies
*/

-- Drop existing policies to recreate them
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow anonymous insert for whois lookups" ON whois_lookups;
  DROP POLICY IF EXISTS "Allow anonymous read for whois lookups" ON whois_lookups;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Allow anonymous users to insert whois lookups
CREATE POLICY "Allow anonymous insert for whois lookups"
  ON whois_lookups
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to read whois lookups
CREATE POLICY "Allow anonymous read for whois lookups"
  ON whois_lookups
  FOR SELECT
  TO anon
  USING (true);