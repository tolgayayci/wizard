-- Add verification status columns to deployments table
ALTER TABLE deployments 
ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'failed')),
ADD COLUMN IF NOT EXISTS verification_guid TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_deployments_verification_status ON deployments(verification_status);
CREATE INDEX IF NOT EXISTS idx_deployments_chain_id ON deployments(chain_id);