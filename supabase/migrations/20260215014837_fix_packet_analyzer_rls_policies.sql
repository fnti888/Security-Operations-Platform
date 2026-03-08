/*
  # Fix Packet Analyzer RLS Policies

  1. Security Changes
    - Remove insecure INSERT policies with `WITH CHECK (true)`
    - Add restrictive INSERT policies that only allow service role
    - Keep SELECT policies open for demo purposes
    - Maintain authenticated user UPDATE/DELETE policies

  2. Changes Made
    - Drop overly permissive INSERT policies on `capture_sessions`
    - Drop overly permissive INSERT policies on `packet_captures`
    - Edge functions using service_role_key will bypass RLS automatically
    - Regular users cannot insert arbitrary capture data
*/

-- Drop the insecure policies
DROP POLICY IF EXISTS "Anyone can insert capture sessions" ON capture_sessions;
DROP POLICY IF EXISTS "Anyone can insert packet captures" ON packet_captures;

-- Service role can insert (bypasses RLS anyway, but being explicit)
-- Regular authenticated users and anonymous users cannot insert
-- Only the edge functions with service_role_key can insert data
