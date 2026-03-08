/*
  # Real-Time Forensics Monitoring Schema

  1. New Tables
    - `network_traffic`
      - `id` (uuid, primary key)
      - `source_ip` (text)
      - `destination_ip` (text)
      - `source_port` (integer)
      - `destination_port` (integer)
      - `protocol` (text) - TCP, UDP, ICMP, etc.
      - `packet_size` (integer)
      - `status` (text) - allowed, blocked, suspicious
      - `country` (text)
      - `threat_detected` (boolean)
      - `captured_at` (timestamptz)
    
    - `system_processes`
      - `id` (uuid, primary key)
      - `process_name` (text)
      - `pid` (integer)
      - `username` (text)
      - `cpu_usage` (decimal)
      - `memory_usage` (decimal)
      - `status` (text) - running, stopped, suspicious
      - `command_line` (text)
      - `parent_pid` (integer)
      - `created_at` (timestamptz)
      - `detected_at` (timestamptz)
    
    - `file_events`
      - `id` (uuid, primary key)
      - `file_path` (text)
      - `event_type` (text) - created, modified, deleted, accessed
      - `file_hash` (text)
      - `file_size` (bigint)
      - `username` (text)
      - `process_name` (text)
      - `suspicious` (boolean)
      - `timestamp` (timestamptz)
    
    - `live_events`
      - `id` (uuid, primary key)
      - `event_category` (text) - network, process, file, security, system
      - `event_name` (text)
      - `severity` (text) - critical, high, medium, low, info
      - `description` (text)
      - `metadata` (jsonb)
      - `source_ip` (text)
      - `destination_ip` (text)
      - `username` (text)
      - `automated` (boolean) - whether event was auto-detected
      - `timestamp` (timestamptz)
    
    - `ioc_indicators`
      - `id` (uuid, primary key)
      - `indicator_type` (text) - ip, domain, hash, email, url
      - `indicator_value` (text)
      - `threat_level` (text) - critical, high, medium, low
      - `description` (text)
      - `first_seen` (timestamptz)
      - `last_seen` (timestamptz)
      - `hit_count` (integer)
      - `active` (boolean)

  2. Security
    - Enable RLS on all tables
    - Allow authenticated users to read all forensics data
    - System can insert/update forensics data
*/

-- Create network_traffic table
CREATE TABLE IF NOT EXISTS network_traffic (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ip text NOT NULL,
  destination_ip text NOT NULL,
  source_port integer NOT NULL,
  destination_port integer NOT NULL,
  protocol text NOT NULL,
  packet_size integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'allowed',
  country text,
  threat_detected boolean DEFAULT false,
  captured_at timestamptz DEFAULT now(),
  CONSTRAINT network_status_check CHECK (status IN ('allowed', 'blocked', 'suspicious'))
);

-- Create system_processes table
CREATE TABLE IF NOT EXISTS system_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_name text NOT NULL,
  pid integer NOT NULL,
  username text NOT NULL,
  cpu_usage decimal DEFAULT 0,
  memory_usage decimal DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  command_line text,
  parent_pid integer,
  created_at timestamptz DEFAULT now(),
  detected_at timestamptz DEFAULT now(),
  CONSTRAINT process_status_check CHECK (status IN ('running', 'stopped', 'suspicious'))
);

-- Create file_events table
CREATE TABLE IF NOT EXISTS file_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path text NOT NULL,
  event_type text NOT NULL,
  file_hash text,
  file_size bigint DEFAULT 0,
  username text NOT NULL,
  process_name text,
  suspicious boolean DEFAULT false,
  timestamp timestamptz DEFAULT now(),
  CONSTRAINT file_event_type_check CHECK (event_type IN ('created', 'modified', 'deleted', 'accessed'))
);

-- Create live_events table
CREATE TABLE IF NOT EXISTS live_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_category text NOT NULL,
  event_name text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  source_ip text,
  destination_ip text,
  username text,
  automated boolean DEFAULT true,
  timestamp timestamptz DEFAULT now(),
  CONSTRAINT live_event_category_check CHECK (event_category IN ('network', 'process', 'file', 'security', 'system')),
  CONSTRAINT live_event_severity_check CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info'))
);

-- Create ioc_indicators table
CREATE TABLE IF NOT EXISTS ioc_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_type text NOT NULL,
  indicator_value text NOT NULL,
  threat_level text NOT NULL DEFAULT 'medium',
  description text NOT NULL,
  first_seen timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  hit_count integer DEFAULT 1,
  active boolean DEFAULT true,
  CONSTRAINT ioc_type_check CHECK (indicator_type IN ('ip', 'domain', 'hash', 'email', 'url')),
  CONSTRAINT ioc_threat_level_check CHECK (threat_level IN ('critical', 'high', 'medium', 'low'))
);

-- Enable Row Level Security
ALTER TABLE network_traffic ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ioc_indicators ENABLE ROW LEVEL SECURITY;

-- Policies for network_traffic
CREATE POLICY "Authenticated users can view network traffic"
  ON network_traffic FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert network traffic"
  ON network_traffic FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for system_processes
CREATE POLICY "Authenticated users can view system processes"
  ON system_processes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert system processes"
  ON system_processes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for file_events
CREATE POLICY "Authenticated users can view file events"
  ON file_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert file events"
  ON file_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for live_events
CREATE POLICY "Authenticated users can view live events"
  ON live_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert live events"
  ON live_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for ioc_indicators
CREATE POLICY "Authenticated users can view IOC indicators"
  ON ioc_indicators FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert IOC indicators"
  ON ioc_indicators FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update IOC indicators"
  ON ioc_indicators FOR UPDATE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS network_traffic_captured_at_idx ON network_traffic(captured_at DESC);
CREATE INDEX IF NOT EXISTS network_traffic_threat_idx ON network_traffic(threat_detected);
CREATE INDEX IF NOT EXISTS network_traffic_source_ip_idx ON network_traffic(source_ip);
CREATE INDEX IF NOT EXISTS system_processes_detected_at_idx ON system_processes(detected_at DESC);
CREATE INDEX IF NOT EXISTS file_events_timestamp_idx ON file_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS file_events_suspicious_idx ON file_events(suspicious);
CREATE INDEX IF NOT EXISTS live_events_timestamp_idx ON live_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS live_events_severity_idx ON live_events(severity);
CREATE INDEX IF NOT EXISTS ioc_indicators_active_idx ON ioc_indicators(active);
CREATE INDEX IF NOT EXISTS ioc_indicators_indicator_value_idx ON ioc_indicators(indicator_value);