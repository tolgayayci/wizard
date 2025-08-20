import { supabase } from '@/lib/supabase';

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
        apiUrl: 'https://api.arbiscan.io/api',
        apiKey: import.meta.env.VITE_ARBISCAN_API_KEY,
        explorerUrl: 'https://arbiscan.io',
      };
    case 421614: // Arbitrum Sepolia
      return {
        apiUrl: 'https://api-sepolia.arbiscan.io/api',
        apiKey: import.meta.env.VITE_ARBISCAN_SEPOLIA_API_KEY,
        explorerUrl: 'https://sepolia.arbiscan.io',
      };
    default:
      return null;
  }
}

// Submit contract for verification on Arbiscan
export async function verifyContract(request: VerificationRequest): Promise<VerificationResult> {
  const config = getArbiscanConfig(request.chainId);
  
  if (!config) {
    return {
      status: 'failed',
      message: 'Verification not supported for this chain',
    };
  }

  if (!config.apiKey || config.apiKey === 'your-arbiscan-api-key' || config.apiKey === 'your-arbiscan-sepolia-api-key') {
    console.warn('Arbiscan API key not configured. Skipping verification.');
    return {
      status: 'failed',
      message: 'Arbiscan API key not configured',
    };
  }

  try {
    // Prepare the verification request
    const formData = new FormData();
    formData.append('apikey', config.apiKey);
    formData.append('module', 'contract');
    formData.append('action', 'verifysourcecode');
    formData.append('contractaddress', request.contractAddress);
    formData.append('sourceCode', request.sourceCode);
    formData.append('codeformat', 'solidity-single-file'); // For now, using single file format
    formData.append('contractname', request.contractName);
    formData.append('compilerversion', request.compilerVersion);
    formData.append('optimizationUsed', '1'); // Stylus contracts are optimized
    formData.append('runs', '200');
    
    // For Stylus contracts, we need to specify the compiler type
    // Note: This may need adjustment based on Arbiscan's Stylus support
    formData.append('evmversion', 'default');
    formData.append('licenseType', '3'); // MIT license

    // Submit verification request
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.status === '1' && data.result) {
      // Verification request submitted successfully
      // Now we need to check the status
      const guid = data.result;
      
      // Wait a bit before checking status
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check verification status
      const statusResult = await checkVerificationStatus(guid, request.chainId);
      
      return {
        status: statusResult.verified ? 'verified' : 'pending',
        guid: guid,
        message: statusResult.message || 'Verification submitted successfully',
      };
    } else {
      return {
        status: 'failed',
        message: data.result || 'Verification failed',
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

// Check the status of a verification request
export async function checkVerificationStatus(guid: string, chainId: number): Promise<{ verified: boolean; message?: string }> {
  const config = getArbiscanConfig(chainId);
  
  if (!config || !config.apiKey) {
    return { verified: false, message: 'Configuration not available' };
  }

  try {
    const params = new URLSearchParams({
      apikey: config.apiKey,
      module: 'contract',
      action: 'checkverifystatus',
      guid: guid,
    });

    const response = await fetch(`${config.apiUrl}?${params}`);
    const data = await response.json();

    if (data.status === '1') {
      // Verification successful
      return { verified: true, message: 'Contract verified successfully' };
    } else if (data.result && data.result.includes('Pending')) {
      // Still pending
      return { verified: false, message: 'Verification pending' };
    } else {
      // Failed or other status
      return { verified: false, message: data.result || 'Verification failed' };
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
  // For Stylus contracts, we need to prepare the source differently
  // The verification process for Stylus is different from Solidity
  
  // Note: Arbiscan may require specific formatting for Stylus contracts
  // This is a placeholder implementation that may need adjustment
  // based on Arbiscan's actual Stylus verification API
  
  const verificationRequest: VerificationRequest = {
    contractAddress,
    sourceCode,
    contractName,
    compilerVersion: 'cargo-stylus-0.5.0', // Default Stylus compiler version
    chainId,
  };

  const result = await verifyContract(verificationRequest);
  
  // Update the deployment record with verification status
  if (result.guid) {
    try {
      const { error } = await supabase
        .from('deployments')
        .update({
          verification_status: result.status,
          verification_guid: result.guid,
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
  
  return result;
}

// Get verification URL for a contract
export function getVerificationUrl(contractAddress: string, chainId: number): string | null {
  const config = getArbiscanConfig(chainId);
  if (!config) return null;
  
  return `${config.explorerUrl}/address/${contractAddress}#code`;
}