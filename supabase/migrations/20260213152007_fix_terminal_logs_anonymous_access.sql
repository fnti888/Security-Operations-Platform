/*
  # Fix Terminal Logs Anonymous Access

  ## Problem
  The Dashboard was failing to render because terminal_logs table only allowed
  authenticated users to insert logs. However, the application logs terminal
  messages even when users are not authenticated, causing RLS violations.

  ## Changes
  1. Security
    - Add policy allowing anonymous users to insert logs with NULL user_id
    - Keep existing policy for authenticated users
    - Both policies ensure data integrity

  ## Notes
  Terminal logs are system-generated messages and don't contain sensitive data.
  Allowing anonymous logging enables the Dashboard to function for all visitors.
*/

-- Allow anonymous users to insert terminal logs with NULL user_id
DROP POLICY IF EXISTS "Anonymous can insert system logs" ON terminal_logs;
CREATE POLICY "Anonymous can insert system logs"
  ON terminal_logs FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Allow anonymous and authenticated users to insert into user_activity
DROP POLICY IF EXISTS "Anonymous can insert activity" ON user_activity;
DROP POLICY IF EXISTS "Anonymous users can log activity" ON user_activity;
CREATE POLICY "Anonymous users can log activity"
  ON user_activity FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Allow anonymous and authenticated users to insert into system_metrics
DROP POLICY IF EXISTS "Anyone can insert system metrics" ON system_metrics;
CREATE POLICY "Anyone can insert system metrics"
  ON system_metrics FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);