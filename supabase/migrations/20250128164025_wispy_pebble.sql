/*
  # Add error type tracking to compilation history

  1. Changes
    - Add error_type column to compilation_history table
    - Add check constraint for valid error types
    - Add index for better query performance
    - Add comments for documentation

  2. Details
    - error_type can be: 'compilation', 'network', or 'unknown'
    - Default value is 'unknown' for backward compatibility
    - Added index to optimize queries filtering by error type
*/

-- Add error_type column with check constraint
ALTER TABLE compilation_history 
ADD COLUMN IF NOT EXISTS error_type text 
CHECK (error_type IN ('compilation', 'network', 'unknown'))
DEFAULT 'unknown';

-- Add index for error_type column
CREATE INDEX IF NOT EXISTS compilation_history_error_type_idx 
ON compilation_history(error_type);

-- Add column comment
COMMENT ON COLUMN compilation_history.error_type IS 'Type of compilation error: compilation, network, or unknown';