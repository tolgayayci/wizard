import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/config';

interface VerificationRequest {
  contractAddress: string;
  sourceCode: string;
  contractName: string;
  compilerVersion: string;
  chainId: number;
  projectPath?: string;
}

interface VerificationResult {
  status: 'pending' | 'verified' | 'failed';
  guid?: string;
  message: string;
}

// Get the appropriate Arbiscan API URL and key based on chain ID
function getArbiscanConfig(chainId: number) {
  switch (chainId) {
    case 42161: // Arbitrum One
      return {
        apiUrl: 'https://api.arbiscan.io/v2/api',
        apiKey: import.meta.env.VITE_ARBISCAN_API_KEY,
        explorerUrl: 'https://arbiscan.io',
        chainId: 42161,
      };
    case 421614: // Arbitrum Sepolia
      return {
        apiUrl: 'https://api.arbiscan.io/v2/api',
        apiKey: import.meta.env.VITE_ARBISCAN_SEPOLIA_API_KEY,
        explorerUrl: 'https://sepolia.arbiscan.io',
        chainId: 421614,
      };
    default:
      return null;
  }
}

// Submit contract for verification via backend API
export async function verifyContract(request: VerificationRequest): Promise<VerificationResult> {
  try {
    const response = await fetch(`${API_URL}/api/verification/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contract_address: request.contractAddress,
        source_code: request.sourceCode,
        contract_name: request.contractName,
        compiler_version: request.compilerVersion,
        chain_id: request.chainId,
      }),
    });

    const data = await response.json();

    if (data.success && data.data) {
      const result = data.data;
      
      // If we got a GUID, wait and check status
      if (result.guid && result.status === 'pending') {
        // Wait a bit before checking status
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check verification status
        const statusResult = await checkVerificationStatus(result.guid, request.chainId);
        
        return {
          status: statusResult.verified ? 'verified' : 'pending',
          guid: result.guid,
          message: statusResult.message || 'Verification submitted successfully',
        };
      }
      
      return {
        status: result.status,
        guid: result.guid,
        message: result.message,
      };
    } else {
      return {
        status: 'failed',
        message: data.message || 'Verification failed',
      };
    }
  } catch (error) {
    console.error('Error verifying contract:', error);
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Failed to verify contract',
    };
  }
}

// Check the status of a verification request via backend API
export async function checkVerificationStatus(guid: string, chainId: number): Promise<{ verified: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_URL}/api/verification/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guid: guid,
        chain_id: chainId,
      }),
    });

    const data = await response.json();

    if (data.success && data.data) {
      const result = data.data;
      return {
        verified: result.status === 'verified',
        message: result.message,
      };
    } else {
      return {
        verified: false,
        message: data.message || 'Failed to check verification status',
      };
    }
  } catch (error) {
    console.error('Error checking verification status:', error);
    return { verified: false, message: 'Failed to check verification status' };
  }
}

// Attempt to verify a Stylus contract specifically
export async function verifyStylusContract(
  contractAddress: string,
  projectId: string,
  chainId: number,
  sourceCode: string,
  contractName: string = 'StylusContract'
): Promise<VerificationResult> {
  const config = getArbiscanConfig(chainId);
  
  if (!config || !config.apiKey || config.apiKey.includes('your-arbiscan')) {
    // No API key configured - mark as failed
    const result: VerificationResult = {
      status: 'failed',
      message: 'Arbiscan API key not configured. Add VITE_ARBISCAN_API_KEY and VITE_ARBISCAN_SEPOLIA_API_KEY to your .env file.',
    };
    
    await updateDeploymentVerificationStatus(contractAddress, chainId, result);
    return result;
  }

  // Attempt verification using the standard Solidity verification process
  // This should work for Stylus contracts on Arbiscan with the v2 API
  const verificationRequest: VerificationRequest = {
    contractAddress,
    sourceCode,
    contractName,
    compilerVersion: 'v0.8.25+commit.b61c2a91', // Use a standard Solidity compiler version
    chainId,
  };

  const result = await verifyContract(verificationRequest);
  
  await updateDeploymentVerificationStatus(contractAddress, chainId, result);
  return result;
}

// Helper function to update deployment verification status
async function updateDeploymentVerificationStatus(
  contractAddress: string,
  chainId: number,
  result: VerificationResult
): Promise<void> {
  try {
    const { error } = await supabase
      .from('deployments')
      .update({
        verification_status: result.status,
        verification_guid: result.guid || null,
        verified_at: result.status === 'verified' ? new Date().toISOString() : null,
      })
      .eq('contract_address', contractAddress)
      .eq('chain_id', chainId);
      
    if (error) {
      console.error('Error updating deployment verification status:', error);
    }
  } catch (error) {
    console.error('Error updating deployment:', error);
  }
}

// Get verification URL for a contract
export function getVerificationUrl(contractAddress: string, chainId: number): string | null {
  const config = getArbiscanConfig(chainId);
  if (!config) return null;
  
  return `${config.explorerUrl}/address/${contractAddress}#code`;
}