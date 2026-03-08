/*
  # Fix Function Search Path Security

  1. Security Updates
    - Add secure search_path to `get_user_role()` function
    - Add secure search_path to `is_admin()` function
    - Add secure search_path to `is_analyst_or_admin()` function

  2. Important Notes
    - These functions use SECURITY DEFINER which runs with elevated privileges
    - Setting search_path prevents schema injection attacks
    - Functions will only look in public and pg_temp schemas
*/

-- Fix get_user_role function with secure search_path
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT role FROM user_profiles WHERE id = auth.uid()),
    'viewer'
  );
$$;

-- Fix is_admin function with secure search_path
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT get_user_role() = 'admin';
$$;

-- Fix is_analyst_or_admin function with secure search_path
CREATE OR REPLACE FUNCTION is_analyst_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT get_user_role() IN ('analyst', 'admin');
$$;
