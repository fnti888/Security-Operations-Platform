/*
  # Fix Platform Ratings RLS Policy Security Issue
  
  ## Overview
  Fixes critical RLS policy vulnerability in the `platform_ratings` table where the INSERT
  policy uses `WITH CHECK (true)`, allowing unrestricted access and bypassing row-level security.
  
  ## Problem
  The existing policy "Anyone can submit ratings" has:
  - `WITH CHECK (true)` - allows anyone to insert ANY data with ANY user_id
  - This is a major security vulnerability allowing data spoofing and abuse
  
  ## Solution
  Replace the insecure policy with a secure one that:
  - Allows authenticated users to insert ratings ONLY with their own user_id or null
  - Allows anonymous users to insert ratings ONLY with null user_id
  - Prevents users from impersonating other users
  
  ## Changes
  1. Drop the insecure "Anyone can submit ratings" policy
  2. Create secure policies for authenticated and anonymous users
  
  ## Security Notes
  - Authenticated users can only set user_id to their own ID or leave it null
  - Anonymous users must leave user_id as null
  - This prevents user impersonation and data spoofing
*/

-- Drop the insecure policy
DROP POLICY IF EXISTS "Anyone can submit ratings" ON public.platform_ratings;

-- Create secure policy for authenticated users
CREATE POLICY "Authenticated users can submit ratings with own ID"
  ON public.platform_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL
  );

-- Create secure policy for anonymous users
CREATE POLICY "Anonymous users can submit ratings without ID"
  ON public.platform_ratings
  FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL
  );
