-- Add deployment_id column to abi_calls table to link calls to specific deployments
-- This enables filtering ABI calls by selected deployment/contract

-- Add deployment_id column with foreign key constraint
ALTER TABLE public.abi_calls 
ADD COLUMN deployment_id UUID REFERENCES deployments(id) ON DELETE CASCADE;

-- Create index for better query performance when filtering by deployment
CREATE INDEX idx_abi_calls_deployment ON public.abi_calls(deployment_id);

-- Create composite index for common query patterns (project + deployment)
CREATE INDEX idx_abi_calls_project_deployment ON public.abi_calls(project_id, deployment_id);

-- Update RLS policies to consider deployment access
-- Users can view ABI calls for deployments they have access to
DROP POLICY IF EXISTS "Users can read own abi calls" ON public.abi_calls;

CREATE POLICY "Users can read own abi calls"
ON public.abi_calls
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  -- Allow access if user owns the project
  project_id IN (
    SELECT projects.id
    FROM projects
    WHERE projects.user_id = auth.uid()
  )
  -- OR if deployment_id is null (backward compatibility)
  OR deployment_id IS NULL
);

-- Update insert policy to maintain existing behavior
DROP POLICY IF EXISTS "Users can insert own abi calls" ON public.abi_calls;

CREATE POLICY "Users can insert own abi calls"
ON public.abi_calls
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT projects.id
    FROM projects
    WHERE projects.user_id = auth.uid()
  )
);

-- Add comment for documentation
COMMENT ON COLUMN public.abi_calls.deployment_id IS 'References specific deployment/contract that this ABI call was made to';

-- Migrate existing data: try to match abi_calls to deployments based on contract_address
-- This is a best-effort migration for existing data
UPDATE public.abi_calls 
SET deployment_id = (
  SELECT d.id 
  FROM deployments d 
  WHERE d.contract_address = abi_calls.contract_address 
    AND d.project_id = abi_calls.project_id
  ORDER BY d.created_at DESC 
  LIMIT 1
)
WHERE deployment_id IS NULL;