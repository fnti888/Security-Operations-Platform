/*
  # SSL/TLS Analyzer Schema

  ## Overview
  Complete SSL/TLS certificate analysis and monitoring system for detecting weak encryption configurations and certificate issues.

  ## New Tables

  ### 1. `ssl_scans`
  Tracks SSL/TLS scan jobs
  - `id` (uuid, primary key) - Unique scan identifier
  - `user_id` (uuid, foreign key) - User who initiated the scan
  - `scan_name` (text) - Descriptive name for the scan
  - `target_host` (text) - Target hostname or IP
  - `target_port` (integer) - Target port (default 443)
  - `status` (text) - 'queued', 'scanning', 'completed', 'failed'
  - `started_at` (timestamptz) - Scan start time
  - `completed_at` (timestamptz) - Scan completion time
  - `error_message` (text) - Error details if scan failed
  - `created_at` (timestamptz) - Record creation timestamp

  ### 2. `ssl_certificates`
  SSL/TLS certificate information
  - `id` (uuid, primary key) - Unique certificate record
  - `scan_id` (uuid, foreign key) - Parent scan
  - `user_id` (uuid, foreign key) - Owner
  - `host` (text) - Target host
  - `port` (integer) - Target port
  - `subject` (text) - Certificate subject (CN)
  - `issuer` (text) - Certificate issuer
  - `serial_number` (text) - Certificate serial number
  - `valid_from` (timestamptz) - Certificate validity start date
  - `valid_to` (timestamptz) - Certificate validity end date
  - `days_until_expiry` (integer) - Days until certificate expires
  - `is_expired` (boolean) - Certificate is expired
  - `is_self_signed` (boolean) - Self-signed certificate
  - `is_wildcard` (boolean) - Wildcard certificate
  - `signature_algorithm` (text) - Signature algorithm used
  - `key_type` (text) - Key type (RSA, ECC, etc.)
  - `key_size` (integer) - Key size in bits
  - `san_entries` (text[]) - Subject Alternative Names
  - `chain_length` (integer) - Certificate chain length
  - `chain_issues` (text[]) - Certificate chain validation issues
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. `ssl_cipher_suites`
  Supported cipher suites and protocol versions
  - `id` (uuid, primary key) - Unique cipher suite record
  - `scan_id` (uuid, foreign key) - Parent scan
  - `user_id` (uuid, foreign key) - Owner
  - `host` (text) - Target host
  - `port` (integer) - Target port
  - `protocol_version` (text) - SSL/TLS version (SSLv3, TLS1.0, TLS1.1, TLS1.2, TLS1.3)
  - `protocol_enabled` (boolean) - Protocol is enabled
  - `cipher_suite` (text) - Cipher suite name
  - `key_exchange` (text) - Key exchange algorithm
  - `authentication` (text) - Authentication method
  - `encryption` (text) - Encryption algorithm
  - `encryption_bits` (integer) - Encryption key size
  - `mac_algorithm` (text) - MAC algorithm
  - `is_weak` (boolean) - Considered weak/insecure
  - `is_deprecated` (boolean) - Deprecated protocol/cipher
  - `vulnerability_names` (text[]) - Known vulnerabilities (POODLE, BEAST, etc.)
  - `created_at` (timestamptz) - Record creation timestamp

  ### 4. `ssl_vulnerabilities`
  SSL/TLS security issues and vulnerabilities
  - `id` (uuid, primary key) - Unique vulnerability record
  - `scan_id` (uuid, foreign key) - Parent scan
  - `user_id` (uuid, foreign key) - Owner
  - `host` (text) - Target host
  - `port` (integer) - Target port
  - `vulnerability_type` (text) - Type: 'expired_cert', 'weak_cipher', 'deprecated_protocol', 'chain_issue', 'configuration'
  - `title` (text) - Vulnerability title
  - `description` (text) - Detailed description
  - `severity` (text) - 'critical', 'high', 'medium', 'low', 'info'
  - `remediation` (text) - How to fix the issue
  - `cve_ids` (text[]) - Related CVE identifiers
  - `status` (text) - 'open', 'acknowledged', 'remediated', 'false_positive'
  - `detected_at` (timestamptz) - When vulnerability was found
  - `created_at` (timestamptz) - Record creation timestamp

  ### 5. `ssl_grade_scores`
  Overall SSL/TLS security grade per host
  - `id` (uuid, primary key) - Unique grade record
  - `scan_id` (uuid, foreign key) - Parent scan
  - `user_id` (uuid, foreign key) - Owner
  - `host` (text) - Target host
  - `port` (integer) - Target port
  - `overall_grade` (text) - Overall grade (A+, A, B, C, D, F)
  - `certificate_score` (integer) - Certificate score (0-100)
  - `protocol_score` (integer) - Protocol support score (0-100)
  - `cipher_score` (integer) - Cipher suite score (0-100)
  - `key_exchange_score` (integer) - Key exchange score (0-100)
  - `has_forward_secrecy` (boolean) - Supports forward secrecy
  - `supports_tls13` (boolean) - Supports TLS 1.3
  - `vulnerable_to_downgrade` (boolean) - Vulnerable to protocol downgrade
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - RLS enabled on all tables
  - Users can only access their own SSL/TLS analysis data
  - Separate policies for select, insert, update, delete operations
*/

-- Create ssl_scans table
CREATE TABLE IF NOT EXISTS ssl_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_name text NOT NULL,
  target_host text NOT NULL,
  target_port integer DEFAULT 443,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'scanning', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create ssl_certificates table
CREATE TABLE IF NOT EXISTS ssl_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid REFERENCES ssl_scans(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  host text NOT NULL,
  port integer DEFAULT 443,
  subject text,
  issuer text,
  serial_number text,
  valid_from timestamptz,
  valid_to timestamptz,
  days_until_expiry integer,
  is_expired boolean DEFAULT false,
  is_self_signed boolean DEFAULT false,
  is_wildcard boolean DEFAULT false,
  signature_algorithm text,
  key_type text,
  key_size integer,
  san_entries text[],
  chain_length integer DEFAULT 0,
  chain_issues text[],
  created_at timestamptz DEFAULT now()
);

-- Create ssl_cipher_suites table
CREATE TABLE IF NOT EXISTS ssl_cipher_suites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid REFERENCES ssl_scans(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  host text NOT NULL,
  port integer DEFAULT 443,
  protocol_version text NOT NULL,
  protocol_enabled boolean DEFAULT false,
  cipher_suite text,
  key_exchange text,
  authentication text,
  encryption text,
  encryption_bits integer,
  mac_algorithm text,
  is_weak boolean DEFAULT false,
  is_deprecated boolean DEFAULT false,
  vulnerability_names text[],
  created_at timestamptz DEFAULT now()
);

-- Create ssl_vulnerabilities table
CREATE TABLE IF NOT EXISTS ssl_vulnerabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid REFERENCES ssl_scans(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  host text NOT NULL,
  port integer DEFAULT 443,
  vulnerability_type text NOT NULL CHECK (vulnerability_type IN ('expired_cert', 'weak_cipher', 'deprecated_protocol', 'chain_issue', 'configuration')),
  title text NOT NULL,
  description text,
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  remediation text,
  cve_ids text[],
  status text DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'remediated', 'false_positive')),
  detected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create ssl_grade_scores table
CREATE TABLE IF NOT EXISTS ssl_grade_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid REFERENCES ssl_scans(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  host text NOT NULL,
  port integer DEFAULT 443,
  overall_grade text,
  certificate_score integer DEFAULT 0 CHECK (certificate_score >= 0 AND certificate_score <= 100),
  protocol_score integer DEFAULT 0 CHECK (protocol_score >= 0 AND protocol_score <= 100),
  cipher_score integer DEFAULT 0 CHECK (cipher_score >= 0 AND cipher_score <= 100),
  key_exchange_score integer DEFAULT 0 CHECK (key_exchange_score >= 0 AND key_exchange_score <= 100),
  has_forward_secrecy boolean DEFAULT false,
  supports_tls13 boolean DEFAULT false,
  vulnerable_to_downgrade boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ssl_scans_user_id ON ssl_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_ssl_scans_status ON ssl_scans(status);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_scan_id ON ssl_certificates(scan_id);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_user_id ON ssl_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_host ON ssl_certificates(host);
CREATE INDEX IF NOT EXISTS idx_ssl_cipher_suites_scan_id ON ssl_cipher_suites(scan_id);
CREATE INDEX IF NOT EXISTS idx_ssl_cipher_suites_user_id ON ssl_cipher_suites(user_id);
CREATE INDEX IF NOT EXISTS idx_ssl_vulnerabilities_scan_id ON ssl_vulnerabilities(scan_id);
CREATE INDEX IF NOT EXISTS idx_ssl_vulnerabilities_user_id ON ssl_vulnerabilities(user_id);
CREATE INDEX IF NOT EXISTS idx_ssl_vulnerabilities_severity ON ssl_vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_ssl_grade_scores_scan_id ON ssl_grade_scores(scan_id);
CREATE INDEX IF NOT EXISTS idx_ssl_grade_scores_user_id ON ssl_grade_scores(user_id);

-- Enable Row Level Security
ALTER TABLE ssl_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssl_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssl_cipher_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssl_vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssl_grade_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ssl_scans
CREATE POLICY "Users can view own SSL scans"
  ON ssl_scans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own SSL scans"
  ON ssl_scans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own SSL scans"
  ON ssl_scans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own SSL scans"
  ON ssl_scans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for ssl_certificates
CREATE POLICY "Users can view own SSL certificates"
  ON ssl_certificates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own SSL certificates"
  ON ssl_certificates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own SSL certificates"
  ON ssl_certificates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own SSL certificates"
  ON ssl_certificates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for ssl_cipher_suites
CREATE POLICY "Users can view own SSL cipher suites"
  ON ssl_cipher_suites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own SSL cipher suites"
  ON ssl_cipher_suites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own SSL cipher suites"
  ON ssl_cipher_suites FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own SSL cipher suites"
  ON ssl_cipher_suites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for ssl_vulnerabilities
CREATE POLICY "Users can view own SSL vulnerabilities"
  ON ssl_vulnerabilities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own SSL vulnerabilities"
  ON ssl_vulnerabilities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own SSL vulnerabilities"
  ON ssl_vulnerabilities FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own SSL vulnerabilities"
  ON ssl_vulnerabilities FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for ssl_grade_scores
CREATE POLICY "Users can view own SSL grade scores"
  ON ssl_grade_scores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own SSL grade scores"
  ON ssl_grade_scores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own SSL grade scores"
  ON ssl_grade_scores FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own SSL grade scores"
  ON ssl_grade_scores FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);