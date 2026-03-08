/*
  # Fix RLS Security Policies
  
  This migration addresses critical security vulnerabilities where RLS policies
  were using "true" conditions, effectively bypassing row-level security.
  
  ## Changes Made
  
  1. **Helper Functions**
     - `get_user_role()` - Returns the role of the current authenticated user
     - `is_admin()` - Checks if user is an admin
     - `is_analyst_or_admin()` - Checks if user is analyst or admin
  
  2. **Security Model**
     - **Admin**: Full access to all data (create, read, update, delete)
     - **Analyst**: Can create and manage operational data (threats, alerts, incidents, forensic data)
     - **Viewer**: Read-only access to all data
  
  3. **Fixed Policies**
     - `alerts` - Restricted INSERT/UPDATE to analysts and admins only
     - `threats` - Restricted INSERT/UPDATE to analysts and admins only
     - `artifacts` - Restricted INSERT/UPDATE to analysts and admins only
     - `forensic_timeline` - Restricted INSERT to analysts and admins only
     - `ioc_indicators` - Restricted INSERT/UPDATE to analysts and admins only
     - `memory_analysis` - Restricted INSERT to analysts and admins only
     - System monitoring tables (`file_events`, `live_events`, `network_traffic`, 
       `security_logs`, `system_processes`) - Restricted INSERT to admins only
  
  4. **Important Notes**
     - All SELECT policies remain open to authenticated users (analysts need visibility)
     - System-level data insertion is now restricted to admin role only
     - Evidence and investigation policies maintain investigator ownership checks
     - First user to register should be given admin role in user_profiles
*/

-- Create helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM user_profiles WHERE id = auth.uid()),
    'viewer'
  );
$$;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT get_user_role() = 'admin';
$$;

-- Create helper function to check if user is analyst or admin
CREATE OR REPLACE FUNCTION is_analyst_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT get_user_role() IN ('analyst', 'admin');
$$;

-- =====================================================
-- FIX ALERTS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can create alerts" ON alerts;
DROP POLICY IF EXISTS "Authenticated users can update alerts" ON alerts;

CREATE POLICY "Analysts and admins can create alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (is_analyst_or_admin());

CREATE POLICY "Analysts and admins can update alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (is_analyst_or_admin())
  WITH CHECK (is_analyst_or_admin());

-- =====================================================
-- FIX THREATS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can create threats" ON threats;
DROP POLICY IF EXISTS "Authenticated users can update threats" ON threats;

CREATE POLICY "Analysts and admins can create threats"
  ON threats FOR INSERT
  TO authenticated
  WITH CHECK (is_analyst_or_admin());

CREATE POLICY "Analysts and admins can update threats"
  ON threats FOR UPDATE
  TO authenticated
  USING (is_analyst_or_admin())
  WITH CHECK (is_analyst_or_admin());

-- =====================================================
-- FIX ARTIFACTS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can create artifacts" ON artifacts;
DROP POLICY IF EXISTS "Users can update artifacts" ON artifacts;

CREATE POLICY "Analysts and admins can create artifacts"
  ON artifacts FOR INSERT
  TO authenticated
  WITH CHECK (is_analyst_or_admin());

CREATE POLICY "Analysts and admins can update artifacts"
  ON artifacts FOR UPDATE
  TO authenticated
  USING (is_analyst_or_admin())
  WITH CHECK (is_analyst_or_admin());

-- =====================================================
-- FIX FORENSIC_TIMELINE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can create timeline events" ON forensic_timeline;

CREATE POLICY "Analysts and admins can create timeline events"
  ON forensic_timeline FOR INSERT
  TO authenticated
  WITH CHECK (is_analyst_or_admin());

-- =====================================================
-- FIX IOC_INDICATORS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can insert IOC indicators" ON ioc_indicators;
DROP POLICY IF EXISTS "Authenticated users can update IOC indicators" ON ioc_indicators;

CREATE POLICY "Analysts and admins can insert IOC indicators"
  ON ioc_indicators FOR INSERT
  TO authenticated
  WITH CHECK (is_analyst_or_admin());

CREATE POLICY "Analysts and admins can update IOC indicators"
  ON ioc_indicators FOR UPDATE
  TO authenticated
  USING (is_analyst_or_admin())
  WITH CHECK (is_analyst_or_admin());

-- =====================================================
-- FIX MEMORY_ANALYSIS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can create memory analysis" ON memory_analysis;

CREATE POLICY "Analysts and admins can create memory analysis"
  ON memory_analysis FOR INSERT
  TO authenticated
  WITH CHECK (is_analyst_or_admin());

-- =====================================================
-- FIX SYSTEM MONITORING POLICIES (Admin-only)
-- =====================================================

-- File Events
DROP POLICY IF EXISTS "System can insert file events" ON file_events;

CREATE POLICY "Admins can insert file events"
  ON file_events FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Live Events
DROP POLICY IF EXISTS "System can insert live events" ON live_events;

CREATE POLICY "Admins can insert live events"
  ON live_events FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Network Traffic
DROP POLICY IF EXISTS "System can insert network traffic" ON network_traffic;

CREATE POLICY "Admins can insert network traffic"
  ON network_traffic FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Security Logs
DROP POLICY IF EXISTS "System can insert security logs" ON security_logs;

CREATE POLICY "Admins can insert security logs"
  ON security_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- System Processes
DROP POLICY IF EXISTS "System can insert system processes" ON system_processes;

CREATE POLICY "Admins can insert system processes"
  ON system_processes FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- =====================================================
-- ADD DELETE POLICIES FOR ADMINS
-- =====================================================

-- Admins can delete alerts
CREATE POLICY "Admins can delete alerts"
  ON alerts FOR DELETE
  TO authenticated
  USING (is_admin());

-- Admins can delete threats
CREATE POLICY "Admins can delete threats"
  ON threats FOR DELETE
  TO authenticated
  USING (is_admin());

-- Admins can delete IOC indicators
CREATE POLICY "Admins can delete IOC indicators"
  ON ioc_indicators FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- COMMENT ON SECURITY MODEL
-- =====================================================

COMMENT ON FUNCTION get_user_role() IS 'Returns the role of the current authenticated user from user_profiles table. Defaults to viewer if no profile exists.';
COMMENT ON FUNCTION is_admin() IS 'Returns true if the current user has admin role.';
COMMENT ON FUNCTION is_analyst_or_admin() IS 'Returns true if the current user has analyst or admin role.';
