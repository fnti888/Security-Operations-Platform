/*
  # Add Admin Flag to User Profiles

  1. Changes
    - Add `is_admin` boolean column to user_profiles table
    - Default value is false for security
    - NOT NULL constraint to ensure every user has a defined admin status

  2. Security
    - Only database administrators can set is_admin to true
    - Users can read their own admin status through existing RLS policies
    - Admin flag cannot be modified through the application interface
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_admin boolean DEFAULT false NOT NULL;
    COMMENT ON COLUMN user_profiles.is_admin IS 'Admin access flag - can only be set via direct database access';
  END IF;
END $$;