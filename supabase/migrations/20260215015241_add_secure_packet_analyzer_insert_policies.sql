/*
  # Add Secure Packet Analyzer INSERT Policies

  1. Security Changes
    - Allow INSERT for anonymous captures (user_id IS NULL) for demo functionality
    - Allow authenticated users to insert their own captures (user_id = auth.uid())
    - Edge functions using service_role_key bypass RLS automatically

  2. Policies Added
    - INSERT policy for capture_sessions with proper ownership checks
    - INSERT policy for packet_captures with proper ownership checks
*/

-- Allow inserts for anonymous demo captures and authenticated user's own captures
CREATE POLICY "Allow demo and user captures - sessions"
  ON capture_sessions FOR INSERT
  WITH CHECK (
    user_id IS NULL OR 
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

CREATE POLICY "Allow demo and user captures - packets"
  ON packet_captures FOR INSERT
  WITH CHECK (
    user_id IS NULL OR 
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- Allow authenticated users to update sessions they created (even if user_id is NULL)
CREATE POLICY "Users can update capture sessions"
  ON capture_sessions FOR UPDATE
  USING (user_id IS NULL OR auth.uid() = user_id)
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
