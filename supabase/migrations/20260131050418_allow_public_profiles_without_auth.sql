/*
  # Allow Public Profiles Without Authentication
  
  ## Overview
  Modifies the profiles table to allow creation of public portfolio profiles
  that don't require authentication. This is useful for standalone resume/portfolio
  websites where the owner wants to display their resume publicly without requiring login.
  
  ## Changes
  
  1. Schema Modification
    - Make user_id nullable in profiles table
    - Remove UNIQUE constraint on user_id to allow multiple public profiles
  
  2. Security Updates
    - Update RLS policies to handle null user_id for public profiles
    - Ensure public profiles remain accessible to everyone
  
  ## Important Notes
  - Public profiles with null user_id can only be edited through direct database access
  - Authenticated users still have full control over their own profiles
*/

-- Drop the existing unique constraint on user_id
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_key;

-- Make user_id nullable
ALTER TABLE profiles ALTER COLUMN user_id DROP NOT NULL;

-- Add a new unique constraint that allows multiple nulls
-- This ensures each authenticated user can only have one profile, but allows multiple public profiles
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique 
  ON profiles(user_id) 
  WHERE user_id IS NOT NULL;

-- Update RLS policies to handle null user_id
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND user_id IS NOT NULL)
  WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND user_id IS NOT NULL);
