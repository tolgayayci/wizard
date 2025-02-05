/*
  # Fix RLS policies for users and projects

  1. Changes
    - Add policy for users to insert their own record
    - Add policy for authenticated users to update their own record
    - Add policy for authenticated users to delete their own record
    - Update existing policies to be more specific

  2. Security
    - Enable RLS on users table (already enabled)
    - Add insert policy for users table
    - Add update policy for users table
    - Add delete policy for users table
*/

-- Drop existing users policies to recreate them
DROP POLICY IF EXISTS "Users can read own data" ON users;

-- Users policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own data"
  ON users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);