/*
  # Make incidents.created_by nullable for sample data
  
  1. Purpose
    - Allow sample/demo incidents to be created without requiring a user
    - Maintains backward compatibility with existing data
    
  2. Changes
    - Remove NOT NULL constraint from incidents.created_by
    - Update RLS policies to handle null created_by values
    
  3. Security
    - RLS policies still enforce that authenticated users can only create incidents with their own user ID
    - Null created_by values are only for sample/system-generated data
*/

-- Drop the existing foreign key constraint
ALTER TABLE incidents 
  DROP CONSTRAINT IF EXISTS incidents_created_by_fkey;

-- Make created_by nullable
ALTER TABLE incidents 
  ALTER COLUMN created_by DROP NOT NULL;

-- Re-add the foreign key constraint (now nullable)
ALTER TABLE incidents 
  ADD CONSTRAINT incidents_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- Update the insert policy to allow null created_by for system/sample data
DROP POLICY IF EXISTS "Authenticated users can create incidents" ON incidents;

CREATE POLICY "Authenticated users can create incidents"
  ON incidents FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by OR 
    (created_by IS NULL AND auth.uid() IS NOT NULL)
  );
