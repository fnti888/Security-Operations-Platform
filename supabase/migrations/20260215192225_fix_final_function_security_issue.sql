/*
  # Fix Final Function Security Issue
  
  This migration fixes the remaining function security vulnerability by using
  fully qualified table names instead of relying on search_path.
  
  ## Changes
    - Rewrite `calculate_whois_analytics` to use explicit schema references
    - This eliminates the search_path mutable security warning
*/

-- Drop and recreate function with fully qualified names
DROP FUNCTION IF EXISTS public.calculate_whois_analytics();

CREATE FUNCTION public.calculate_whois_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
    COUNT(*) as lookup_count,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(created_at) as last_lookup,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_response_time
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
