/*
  # Add Compilation History Table

  1. New Tables
    - `compilation_history`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `user_id` (uuid, references users)
      - `code_snapshot` (text) - Code at time of compilation
      - `result` (jsonb) - Full compilation result
      - `status` (text) - success/error
      - `exit_code` (integer)
      - `stdout` (text)
      - `stderr` (text)
      - `abi` (jsonb) - Contract ABI if successful
      - `metadata` (jsonb) - Additional compilation metadata
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on compilation_history table
    - Add policies for authenticated users to manage their history
*/

-- Create compilation history table
CREATE TABLE IF NOT EXISTS compilation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  code_snapshot text NOT NULL,
  result jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL CHECK (status IN ('success', 'error')),
  exit_code integer NOT NULL,
  stdout text,
  stderr text,
  abi jsonb,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE compilation_history ENABLE ROW LEVEL SECURITY;

-- Policies for compilation history
CREATE POLICY "Users can read own compilation history"
  ON compilation_history
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own compilation history"
  ON compilation_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Add indexes for better query performance
CREATE INDEX compilation_history_project_id_idx ON compilation_history(project_id);
CREATE INDEX compilation_history_user_id_idx ON compilation_history(user_id);
CREATE INDEX compilation_history_status_idx ON compilation_history(status);
CREATE INDEX compilation_history_created_at_idx ON compilation_history(created_at DESC);

-- Add trigger to update project's last_activity_at
CREATE OR REPLACE FUNCTION update_project_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET last_activity_at = NEW.created_at
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_activity_on_compilation
  AFTER INSERT ON compilation_history
  FOR EACH ROW
  EXECUTE FUNCTION update_project_last_activity();

-- Add comments for documentation
COMMENT ON TABLE compilation_history IS 'Stores history of all compilation attempts for Stylus contracts';
COMMENT ON COLUMN compilation_history.code_snapshot IS 'Source code at time of compilation attempt';
COMMENT ON COLUMN compilation_history.result IS 'Full compilation result including all details';
COMMENT ON COLUMN compilation_history.status IS 'Compilation status (success/error)';
COMMENT ON COLUMN compilation_history.abi IS 'Contract ABI if compilation was successful';
COMMENT ON COLUMN compilation_history.metadata IS 'Additional compilation metadata like timing, versions etc';