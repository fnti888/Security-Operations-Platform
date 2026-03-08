/*
  # Auto-Create User Profiles on Sign Up

  ## Overview
  Automatically creates a user profile with analyst role when a new user signs up.
  This ensures all new users have immediate access to the security operations platform.

  ## Changes
  1. Function
    - Creates `handle_new_user()` function that automatically creates a profile
    - Assigns default role of 'analyst' to new users
    - Sets default full name based on email

  2. Trigger
    - Triggers after user insertion in auth.users table
    - Automatically creates corresponding user_profiles entry

  ## Security
  - Function runs with SECURITY DEFINER to bypass RLS
  - Only creates profile if one doesn't already exist
  - Default role is 'analyst' which provides read/write access to most features
  - Admins can later upgrade users to admin role via direct database access

  ## Default Access Levels
  - viewer: Read-only access
  - analyst: Can create/update incidents, threats, and alerts (DEFAULT for new users)
  - admin: Full access including user management
*/

-- Function to handle new user sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'analyst',
    'Security Operations'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;