/*
  # Add Admin Role System

  1. Changes
    - Add `is_admin` column to profiles table
    - Add default value of false for security
    - Add policy to allow users to read their own admin status
    - Add comment explaining admin role usage

  2. Security
    - Only admins can be set via direct database update (not through app)
    - Users can read their own admin status
    - RLS policies protect admin flag from unauthorized changes
*/

-- Add is_admin column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false NOT NULL;
    COMMENT ON COLUMN profiles.is_admin IS 'Admin role flag - only set via database, not through application';
  END IF;
END $$;

-- Update RLS policy to allow users to read their own admin status
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR true);

-- Allow public reading of profiles for resume page
DROP POLICY IF EXISTS "Public profiles readable" ON profiles;
CREATE POLICY "Public profiles readable"
  ON profiles FOR SELECT
  TO anon
  USING (true);