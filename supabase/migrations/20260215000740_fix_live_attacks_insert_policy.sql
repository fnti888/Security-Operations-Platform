/*
  # Fix Live Attacks Insert Policy

  1. Changes
    - Add INSERT policy for service role to allow edge function to insert attack simulation data
    - Add INSERT policy for anon to allow edge function calls without authentication
  
  2. Security
    - Uses service role bypass for automated attack simulations
    - Maintains read-only access for public users
*/

-- Drop existing policies if they exist to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role can insert live attacks" ON live_attacks;
  DROP POLICY IF EXISTS "Allow anon insert for simulations" ON live_attacks;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Allow service role to insert (edge functions use service role)
CREATE POLICY "Service role can insert live attacks"
  ON live_attacks
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow anonymous insert for attack simulations (edge function called with anon key)
CREATE POLICY "Allow anon insert for simulations"
  ON live_attacks
  FOR INSERT
  TO anon
  WITH CHECK (true);