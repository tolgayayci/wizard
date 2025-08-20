-- Add deployment metadata columns
ALTER TABLE public.deployments 
ADD COLUMN IF NOT EXISTS deployer_address TEXT,
ADD COLUMN IF NOT EXISTS deployment_mode TEXT CHECK (deployment_mode IN ('wizard', 'user')),
ADD COLUMN IF NOT EXISTS network_info JSONB,
ADD COLUMN IF NOT EXISTS explorer_base_url TEXT;

-- Update existing rows with default values
UPDATE public.deployments 
SET deployment_mode = 'wizard' 
WHERE deployment_mode IS NULL;

-- Extract deployer address from metadata if available
UPDATE public.deployments 
SET deployer_address = metadata->>'deployer_address'
WHERE deployer_address IS NULL 
  AND metadata->>'deployer_address' IS NOT NULL;

-- Set network info based on chain_id
UPDATE public.deployments
SET network_info = 
  CASE 
    WHEN chain_id = 421614 THEN 
      jsonb_build_object(
        'chain_id', 421614,
        'name', 'Arbitrum Sepolia',
        'rpc_url', 'https://sepolia-rollup.arbitrum.io/rpc',
        'explorer_url', 'https://sepolia.arbiscan.io',
        'is_testnet', true,
        'currency', 'ETH'
      )
    WHEN chain_id = 42161 THEN
      jsonb_build_object(
        'chain_id', 42161,
        'name', 'Arbitrum One',
        'rpc_url', 'https://arb1.arbitrum.io/rpc',
        'explorer_url', 'https://arbiscan.io',
        'is_testnet', false,
        'currency', 'ETH'
      )
    ELSE
      jsonb_build_object(
        'chain_id', chain_id,
        'name', 'Unknown Network',
        'is_testnet', true
      )
  END
WHERE network_info IS NULL;

-- Set explorer base URL based on chain_id
UPDATE public.deployments
SET explorer_base_url = 
  CASE 
    WHEN chain_id = 421614 THEN 'https://sepolia.arbiscan.io'
    WHEN chain_id = 42161 THEN 'https://arbiscan.io'
    ELSE NULL
  END
WHERE explorer_base_url IS NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_deployments_deployer_address ON public.deployments(deployer_address);
CREATE INDEX IF NOT EXISTS idx_deployments_deployment_mode ON public.deployments(deployment_mode);
CREATE INDEX IF NOT EXISTS idx_deployments_chain_network ON public.deployments(chain_id, deployment_mode);

-- Add comment for documentation
COMMENT ON COLUMN public.deployments.deployer_address IS 'Address that deployed the contract';
COMMENT ON COLUMN public.deployments.deployment_mode IS 'Deployment method: wizard (backend wallet) or user (external wallet)';
COMMENT ON COLUMN public.deployments.network_info IS 'Network information including RPC URL, explorer URL, etc.';
COMMENT ON COLUMN public.deployments.explorer_base_url IS 'Base URL for blockchain explorer';