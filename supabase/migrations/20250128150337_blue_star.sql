/*
  # Remove Last Compilation Column

  1. Changes
    - Remove `last_compilation` column from projects table
    - Data is now stored in compilation_history table instead

  2. Notes
    - Safe migration as compilation history is already being tracked
    - No data loss as historical data is preserved in compilation_history
*/

-- Remove last_compilation column from projects table
ALTER TABLE projects DROP COLUMN IF EXISTS last_compilation;