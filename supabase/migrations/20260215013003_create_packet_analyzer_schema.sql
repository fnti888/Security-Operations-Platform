/*
  # Create Packet Analyzer Schema

  1. New Tables
    - `packet_captures`
      - `id` (uuid, primary key)
      - `session_id` (uuid) - Groups packets into capture sessions
      - `packet_number` (integer) - Packet sequence number
      - `timestamp` (timestamptz) - Capture timestamp
      - `source_ip` (text) - Source IP address
      - `dest_ip` (text) - Destination IP address
      - `source_port` (integer) - Source port
      - `dest_port` (integer) - Destination port
      - `protocol` (text) - Protocol (TCP, UDP, ICMP, etc.)
      - `length` (integer) - Packet length in bytes
      - `info` (text) - Packet info/summary
      - `hex_data` (text) - Hex dump of packet
      - `decoded_layers` (jsonb) - Decoded protocol layers
      - `flags` (text[]) - TCP flags or other protocol flags
      - `created_at` (timestamptz)
      - `user_id` (uuid) - Optional user association

    - `capture_sessions`
      - `id` (uuid, primary key)
      - `name` (text) - Session name
      - `filter` (text) - Capture filter applied
      - `packet_count` (integer) - Total packets captured
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `status` (text) - running, stopped, completed
      - `user_id` (uuid) - Optional user association
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Allow anonymous read access for demo purposes
    - Allow authenticated users to manage their own captures
*/

CREATE TABLE IF NOT EXISTS capture_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  filter text DEFAULT '',
  packet_count integer DEFAULT 0,
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  status text DEFAULT 'running',
  user_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS packet_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES capture_sessions(id) ON DELETE CASCADE,
  packet_number integer NOT NULL,
  timestamp timestamptz DEFAULT now(),
  source_ip text NOT NULL,
  dest_ip text NOT NULL,
  source_port integer,
  dest_port integer,
  protocol text NOT NULL,
  length integer NOT NULL,
  info text,
  hex_data text,
  decoded_layers jsonb DEFAULT '{}',
  flags text[] DEFAULT '{}',
  user_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_packet_captures_session ON packet_captures(session_id);
CREATE INDEX IF NOT EXISTS idx_packet_captures_timestamp ON packet_captures(timestamp);
CREATE INDEX IF NOT EXISTS idx_packet_captures_protocol ON packet_captures(protocol);
CREATE INDEX IF NOT EXISTS idx_capture_sessions_user ON capture_sessions(user_id);

ALTER TABLE capture_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE packet_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view capture sessions"
  ON capture_sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view packet captures"
  ON packet_captures FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert capture sessions"
  ON capture_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert packet captures"
  ON packet_captures FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own capture sessions"
  ON capture_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own capture sessions"
  ON capture_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);