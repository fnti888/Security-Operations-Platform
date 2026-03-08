/*
  # Fix Duplicate Update Policy

  Drop the old restrictive update policy that only allowed updates when user_id matched.
  The new policy is more flexible and allows demo captures to be updated.
*/

DROP POLICY IF EXISTS "Users can update own capture sessions" ON capture_sessions;
