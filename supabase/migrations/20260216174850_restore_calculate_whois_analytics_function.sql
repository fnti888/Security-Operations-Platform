/*
  # Restore calculate_whois_analytics Function with Correct Signature
  
  ## Overview
  Restores the `calculate_whois_analytics(p_lookup_id uuid)` function that was accidentally
  replaced in security fix migrations. This function calculates security analytics for
  individual WHOIS lookups.
  
  ## Changes
  1. Drops the incorrect parameterless version of calculate_whois_analytics
  2. Recreates the function with the correct signature: calculate_whois_analytics(p_lookup_id uuid)
  3. Implements proper security settings:
     - SECURITY DEFINER to run with elevated privileges
     - search_path set to 'pg_catalog, public' for security
     - Fully qualified table names
  
  ## Function Details
  - Calculates domain age, expiration status, security score
  - Detects privacy protection, DNSSEC, nameserver configuration
  - Generates security recommendations
  - Inserts/updates analytics in whois_analytics table
  
  ## Security Notes
  - Function runs as SECURITY DEFINER with locked search_path
  - Only inserts/updates analytics for existing lookups
  - All table references are fully qualified
*/

-- Drop the incorrect version without parameters
DROP FUNCTION IF EXISTS public.calculate_whois_analytics();

-- Recreate the correct function with parameters
CREATE OR REPLACE FUNCTION public.calculate_whois_analytics(p_lookup_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
DECLARE
  v_lookup public.whois_lookups%ROWTYPE;
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
  -- Fetch the lookup record
  SELECT * INTO v_lookup FROM public.whois_lookups WHERE id = p_lookup_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate domain age
  IF v_lookup.creation_date IS NOT NULL THEN
    v_domain_age_days := EXTRACT(DAY FROM (now() - v_lookup.creation_date))::integer;
  ELSE
    v_domain_age_days := NULL;
  END IF;

  -- Calculate days until expiry
  IF v_lookup.expiration_date IS NOT NULL THEN
    v_days_until_expiry := EXTRACT(DAY FROM (v_lookup.expiration_date - now()))::integer;
    v_is_expiring_soon := v_days_until_expiry <= 30 AND v_days_until_expiry > 0;
  ELSE
    v_days_until_expiry := NULL;
    v_is_expiring_soon := false;
  END IF;

  -- Detect privacy protection
  v_has_privacy_protection := (
    v_lookup.registrant_name ILIKE '%privacy%' OR
    v_lookup.registrant_name ILIKE '%protected%' OR
    v_lookup.registrant_name ILIKE '%redacted%'
  );

  -- Count nameservers
  v_nameserver_count := COALESCE(array_length(v_lookup.name_servers, 1), 0);
  
  -- Check DNSSEC
  v_has_dnssec := (v_lookup.dnssec = 'signed' OR v_lookup.dnssec ILIKE '%enabled%');

  -- Calculate security score
  v_security_score := 50;
  IF v_has_dnssec THEN 
    v_security_score := v_security_score + 15; 
  END IF;
  IF v_nameserver_count >= 2 THEN 
    v_security_score := v_security_score + 10; 
  END IF;
  IF v_domain_age_days > 365 THEN 
    v_security_score := v_security_score + 15; 
  END IF;
  IF NOT v_is_expiring_soon THEN 
    v_security_score := v_security_score + 10; 
  END IF;

  -- Build risk factors
  v_risk_factors := jsonb_build_object(
    'young_domain', COALESCE(v_domain_age_days < 30, false),
    'expiring_soon', v_is_expiring_soon,
    'no_dnssec', NOT v_has_dnssec,
    'single_nameserver', v_nameserver_count < 2,
    'privacy_protected', v_has_privacy_protection
  );

  -- Generate recommendations
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

  -- Insert or update analytics
  INSERT INTO public.whois_analytics (
    lookup_id, 
    domain_age_days, 
    days_until_expiry, 
    is_expiring_soon,
    has_privacy_protection, 
    nameserver_count, 
    has_dnssec,
    overall_security_score, 
    risk_factors, 
    recommendations
  ) VALUES (
    p_lookup_id, 
    v_domain_age_days, 
    v_days_until_expiry, 
    v_is_expiring_soon,
    v_has_privacy_protection, 
    v_nameserver_count, 
    v_has_dnssec,
    v_security_score, 
    v_risk_factors, 
    v_recommendations
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
    recommendations = EXCLUDED.recommendations,
    created_at = now();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.calculate_whois_analytics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_whois_analytics(uuid) TO anon;
