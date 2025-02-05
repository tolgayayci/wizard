/*
  # Add deployments tracking

  1. New Tables
    - `deployments`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects, nullable)
      - `contract_address` (text)
      - `chain_id` (integer)
      - `chain_name` (text)
      - `deployed_code` (text)
      - `abi` (jsonb)
      - `created_at` (timestamptz)
      - `metadata` (jsonb)

  2. Security
    - Enable RLS on `deployments` table
    - Add policies for authenticated users to:
      - Read their own deployments
      - Insert new deployments
*/

CREATE TABLE IF NOT EXISTS deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  contract_address text NOT NULL,
  chain_id integer NOT NULL,
  chain_name text NOT NULL,
  deployed_code text NOT NULL,
  abi jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- Policies for deployments
CREATE POLICY "Users can read own deployments"
  ON deployments
  FOR SELECT
  TO authenticated
  USING (
    project_id IS NULL OR
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own deployments"
  ON deployments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IS NULL OR
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );