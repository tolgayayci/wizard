/*
  # Add project description and metadata

  1. Changes
    - Add description column to projects table
    - Add metadata column for future extensibility
    - Add last_activity_at column for better sorting
  
  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS description text DEFAULT '',
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now();

-- Update trigger to maintain last_activity_at
CREATE OR REPLACE FUNCTION update_last_activity_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_projects_last_activity ON projects;
CREATE TRIGGER update_projects_last_activity
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_last_activity_timestamp();