/*
  # Fix UPDATE Policy Restrictions
  
  ## Security Issues Fixed
  
  ### Problem
  Three tables had UPDATE policies with `USING (true)` which allows any authenticated user
  to update ANY row without restrictions:
  - `threats` - Any user could modify threat data
  - `ioc_indicators` - Any user could modify IOC indicators
  - `alerts` - Any user could modify alerts
  
  ### Solution
  Replace permissive UPDATE policies with role-based access control:
  - Only users with 'admin' or 'analyst' roles can update these tables
  - 'viewer' role users have read-only access
  - Access control is enforced by checking the user's role in user_profiles
  
  ### Tables Updated
  1. **threats** - Restricted to admin/analyst roles
  2. **ioc_indicators** - Restricted to admin/analyst roles  
  3. **alerts** - Restricted to admin/analyst roles
  
  ## Security Impact
  - Prevents unauthorized modifications to critical security data
  - Enforces role-based access control (RBAC)
  - Maintains principle of least privilege
  - Viewers can no longer escalate privileges by modifying data
*/

-- Drop and recreate threats UPDATE policy with role check
DROP POLICY IF EXISTS "Authenticated users can update threats" ON threats;

CREATE POLICY "Admin and analyst can update threats"
  ON threats FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'analyst')
    )
  )
  WITH CHECK (
    name IS NOT NULL 
    AND name != ''
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'analyst')
    )
  );

-- Drop and recreate ioc_indicators UPDATE policy with role check
DROP POLICY IF EXISTS "Authenticated users can update IOC indicators" ON ioc_indicators;

CREATE POLICY "Admin and analyst can update IOC indicators"
  ON ioc_indicators FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'analyst')
    )
  )
  WITH CHECK (
    indicator_value IS NOT NULL 
    AND indicator_value != ''
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'analyst')
    )
  );

-- Drop and recreate alerts UPDATE policy with role check
DROP POLICY IF EXISTS "Authenticated users can update alerts" ON alerts;

CREATE POLICY "Admin and analyst can update alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'analyst')
    )
  )
  WITH CHECK (
    title IS NOT NULL 
    AND title != ''
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'analyst')
    )
  );

-- Create an index on user_profiles for better policy performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_id_role ON user_profiles(id, role);