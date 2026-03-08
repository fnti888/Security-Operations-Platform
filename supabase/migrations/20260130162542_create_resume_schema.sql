/*
  # Create Resume Schema

  ## Overview
  Creates tables to store resume/portfolio data that can be viewed publicly by visitors.
  Includes professional information, work experience, education, skills, and contact details.

  ## New Tables
  
  ### `profiles`
  Stores basic profile information
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - Reference to auth.users
  - `full_name` (text) - Full name
  - `title` (text) - Professional title
  - `summary` (text) - Professional summary/bio
  - `email` (text) - Contact email
  - `phone` (text) - Contact phone
  - `linkedin_url` (text) - LinkedIn profile URL
  - `location` (text) - Current location
  - `is_public` (boolean) - Whether profile is publicly visible
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `work_experiences`
  Stores work history
  - `id` (uuid, primary key) - Unique identifier
  - `profile_id` (uuid, foreign key) - Reference to profiles
  - `company` (text) - Company name
  - `position` (text) - Job title/position
  - `location` (text) - Work location
  - `start_date` (date) - Start date
  - `end_date` (date, nullable) - End date (null for current position)
  - `description` (text) - Job description and achievements
  - `display_order` (integer) - Order for display
  - `created_at` (timestamptz) - Creation timestamp

  ### `education`
  Stores educational background
  - `id` (uuid, primary key) - Unique identifier
  - `profile_id` (uuid, foreign key) - Reference to profiles
  - `institution` (text) - School/university name
  - `degree` (text) - Degree/certification
  - `field_of_study` (text) - Major/field
  - `start_date` (date) - Start date
  - `end_date` (date, nullable) - End date
  - `description` (text, nullable) - Additional details
  - `display_order` (integer) - Order for display
  - `created_at` (timestamptz) - Creation timestamp

  ### `skills`
  Stores professional skills
  - `id` (uuid, primary key) - Unique identifier
  - `profile_id` (uuid, foreign key) - Reference to profiles
  - `name` (text) - Skill name
  - `category` (text) - Skill category (e.g., "Technical", "Language")
  - `proficiency_level` (text, nullable) - Proficiency level
  - `display_order` (integer) - Order for display
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on all tables
  - Allow public read access to profiles marked as public
  - Restrict write access to authenticated profile owners
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  summary text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  linkedin_url text DEFAULT '',
  location text DEFAULT '',
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create work_experiences table
CREATE TABLE IF NOT EXISTS work_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  company text NOT NULL DEFAULT '',
  position text NOT NULL DEFAULT '',
  location text DEFAULT '',
  start_date date,
  end_date date,
  description text DEFAULT '',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create education table
CREATE TABLE IF NOT EXISTS education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  institution text NOT NULL DEFAULT '',
  degree text NOT NULL DEFAULT '',
  field_of_study text DEFAULT '',
  start_date date,
  end_date date,
  description text DEFAULT '',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create skills table
CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT '',
  category text DEFAULT 'General',
  proficiency_level text DEFAULT '',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE education ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Work experiences policies
CREATE POLICY "Public work experiences are viewable by everyone"
  ON work_experiences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = work_experiences.profile_id
      AND profiles.is_public = true
    )
  );

CREATE POLICY "Users can view own work experiences"
  ON work_experiences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = work_experiences.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own work experiences"
  ON work_experiences FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = work_experiences.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own work experiences"
  ON work_experiences FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = work_experiences.profile_id
      AND profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = work_experiences.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own work experiences"
  ON work_experiences FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = work_experiences.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Education policies
CREATE POLICY "Public education records are viewable by everyone"
  ON education FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = education.profile_id
      AND profiles.is_public = true
    )
  );

CREATE POLICY "Users can view own education"
  ON education FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = education.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own education"
  ON education FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = education.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own education"
  ON education FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = education.profile_id
      AND profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = education.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own education"
  ON education FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = education.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Skills policies
CREATE POLICY "Public skills are viewable by everyone"
  ON skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = skills.profile_id
      AND profiles.is_public = true
    )
  );

CREATE POLICY "Users can view own skills"
  ON skills FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = skills.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own skills"
  ON skills FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = skills.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own skills"
  ON skills FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = skills.profile_id
      AND profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = skills.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own skills"
  ON skills FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = skills.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_public ON profiles(is_public);
CREATE INDEX IF NOT EXISTS idx_work_experiences_profile_id ON work_experiences(profile_id);
CREATE INDEX IF NOT EXISTS idx_education_profile_id ON education(profile_id);
CREATE INDEX IF NOT EXISTS idx_skills_profile_id ON skills(profile_id);
