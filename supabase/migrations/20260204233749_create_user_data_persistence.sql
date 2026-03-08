/*
  # User Data Persistence & Activity Tracking

  1. New Tables
    - `user_settings` - Store user preferences and theme settings
      - `user_id` (uuid, primary key, references auth.users)
      - `theme_mode` (text) - Selected theme (classic, accessible, midnight, matrix)
      - `reduce_motion` (boolean) - Accessibility preference
      - `notifications_enabled` (boolean) - Email notifications
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `user_activity` - Track user actions and analytics
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - Can be null for anonymous
      - `action_type` (text) - Type of action (login, view_change, export, etc)
      - `view_name` (text) - Which view was accessed
      - `metadata` (jsonb) - Additional data about the action
      - `created_at` (timestamptz) - When action occurred
      - `ip_address` (text) - User IP for security
    
    - `terminal_logs` - Persistent terminal output history
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - Can be null for system
      - `message` (text) - Log message
      - `log_type` (text) - info, success, warning, error
      - `source` (text) - Which component generated the log
      - `created_at` (timestamptz) - Timestamp
    
    - `system_metrics` - Historical system performance data
      - `id` (uuid, primary key)
      - `cpu_usage` (integer) - CPU percentage
      - `memory_usage` (integer) - Memory percentage
      - `network_usage` (integer) - Network percentage
      - `active_threats` (integer) - Current threat count
      - `recorded_at` (timestamptz) - Measurement timestamp
  
  2. Security
    - Enable RLS on all tables
    - Users can read/write their own settings
    - Users can read their own activity
    - Terminal logs are read-only for users
    - System metrics are readable by all authenticated users
*/

-- User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_mode text DEFAULT 'classic' CHECK (theme_mode IN ('classic', 'accessible', 'midnight', 'matrix')),
  reduce_motion boolean DEFAULT false,
  notifications_enabled boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User Activity Table
CREATE TABLE IF NOT EXISTS user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  view_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at DESC);

ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own activity"
  ON user_activity FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert activity"
  ON user_activity FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Terminal Logs Table
CREATE TABLE IF NOT EXISTS terminal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message text NOT NULL,
  log_type text DEFAULT 'info' CHECK (log_type IN ('info', 'success', 'warning', 'error')),
  source text DEFAULT 'system',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_terminal_logs_created_at ON terminal_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_terminal_logs_user_id ON terminal_logs(user_id);

ALTER TABLE terminal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all logs"
  ON terminal_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert logs"
  ON terminal_logs FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- System Metrics Table
CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpu_usage integer DEFAULT 0 CHECK (cpu_usage >= 0 AND cpu_usage <= 100),
  memory_usage integer DEFAULT 0 CHECK (memory_usage >= 0 AND memory_usage <= 100),
  network_usage integer DEFAULT 0 CHECK (network_usage >= 0 AND network_usage <= 100),
  active_threats integer DEFAULT 0,
  recorded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at DESC);

ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read metrics"
  ON system_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert metrics"
  ON system_metrics FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for user_settings
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean old metrics (keep last 24 hours)
CREATE OR REPLACE FUNCTION clean_old_system_metrics()
RETURNS void AS $$
BEGIN
  DELETE FROM system_metrics
  WHERE recorded_at < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean old terminal logs (keep last 7 days)
CREATE OR REPLACE FUNCTION clean_old_terminal_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM terminal_logs
  WHERE created_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;