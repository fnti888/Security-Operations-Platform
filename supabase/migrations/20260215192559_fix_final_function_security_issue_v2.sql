/*
  # Fix Final Function Security Issue (Version 2)
  
  This migration properly fixes the search_path security vulnerability by:
  1. Dropping all versions of the calculate_whois_analytics function
  2. Recreating with explicit schema qualification and locked search_path
  
  ## Security Changes
    - Sets search_path to 'pg_catalog, public' to prevent search_path hijacking
    - Uses fully qualified table names (public.tablename)
    - Removes any role mutable search_path vulnerabilities
*/

-- Drop all versions of the function
DROP FUNCTION IF EXISTS public.calculate_whois_analytics();
DROP FUNCTION IF EXISTS public.calculate_whois_analytics(uuid);

-- Recreate the function with proper security settings
CREATE FUNCTION public.calculate_whois_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.whois_analytics (
    domain,
    lookup_count,
    unique_users,
    last_lookup,
    avg_response_time
  )
  SELECT 
    domain,
    count(*) as lookup_count,
    count(DISTINCT user_id) as unique_users,
    max(created_at) as last_lookup,
    avg(extract(EPOCH FROM (updated_at - created_at))) as avg_response_time
  FROM public.whois_cache
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
