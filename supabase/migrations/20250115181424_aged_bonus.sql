/*
  # Add ABI Calls Tracking

  1. New Tables
    - `abi_calls`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `contract_address` (text)
      - `method_name` (text)
      - `method_type` (text)
      - `inputs` (jsonb)
      - `outputs` (jsonb)
      - `status` (text)
      - `error` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `abi_calls` table
    - Add policies for authenticated users to manage their own calls
*/

CREATE TABLE IF NOT EXISTS abi_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  contract_address text NOT NULL,
  method_name text NOT NULL,
  method_type text NOT NULL,
  inputs jsonb DEFAULT '{}',
  outputs jsonb DEFAULT '{}',
  status text NOT NULL,
  error text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE abi_calls ENABLE ROW LEVEL SECURITY;

-- Policies for abi_calls
CREATE POLICY "Users can read own abi calls"
  ON abi_calls
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own abi calls"
  ON abi_calls
  FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );