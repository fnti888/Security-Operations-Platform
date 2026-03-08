/*
  # Fix Insecure RLS Policies

  1. Security Improvements
    - Remove overly permissive `system_metrics` INSERT policy that allows anonymous users with no validation
    - The existing timestamp-validated policy for authenticated users is sufficient
    - Edge functions can use service role key to bypass RLS when needed

  2. Changes
    - DROP the "Anyone can insert system metrics" policy which uses USING (true)
    - Keep the more restrictive policy that validates timestamps
*/

-- Drop the insecure policy that allows anyone to insert system metrics without validation
DROP POLICY IF EXISTS "Anyone can insert system metrics" ON system_metrics;

-- The existing policy with timestamp validation remains:
-- "Authenticated users can insert metrics" with proper timestamp checks
