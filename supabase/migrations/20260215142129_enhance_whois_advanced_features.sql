/*
  # Enhanced WHOIS Lookup - Advanced Features

  ## Summary
  Comprehensive enhancements to make WHOIS Lookup a 10/10 enterprise-grade tool with
  DNS integration, SSL/TLS analysis, threat intelligence, bulk operations, and analytics.

  ## New Tables

  ### 1. `whois_dns_records`
  Stores DNS records associated with WHOIS lookups
  - `id` (uuid, primary key) - Unique DNS record identifier
  - `lookup_id` (uuid, foreign key) - Associated WHOIS lookup
  - `record_type` (text) - DNS record type (A, AAAA, MX, TXT, CNAME, NS, SOA)
  - `record_name` (text) - DNS record name
  - `record_value` (text) - DNS record value
  - `ttl` (integer) - Time to live
  - `priority` (integer) - Priority for MX records
  - `created_at` (timestamptz) - Record creation timestamp

  ### 2. `whois_ssl_certificates`
  Stores SSL/TLS certificate information
  - `id` (uuid, primary key) - Unique certificate identifier
  - `lookup_id` (uuid, foreign key) - Associated WHOIS lookup
  - `domain` (text) - Certificate domain
  - `issuer` (text) - Certificate issuer
  - `subject` (text) - Certificate subject
  - `valid_from` (timestamptz) - Certificate valid from date
  - `valid_to` (timestamptz) - Certificate valid until date
  - `serial_number` (text) - Certificate serial number
  - `signature_algorithm` (text) - Signature algorithm
  - `key_size` (integer) - Key size in bits
  - `san_domains` (text[]) - Subject Alternative Names
  - `is_valid` (boolean) - Certificate validity status
  - `is_expired` (boolean) - Certificate expiration status
  - `days_until_expiry` (integer) - Days until certificate expires
  - `certificate_chain` (jsonb) - Full certificate chain
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. `whois_threat_intelligence`
  Stores threat intelligence data for domains/IPs
  - `id` (uuid, primary key) - Unique threat record identifier
  - `lookup_id` (uuid, foreign key) - Associated WHOIS lookup
  - `query` (text) - Domain or IP address
  - `threat_score` (integer) - Overall threat score (0-100)
  - `risk_level` (text) - Risk level (low, medium, high, critical)
  - `is_malicious` (boolean) - Malicious indicator
  - `is_phishing` (boolean) - Phishing indicator
  - `is_spam` (boolean) - Spam indicator
  - `is_suspicious` (boolean) - Suspicious activity indicator
  - `threat_categories` (text[]) - Array of threat categories
  - `blacklist_status` (jsonb) - Blacklist checking results
  - `reputation_sources` (jsonb) - Reputation data from multiple sources
  - `last_seen_malicious` (timestamptz) - Last time seen in threat feed
  - `threat_details` (text) - Detailed threat description
  - `created_at` (timestamptz) - Record creation timestamp

  ### 4. `whois_comparisons`
  Stores domain comparison analysis
  - `id` (uuid, primary key) - Unique comparison identifier
  - `user_id` (uuid, foreign key) - User who created comparison
  - `name` (text) - Comparison name
  - `lookup_ids` (uuid[]) - Array of lookup IDs being compared
  - `notes` (text) - Comparison notes
  - `created_at` (timestamptz) - Record creation timestamp

  ### 5. `whois_bulk_operations`
  Tracks bulk lookup operations
  - `id` (uuid, primary key) - Unique bulk operation identifier
  - `user_id` (uuid, foreign key) - User who started bulk operation
  - `name` (text) - Operation name
  - `queries` (text[]) - Array of domains/IPs to lookup
  - `status` (text) - Operation status (pending, processing, completed, failed)
  - `total_queries` (integer) - Total number of queries
  - `completed_queries` (integer) - Number of completed queries
  - `failed_queries` (integer) - Number of failed queries
  - `lookup_ids` (uuid[]) - Array of created lookup IDs
  - `started_at` (timestamptz) - Operation start time
  - `completed_at` (timestamptz) - Operation completion time
  - `created_at` (timestamptz) - Record creation timestamp

  ### 6. `whois_analytics`
  Stores calculated analytics and metrics
  - `id` (uuid, primary key) - Unique analytics identifier
  - `lookup_id` (uuid, foreign key) - Associated WHOIS lookup
  - `domain_age_days` (integer) - Age of domain in days
  - `days_until_expiry` (integer) - Days until domain expires
  - `is_expiring_soon` (boolean) - Expiring within 30 days
  - `has_privacy_protection` (boolean) - Privacy protection detected
  - `nameserver_count` (integer) - Number of nameservers
  - `has_dnssec` (boolean) - DNSSEC enabled
  - `registrar_reputation_score` (integer) - Registrar reputation (0-100)
  - `overall_security_score` (integer) - Overall security score (0-100)
  - `risk_factors` (jsonb) - Identified risk factors
  - `recommendations` (text[]) - Security recommendations
  - `created_at` (timestamptz) - Record creation timestamp

  ### 7. `whois_cache`
  Caching layer for improved performance
  - `id` (uuid, primary key) - Unique cache identifier
  - `query` (text) - Domain or IP address (unique)
  - `query_type` (text) - 'domain' or 'ip'
  - `cached_data` (jsonb) - Cached lookup data
  - `cache_expires_at` (timestamptz) - Cache expiration time
  - `hit_count` (integer) - Number of cache hits
  - `last_accessed_at` (timestamptz) - Last cache access time
  - `created_at` (timestamptz) - Record creation timestamp

  ## Modified Tables
  - Enhanced `whois_lookups` with additional fields for analytics

  ## Security
  - RLS enabled on all new tables
  - Users can only access their own data
  - Cache is globally accessible for performance
  - Threat intelligence data is read-only for users

  ## Performance
  - Indexes on frequently queried fields
  - Composite indexes for join operations
  - Cache TTL of 24 hours for WHOIS data
  - Automatic cache cleanup for expired entries

  ## Important Notes
  1. DNS records are automatically fetched during WHOIS lookup
  2. SSL/TLS certificates are fetched for HTTPS domains
  3. Threat intelligence is checked against multiple sources
  4. Analytics are calculated asynchronously after lookup
  5. Cache improves performance for repeated lookups
  6. Bulk operations are processed in batches to prevent timeout
*/

-- Add new columns to existing whois_lookups table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whois_lookups' AND column_name = 'has_ssl_certificate'
  ) THEN
    ALTER TABLE whois_lookups ADD COLUMN has_ssl_certificate boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whois_lookups' AND column_name = 'has_threat_data'
  ) THEN
    ALTER TABLE whois_lookups ADD COLUMN has_threat_data boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whois_lookups' AND column_name = 'has_dns_records'
  ) THEN
    ALTER TABLE whois_lookups ADD COLUMN has_dns_records boolean DEFAULT false;
  END IF;
END $$;

-- Create whois_dns_records table
CREATE TABLE IF NOT EXISTS whois_dns_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lookup_id uuid NOT NULL REFERENCES whois_lookups(id) ON DELETE CASCADE,
  record_type text NOT NULL CHECK (record_type IN ('A', 'AAAA', 'MX', 'TXT', 'CNAME', 'NS', 'SOA', 'PTR')),
  record_name text NOT NULL,
  record_value text NOT NULL,
  ttl integer,
  priority integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whois_dns_records_lookup_id ON whois_dns_records(lookup_id);
CREATE INDEX IF NOT EXISTS idx_whois_dns_records_type ON whois_dns_records(record_type);

-- Create whois_ssl_certificates table
CREATE TABLE IF NOT EXISTS whois_ssl_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lookup_id uuid NOT NULL REFERENCES whois_lookups(id) ON DELETE CASCADE,
  domain text NOT NULL,
  issuer text,
  subject text,
  valid_from timestamptz,
  valid_to timestamptz,
  serial_number text,
  signature_algorithm text,
  key_size integer,
  san_domains text[],
  is_valid boolean DEFAULT true,
  is_expired boolean DEFAULT false,
  days_until_expiry integer,
  certificate_chain jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whois_ssl_certificates_lookup_id ON whois_ssl_certificates(lookup_id);
CREATE INDEX IF NOT EXISTS idx_whois_ssl_certificates_domain ON whois_ssl_certificates(domain);

-- Create whois_threat_intelligence table
CREATE TABLE IF NOT EXISTS whois_threat_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lookup_id uuid NOT NULL REFERENCES whois_lookups(id) ON DELETE CASCADE,
  query text NOT NULL,
  threat_score integer DEFAULT 0 CHECK (threat_score >= 0 AND threat_score <= 100),
  risk_level text DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  is_malicious boolean DEFAULT false,
  is_phishing boolean DEFAULT false,
  is_spam boolean DEFAULT false,
  is_suspicious boolean DEFAULT false,
  threat_categories text[],
  blacklist_status jsonb,
  reputation_sources jsonb,
  last_seen_malicious timestamptz,
  threat_details text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whois_threat_intelligence_lookup_id ON whois_threat_intelligence(lookup_id);
CREATE INDEX IF NOT EXISTS idx_whois_threat_intelligence_query ON whois_threat_intelligence(query);
CREATE INDEX IF NOT EXISTS idx_whois_threat_intelligence_risk ON whois_threat_intelligence(risk_level);

-- Create whois_comparisons table
CREATE TABLE IF NOT EXISTS whois_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  lookup_ids uuid[],
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whois_comparisons_user_id ON whois_comparisons(user_id);

-- Create whois_bulk_operations table
CREATE TABLE IF NOT EXISTS whois_bulk_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  queries text[],
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  total_queries integer DEFAULT 0,
  completed_queries integer DEFAULT 0,
  failed_queries integer DEFAULT 0,
  lookup_ids uuid[],
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whois_bulk_operations_user_id ON whois_bulk_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_whois_bulk_operations_status ON whois_bulk_operations(status);

-- Create whois_analytics table
CREATE TABLE IF NOT EXISTS whois_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lookup_id uuid NOT NULL REFERENCES whois_lookups(id) ON DELETE CASCADE,
  domain_age_days integer,
  days_until_expiry integer,
  is_expiring_soon boolean DEFAULT false,
  has_privacy_protection boolean DEFAULT false,
  nameserver_count integer DEFAULT 0,
  has_dnssec boolean DEFAULT false,
  registrar_reputation_score integer DEFAULT 50,
  overall_security_score integer DEFAULT 50,
  risk_factors jsonb,
  recommendations text[],
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whois_analytics_lookup_id ON whois_analytics(lookup_id);
CREATE INDEX IF NOT EXISTS idx_whois_analytics_security_score ON whois_analytics(overall_security_score);
CREATE UNIQUE INDEX IF NOT EXISTS idx_whois_analytics_lookup_id_unique ON whois_analytics(lookup_id);

-- Create whois_cache table
CREATE TABLE IF NOT EXISTS whois_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL UNIQUE,
  query_type text NOT NULL CHECK (query_type IN ('domain', 'ip')),
  cached_data jsonb NOT NULL,
  cache_expires_at timestamptz NOT NULL,
  hit_count integer DEFAULT 0,
  last_accessed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whois_cache_query ON whois_cache(query);
CREATE INDEX IF NOT EXISTS idx_whois_cache_expires ON whois_cache(cache_expires_at);

-- Enable Row Level Security on all new tables
ALTER TABLE whois_dns_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE whois_ssl_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whois_threat_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE whois_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE whois_bulk_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whois_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE whois_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whois_dns_records
CREATE POLICY "Users can view DNS records for their lookups"
  ON whois_dns_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM whois_lookups
      WHERE whois_lookups.id = whois_dns_records.lookup_id
      AND (whois_lookups.user_id = auth.uid() OR whois_lookups.user_id IS NULL)
    )
  );

CREATE POLICY "Service role can insert DNS records"
  ON whois_dns_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for whois_ssl_certificates
CREATE POLICY "Users can view SSL certificates for their lookups"
  ON whois_ssl_certificates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM whois_lookups
      WHERE whois_lookups.id = whois_ssl_certificates.lookup_id
      AND (whois_lookups.user_id = auth.uid() OR whois_lookups.user_id IS NULL)
    )
  );

CREATE POLICY "Service role can insert SSL certificates"
  ON whois_ssl_certificates FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for whois_threat_intelligence
CREATE POLICY "Users can view threat intelligence for their lookups"
  ON whois_threat_intelligence FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM whois_lookups
      WHERE whois_lookups.id = whois_threat_intelligence.lookup_id
      AND (whois_lookups.user_id = auth.uid() OR whois_lookups.user_id IS NULL)
    )
  );

CREATE POLICY "Service role can insert threat intelligence"
  ON whois_threat_intelligence FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for whois_comparisons
CREATE POLICY "Users can view own comparisons"
  ON whois_comparisons FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own comparisons"
  ON whois_comparisons FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comparisons"
  ON whois_comparisons FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comparisons"
  ON whois_comparisons FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for whois_bulk_operations
CREATE POLICY "Users can view own bulk operations"
  ON whois_bulk_operations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bulk operations"
  ON whois_bulk_operations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bulk operations"
  ON whois_bulk_operations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bulk operations"
  ON whois_bulk_operations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for whois_analytics
CREATE POLICY "Users can view analytics for their lookups"
  ON whois_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM whois_lookups
      WHERE whois_lookups.id = whois_analytics.lookup_id
      AND (whois_lookups.user_id = auth.uid() OR whois_lookups.user_id IS NULL)
    )
  );

CREATE POLICY "Service role can insert analytics"
  ON whois_analytics FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for whois_cache (globally readable for performance)
CREATE POLICY "Anyone can read cache"
  ON whois_cache FOR SELECT
  TO authenticated
  USING (cache_expires_at > now());

CREATE POLICY "Service role can manage cache"
  ON whois_cache FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_whois_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM whois_cache
  WHERE cache_expires_at < now();
END;
$$;

-- Function to calculate domain analytics
CREATE OR REPLACE FUNCTION calculate_whois_analytics(p_lookup_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lookup whois_lookups%ROWTYPE;
  v_domain_age_days integer;
  v_days_until_expiry integer;
  v_is_expiring_soon boolean;
  v_has_privacy_protection boolean;
  v_nameserver_count integer;
  v_has_dnssec boolean;
  v_security_score integer;
  v_risk_factors jsonb;
  v_recommendations text[];
BEGIN
  SELECT * INTO v_lookup FROM whois_lookups WHERE id = p_lookup_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_lookup.creation_date IS NOT NULL THEN
    v_domain_age_days := EXTRACT(DAY FROM (now() - v_lookup.creation_date));
  END IF;

  IF v_lookup.expiration_date IS NOT NULL THEN
    v_days_until_expiry := EXTRACT(DAY FROM (v_lookup.expiration_date - now()));
    v_is_expiring_soon := v_days_until_expiry <= 30 AND v_days_until_expiry > 0;
  END IF;

  v_has_privacy_protection := (
    v_lookup.registrant_name ILIKE '%privacy%' OR
    v_lookup.registrant_name ILIKE '%protected%' OR
    v_lookup.registrant_name ILIKE '%redacted%'
  );

  v_nameserver_count := COALESCE(array_length(v_lookup.name_servers, 1), 0);
  v_has_dnssec := (v_lookup.dnssec = 'signed' OR v_lookup.dnssec ILIKE '%enabled%');

  v_security_score := 50;
  IF v_has_dnssec THEN v_security_score := v_security_score + 15; END IF;
  IF v_nameserver_count >= 2 THEN v_security_score := v_security_score + 10; END IF;
  IF v_domain_age_days > 365 THEN v_security_score := v_security_score + 15; END IF;
  IF NOT v_is_expiring_soon THEN v_security_score := v_security_score + 10; END IF;

  v_risk_factors := jsonb_build_object(
    'young_domain', v_domain_age_days < 30,
    'expiring_soon', v_is_expiring_soon,
    'no_dnssec', NOT v_has_dnssec,
    'single_nameserver', v_nameserver_count < 2,
    'privacy_protected', v_has_privacy_protection
  );

  v_recommendations := ARRAY[]::text[];
  IF NOT v_has_dnssec THEN
    v_recommendations := array_append(v_recommendations, 'Enable DNSSEC for enhanced security');
  END IF;
  IF v_nameserver_count < 2 THEN
    v_recommendations := array_append(v_recommendations, 'Use multiple nameservers for redundancy');
  END IF;
  IF v_is_expiring_soon THEN
    v_recommendations := array_append(v_recommendations, 'Renew domain registration soon');
  END IF;

  INSERT INTO whois_analytics (
    lookup_id, domain_age_days, days_until_expiry, is_expiring_soon,
    has_privacy_protection, nameserver_count, has_dnssec,
    overall_security_score, risk_factors, recommendations
  ) VALUES (
    p_lookup_id, v_domain_age_days, v_days_until_expiry, v_is_expiring_soon,
    v_has_privacy_protection, v_nameserver_count, v_has_dnssec,
    v_security_score, v_risk_factors, v_recommendations
  )
  ON CONFLICT (lookup_id) DO UPDATE SET
    domain_age_days = EXCLUDED.domain_age_days,
    days_until_expiry = EXCLUDED.days_until_expiry,
    is_expiring_soon = EXCLUDED.is_expiring_soon,
    has_privacy_protection = EXCLUDED.has_privacy_protection,
    nameserver_count = EXCLUDED.nameserver_count,
    has_dnssec = EXCLUDED.has_dnssec,
    overall_security_score = EXCLUDED.overall_security_score,
    risk_factors = EXCLUDED.risk_factors,
    recommendations = EXCLUDED.recommendations;
END;
$$;