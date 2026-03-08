/*
  # WHOIS Lookup Schema

  ## Overview
  WHOIS lookup system for domain and IP address information gathering.

  ## New Tables

  ### 1. `whois_lookups`
  Stores WHOIS lookup queries and results
  - `id` (uuid, primary key) - Unique lookup identifier
  - `user_id` (uuid, foreign key) - User who performed the lookup
  - `query` (text) - Domain or IP address queried
  - `query_type` (text) - 'domain' or 'ip'
  - `status` (text) - 'querying', 'completed', 'failed'
  - `registrar` (text) - Domain registrar name
  - `registrant_name` (text) - Registrant name
  - `registrant_organization` (text) - Registrant organization
  - `registrant_email` (text) - Registrant email
  - `registrant_country` (text) - Registrant country
  - `creation_date` (timestamptz) - Domain creation date
  - `expiration_date` (timestamptz) - Domain expiration date
  - `updated_date` (timestamptz) - Last update date
  - `name_servers` (text[]) - Array of nameservers
  - `dnssec` (text) - DNSSEC status
  - `raw_response` (text) - Full WHOIS response
  - `error_message` (text) - Error details if lookup failed
  - `queried_at` (timestamptz) - When lookup was performed
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - RLS enabled on all tables
  - Users can only access their own WHOIS lookups
  - Separate policies for select, insert, update, delete operations
*/

-- Create whois_lookups table
CREATE TABLE IF NOT EXISTS whois_lookups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  query_type text NOT NULL CHECK (query_type IN ('domain', 'ip')),
  status text NOT NULL DEFAULT 'querying' CHECK (status IN ('querying', 'completed', 'failed')),
  registrar text,
  registrant_name text,
  registrant_organization text,
  registrant_email text,
  registrant_country text,
  creation_date timestamptz,
  expiration_date timestamptz,
  updated_date timestamptz,
  name_servers text[],
  dnssec text,
  raw_response text,
  error_message text,
  queried_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whois_lookups_user_id ON whois_lookups(user_id);
CREATE INDEX IF NOT EXISTS idx_whois_lookups_query ON whois_lookups(query);
CREATE INDEX IF NOT EXISTS idx_whois_lookups_query_type ON whois_lookups(query_type);
CREATE INDEX IF NOT EXISTS idx_whois_lookups_status ON whois_lookups(status);

-- Enable Row Level Security
ALTER TABLE whois_lookups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whois_lookups
CREATE POLICY "Users can view own WHOIS lookups"
  ON whois_lookups FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own WHOIS lookups"
  ON whois_lookups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own WHOIS lookups"
  ON whois_lookups FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own WHOIS lookups"
  ON whois_lookups FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);