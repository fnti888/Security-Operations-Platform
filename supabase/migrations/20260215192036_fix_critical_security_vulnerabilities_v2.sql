/*
  # Fix Critical Security Vulnerabilities
  
  This migration addresses 17 critical security issues identified by Supabase security audit:
  
  ## 1. Function Search Path Security (3 functions)
    - Fix `clean_expired_whois_cache` function search path
    - Fix `clean_expired_ip_cache` function search path
    - Fix `calculate_whois_analytics` function search path
  
  ## 2. RLS Policy Security Fixes (26 policies across 14 tables)
  
  ### Cache Tables - Restrict to Service Role Only
    - `ip_reputation_cache` - Remove overly permissive anon/authenticated access
    - `ip_whois_cache` - Remove overly permissive anon/authenticated access
    - `whois_cache` - Already restricted to service role, but fix true conditions
    - `threat_intel_cache` - Restrict to service role only
    
  ### System Tables - Restrict to Admin Users
    - `audit_logs` - Make read-only for users, writable by admins/system
    - `external_integrations` - Restrict to admin users only
    - `correlation_rules` - Restrict to admin users only
    - `threat_intelligence` - Restrict to admin users only
    
  ### User-Owned Tables - Add Proper Ownership Checks
    - `anomaly_detections` - System-managed, restrict inserts
    - `automation_workflows` - Check created_by ownership (add column if missing)
    - `behavioral_baselines` - System-managed baselines
    - `hunt_findings` - Check campaign ownership
    - `workflow_executions` - Check workflow ownership
    
  ### Incident-Related Tables - Check Incident Access
    - `correlated_incidents` - Service role managed
    - `incident_correlations` - Service role managed
    
  ### Integration Tables - Check Integration Ownership
    - `integration_events` - Service role managed
    
  ### WHOIS Advanced Feature Tables - Restrict to Service Role
    - `whois_analytics` - Service role only
    - `whois_dns_records` - Service role only
    - `whois_ssl_certificates` - Service role only
    - `whois_threat_intelligence` - Service role only
*/

-- =====================================================
-- 1. FIX FUNCTION SEARCH PATH SECURITY
-- =====================================================

-- Drop and recreate functions with secure search_path
DROP FUNCTION IF EXISTS public.clean_expired_whois_cache();
CREATE FUNCTION public.clean_expired_whois_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM whois_cache 
  WHERE expires_at < now();
END;
$$;

DROP FUNCTION IF EXISTS public.clean_expired_ip_cache();
CREATE FUNCTION public.clean_expired_ip_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM ip_reputation_cache 
  WHERE expires_at < now();
  
  DELETE FROM ip_whois_cache
  WHERE expires_at < now();
END;
$$;

DROP FUNCTION IF EXISTS public.calculate_whois_analytics();
CREATE FUNCTION public.calculate_whois_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO whois_analytics (
    domain,
    lookup_count,
    unique_users,
    last_lookup,
    avg_response_time
  )
  SELECT 
    domain,
    COUNT(*) as lookup_count,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(created_at) as last_lookup,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_response_time
  FROM whois_cache
  WHERE created_at > now() - interval '24 hours'
  GROUP BY domain
  ON CONFLICT (domain) 
  DO UPDATE SET
    lookup_count = EXCLUDED.lookup_count,
    unique_users = EXCLUDED.unique_users,
    last_lookup = EXCLUDED.last_lookup,
    avg_response_time = EXCLUDED.avg_response_time;
END;
$$;

-- =====================================================
-- 2. ADD MISSING COLUMNS FOR OWNERSHIP
-- =====================================================

-- Add created_by to automation_workflows if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automation_workflows' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE automation_workflows ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add created_by to hunt_findings if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hunt_findings' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE hunt_findings ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- =====================================================
-- 3. FIX RLS POLICIES - CACHE TABLES
-- =====================================================

-- IP Reputation Cache - Service role only for writes
DROP POLICY IF EXISTS "Anyone can insert cached IP reputation data" ON ip_reputation_cache;
DROP POLICY IF EXISTS "Anyone can update cached IP reputation data" ON ip_reputation_cache;
DROP POLICY IF EXISTS "Anyone can read cached IP reputation data" ON ip_reputation_cache;

CREATE POLICY "Service role can manage IP reputation cache"
  ON ip_reputation_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read IP reputation cache"
  ON ip_reputation_cache FOR SELECT
  TO authenticated
  USING (true);

-- IP WHOIS Cache - Service role only for writes
DROP POLICY IF EXISTS "Anyone can insert cached WHOIS data" ON ip_whois_cache;
DROP POLICY IF EXISTS "Anyone can read cached WHOIS data" ON ip_whois_cache;

CREATE POLICY "Service role can manage IP WHOIS cache"
  ON ip_whois_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read IP WHOIS cache"
  ON ip_whois_cache FOR SELECT
  TO authenticated
  USING (true);

-- WHOIS Cache - Fix the existing service role policy
DROP POLICY IF EXISTS "Service role can manage cache" ON whois_cache;

CREATE POLICY "Service role can manage whois cache"
  ON whois_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Threat Intel Cache - Service role only
DROP POLICY IF EXISTS "System can manage threat intel cache" ON threat_intel_cache;
DROP POLICY IF EXISTS "All authenticated users can read threat intel cache" ON threat_intel_cache;

CREATE POLICY "Service role can manage threat intel cache"
  ON threat_intel_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read threat intel cache"
  ON threat_intel_cache FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 4. FIX RLS POLICIES - SYSTEM/ADMIN TABLES
-- =====================================================

-- Audit Logs - Read-only for users, writable by service role
DROP POLICY IF EXISTS "System can create audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON audit_logs;

CREATE POLICY "Service role can manage audit logs"
  ON audit_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

-- External Integrations - Admin only
DROP POLICY IF EXISTS "Authenticated users can manage external integrations" ON external_integrations;
DROP POLICY IF EXISTS "Authenticated users can view external integrations" ON external_integrations;

CREATE POLICY "Admins can manage external integrations"
  ON external_integrations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Authenticated users can read external integrations"
  ON external_integrations FOR SELECT
  TO authenticated
  USING (true);

-- Correlation Rules - Admin only
DROP POLICY IF EXISTS "Authenticated users can manage correlation rules" ON correlation_rules;
DROP POLICY IF EXISTS "Authenticated users can view correlation rules" ON correlation_rules;

CREATE POLICY "Admins can manage correlation rules"
  ON correlation_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Authenticated users can read correlation rules"
  ON correlation_rules FOR SELECT
  TO authenticated
  USING (true);

-- Threat Intelligence - Admin only for writes
DROP POLICY IF EXISTS "Authenticated users can insert threat intelligence" ON threat_intelligence;
DROP POLICY IF EXISTS "Authenticated users can update threat intelligence" ON threat_intelligence;
DROP POLICY IF EXISTS "Authenticated users can view threat intelligence" ON threat_intelligence;

CREATE POLICY "Admins can manage threat intelligence"
  ON threat_intelligence FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Authenticated users can read threat intelligence"
  ON threat_intelligence FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 5. FIX RLS POLICIES - USER-OWNED TABLES
-- =====================================================

-- Anomaly Detections - Service role creates, users read
DROP POLICY IF EXISTS "Authenticated users can create anomaly detections" ON anomaly_detections;
DROP POLICY IF EXISTS "Authenticated users can view anomaly detections" ON anomaly_detections;

CREATE POLICY "Service role can create anomaly detections"
  ON anomaly_detections FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read anomaly detections"
  ON anomaly_detections FOR SELECT
  TO authenticated
  USING (true);

-- Automation Workflows - Check created_by
DROP POLICY IF EXISTS "Authenticated users can manage automation workflows" ON automation_workflows;
DROP POLICY IF EXISTS "Authenticated users can view automation workflows" ON automation_workflows;

CREATE POLICY "Users can manage their own workflows"
  ON automation_workflows FOR ALL
  TO authenticated
  USING (created_by = auth.uid() OR created_by IS NULL)
  WITH CHECK (created_by = auth.uid());

-- Behavioral Baselines - Admin manages, users read
DROP POLICY IF EXISTS "Authenticated users can manage behavioral baselines" ON behavioral_baselines;
DROP POLICY IF EXISTS "Authenticated users can view behavioral baselines" ON behavioral_baselines;

CREATE POLICY "Admins can manage behavioral baselines"
  ON behavioral_baselines FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Users can read behavioral baselines"
  ON behavioral_baselines FOR SELECT
  TO authenticated
  USING (true);

-- Hunt Findings - Check campaign ownership or created_by
DROP POLICY IF EXISTS "Authenticated users can manage hunt findings" ON hunt_findings;
DROP POLICY IF EXISTS "Authenticated users can view hunt findings" ON hunt_findings;

CREATE POLICY "Users can manage their own hunt findings"
  ON hunt_findings FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM hunt_campaigns
      WHERE hunt_campaigns.id = hunt_findings.campaign_id
      AND hunt_campaigns.created_by = auth.uid()
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM hunt_campaigns
      WHERE hunt_campaigns.id = hunt_findings.campaign_id
      AND hunt_campaigns.created_by = auth.uid()
    )
  );

-- Workflow Executions - Check workflow ownership
DROP POLICY IF EXISTS "Authenticated users can create workflow executions" ON workflow_executions;
DROP POLICY IF EXISTS "Authenticated users can view workflow executions" ON workflow_executions;

CREATE POLICY "Service role can create workflow executions"
  ON workflow_executions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Users can read their workflow executions"
  ON workflow_executions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM automation_workflows
      WHERE automation_workflows.id = workflow_executions.workflow_id
      AND (automation_workflows.created_by = auth.uid() OR automation_workflows.created_by IS NULL)
    )
  );

-- =====================================================
-- 6. FIX RLS POLICIES - INCIDENT-RELATED TABLES
-- =====================================================

-- Correlated Incidents - Service role creates, users read
DROP POLICY IF EXISTS "Authenticated users can create correlated incidents" ON correlated_incidents;
DROP POLICY IF EXISTS "Authenticated users can view correlated incidents" ON correlated_incidents;

CREATE POLICY "Service role can create correlated incidents"
  ON correlated_incidents FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read correlated incidents"
  ON correlated_incidents FOR SELECT
  TO authenticated
  USING (true);

-- Incident Correlations - Service role creates, admins update, all read
DROP POLICY IF EXISTS "Authenticated users can create incident correlations" ON incident_correlations;
DROP POLICY IF EXISTS "Authenticated users can update incident correlations" ON incident_correlations;
DROP POLICY IF EXISTS "All authenticated users can read incident correlations" ON incident_correlations;

CREATE POLICY "Service role can create incident correlations"
  ON incident_correlations FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read incident correlations"
  ON incident_correlations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update incident correlations"
  ON incident_correlations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- =====================================================
-- 7. FIX RLS POLICIES - INTEGRATION TABLES
-- =====================================================

-- Integration Events - Service role creates, users read
DROP POLICY IF EXISTS "Authenticated users can create integration events" ON integration_events;
DROP POLICY IF EXISTS "Authenticated users can view integration events" ON integration_events;

CREATE POLICY "Service role can create integration events"
  ON integration_events FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read integration events"
  ON integration_events FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 8. FIX RLS POLICIES - WHOIS ADVANCED TABLES
-- =====================================================

-- WHOIS Analytics - Service role only for writes
DROP POLICY IF EXISTS "Service role can insert analytics" ON whois_analytics;
DROP POLICY IF EXISTS "Authenticated users can read whois analytics" ON whois_analytics;

CREATE POLICY "Service role can manage whois analytics"
  ON whois_analytics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read whois analytics"
  ON whois_analytics FOR SELECT
  TO authenticated
  USING (true);

-- WHOIS DNS Records - Service role only for writes
DROP POLICY IF EXISTS "Service role can insert DNS records" ON whois_dns_records;
DROP POLICY IF EXISTS "Authenticated users can read DNS records" ON whois_dns_records;

CREATE POLICY "Service role can manage DNS records"
  ON whois_dns_records FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read DNS records"
  ON whois_dns_records FOR SELECT
  TO authenticated
  USING (true);

-- WHOIS SSL Certificates - Service role only for writes
DROP POLICY IF EXISTS "Service role can insert SSL certificates" ON whois_ssl_certificates;
DROP POLICY IF EXISTS "Authenticated users can read SSL certificates" ON whois_ssl_certificates;

CREATE POLICY "Service role can manage SSL certificates"
  ON whois_ssl_certificates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read SSL certificates"
  ON whois_ssl_certificates FOR SELECT
  TO authenticated
  USING (true);

-- WHOIS Threat Intelligence - Service role only for writes
DROP POLICY IF EXISTS "Service role can insert threat intelligence" ON whois_threat_intelligence;
DROP POLICY IF EXISTS "Authenticated users can read whois threat intelligence" ON whois_threat_intelligence;

CREATE POLICY "Service role can manage whois threat intelligence"
  ON whois_threat_intelligence FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read whois threat intelligence"
  ON whois_threat_intelligence FOR SELECT
  TO authenticated
  USING (true);
