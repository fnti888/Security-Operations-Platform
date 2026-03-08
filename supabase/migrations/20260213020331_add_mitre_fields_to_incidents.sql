/*
  # Add MITRE ATT&CK Fields to Incidents Table

  1. Schema Changes
    - Add `mitre_tactic` column to store MITRE ATT&CK tactic (e.g., "Credential Access")
    - Add `mitre_technique_id` column to store technique ID (e.g., "T1110")
    - Add `mitre_technique_name` column to store technique name (e.g., "Brute Force")
    - Add `mitre_description` column to store technique description
    - Add `recommended_action` column to store recommended response actions
    
  2. Notes
    - All fields use text type and default to "Unknown" if no mapping exists
    - Fields are automatically populated when incidents are created based on category
    - Existing incidents will have NULL values (not updated)
*/

-- Add MITRE ATT&CK fields to incidents table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incidents' AND column_name = 'mitre_tactic'
  ) THEN
    ALTER TABLE incidents ADD COLUMN mitre_tactic text DEFAULT 'Unknown';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incidents' AND column_name = 'mitre_technique_id'
  ) THEN
    ALTER TABLE incidents ADD COLUMN mitre_technique_id text DEFAULT 'Unknown';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incidents' AND column_name = 'mitre_technique_name'
  ) THEN
    ALTER TABLE incidents ADD COLUMN mitre_technique_name text DEFAULT 'Unknown';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incidents' AND column_name = 'mitre_description'
  ) THEN
    ALTER TABLE incidents ADD COLUMN mitre_description text DEFAULT 'Unknown';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incidents' AND column_name = 'recommended_action'
  ) THEN
    ALTER TABLE incidents ADD COLUMN recommended_action text DEFAULT 'Unknown';
  END IF;
END $$;