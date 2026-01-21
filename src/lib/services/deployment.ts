import axios from 'axios';
import { API_URL } from '@/lib/config';
import { DeploymentResult } from '@/lib/types';
import { 
  sendTransaction, 
  waitForTransactionReceipt,
  getAccount,
  getChainId,
  switchChain,
} from '@wagmi/core';
import { wagmiConfig, getNetworkConfig } from '@/lib/wallet/config';
import { getAddress, isAddress } from 'viem';

// ArbWasm precompile address for activating Stylus programs
const ARBWASM_PRECOMPILE = '0x0000000000000000000000000000000000000071' as const;

// Error categorization for better UX
export enum DeploymentErrorType {
  COMPILATION = 'compilation',
  WALLET_CONNECTION = 'wallet_connection',
  NETWORK_MISMATCH = 'network_mismatch',
  DEPLOYMENT = 'deployment',
  ACTIVATION = 'activation',
  PROGRAM_UP_TO_DATE = 'program_up_to_date', // Special case - not actually an error
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  USER_REJECTED = 'user_rejected',
  UNKNOWN = 'unknown'
}

export interface CategorizedError {
  type: DeploymentErrorType;
  message: string;
  originalError?: Error;
  isRecoverable: boolean;
  userAction?: string;
}

/**
 * Categorize deployment errors for better UX
 */
function categorizeError(error: any): CategorizedError {
  const errorMessage = error?.message?.toLowerCase() || '';
  
  // Program already up to date - this is actually success!
  if (errorMessage.includes('program up to date') || errorMessage.includes('programuptodate')) {
    return {
      type: DeploymentErrorType.PROGRAM_UP_TO_DATE,
      message: 'Contract is already activated and up to date',
      isRecoverable: false, // No recovery needed - this is success
    };
  }
  
  // User rejected transaction
  if (errorMessage.includes('user rejected') || errorMessage.includes('user denied')) {
    return {
      type: DeploymentErrorType.USER_REJECTED,
      message: 'Transaction was rejected by user',
      isRecoverable: true,
      userAction: 'Please approve the transaction in your wallet to continue'
    };
  }
  
  // Insufficient funds
  if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
    return {
      type: DeploymentErrorType.INSUFFICIENT_FUNDS,
      message: 'Insufficient funds for transaction',
      isRecoverable: true,
      userAction: 'Please ensure you have enough ETH to cover gas fees and data costs'
    };
  }
  
  // Network issues
  if (errorMessage.includes('network') || errorMessage.includes('chain')) {
    return {
      type: DeploymentErrorType.NETWORK_MISMATCH,
      message: 'Network or chain mismatch',
      isRecoverable: true,
      userAction: 'Please switch to the correct network in your wallet'
    };
  }
  
  // Wallet connection issues
  if (errorMessage.includes('wallet not connected') || errorMessage.includes('no account')) {
    return {
      type: DeploymentErrorType.WALLET_CONNECTION,
      message: 'Wallet not connected',
      isRecoverable: true,
      userAction: 'Please connect your wallet to continue'
    };
  }
  
  // Compilation errors
  if (errorMessage.includes('compilation failed') || errorMessage.includes('compile')) {
    return {
      type: DeploymentErrorType.COMPILATION,
      message: 'Contract compilation failed',
      isRecoverable: true,
      userAction: 'Please fix compilation errors in your code'
    };
  }
  
  // Deployment transaction failures
  if (errorMessage.includes('deployment') && (errorMessage.includes('failed') || errorMessage.includes('reverted'))) {
    return {
      type: DeploymentErrorType.DEPLOYMENT,
      message: 'Contract deployment transaction failed',
      isRecoverable: true,
      userAction: 'Check transaction details and try again'
    };
  }
  
  // Activation failures
  if (errorMessage.includes('activation') && (errorMessage.includes('failed') || errorMessage.includes('reverted'))) {
    return {
      type: DeploymentErrorType.ACTIVATION,
      message: 'Contract activation failed',
      isRecoverable: true,
      userAction: 'Ensure sufficient funds for data fee and try activation again'
    };
  }
  
  // Default to unknown
  return {
    type: DeploymentErrorType.UNKNOWN,
    message: error?.message || 'Unknown deployment error',
    originalError: error,
    isRecoverable: false,
    userAction: 'Please try again or contact support'
  };
}

/**
 * Validate wallet connection and network
 */
async function validateWalletAndNetwork(
  chainId: number, 
  walletAddress?: string
): Promise<{ account: any; networkConfig: any }> {
  // Check wallet connection
  const account = getAccount(wagmiConfig);
  if (!account.isConnected) {
    throw new Error('Wallet not connected. Please connect your wallet first.');
  }
  
  // Validate network configuration exists
  const networkConfig = getNetworkConfig(chainId);
  if (!networkConfig) {
    throw new Error(`Unsupported network. Chain ID ${chainId} is not configured.`);
  }
  
  // Check current chain
  const currentChainId = getChainId(wagmiConfig);
  if (currentChainId !== chainId) {
    console.log(`Network mismatch. Current: ${currentChainId}, Required: ${chainId}`);
    
    try {
      // Attempt to switch network
      await switchChain(wagmiConfig, { chainId });
      console.log(`Successfully switched to chain ${chainId}`);
    } catch (switchError) {
      throw new Error(
        `Wrong network. Please switch to ${networkConfig.name} (Chain ID: ${chainId}) in your wallet.`
      );
    }
  }
  
  // Validate wallet address if provided
  if (walletAddress) {
    if (!isAddress(walletAddress)) {
      throw new Error(`Invalid wallet address format: ${walletAddress}`);
    }
    
    // Ensure provided address matches connected account
    if (account.address && getAddress(account.address) !== getAddress(walletAddress)) {
      throw new Error('Provided wallet address does not match connected account');
    }
  }
  
  return { account, networkConfig };
}

// Reference implementation structures
interface CompileRequest {
  source_code: string;
  contract_name?: string;
  user_id?: string;
  project_id?: string;
}

interface CompileResponse {
  success: boolean;
  bytecode?: string;
  deployment_data?: string;
  compressed_wasm_size?: number;
  error?: string;
}

interface PrepareDeploymentRequest {
  bytecode: string;
  constructor_args?: string[];
  sender_address: string;
}

interface PrepareActivationRequest {
  contract_address: string;
  sender_address: string;
  compressed_wasm_size?: number;
}

interface PreparedTransaction {
  to?: string;
  from: string;
  data: string;
  value: string;
  gas_limit: string;
  chain_id: number;
  nonce?: number;
}

// Global storage for compiled bytecode (like in reference)
let compiledBytecode: string | null = null;
let compressedWasmSize: number | null = null;

/**
 * Compile contract following reference implementation
 */
export async function compileContractForDeployment(
  sourceCode: string,
  contractName?: string,
  userId?: string,
  projectId?: string
): Promise<{ success: boolean; deployment_data?: string; compressed_wasm_size?: number; error?: string }> {
  try {
    console.log('Starting compilation...');
    
    const response = await axios.post(`${API_URL}/api/compile-user`, {
      source_code: sourceCode,
      contract_name: contractName || 'MyContract',
      user_id: userId,
      project_id: projectId
    });
    
    const result: CompileResponse = response.data;
    
    if (result.success && result.deployment_data) {
      // Store the deployment data and compressed size globally (like reference implementation)
      compiledBytecode = result.deployment_data;
      compressedWasmSize = result.compressed_wasm_size || null;
      console.log('Compilation successful! Deployment bytecode size:', compiledBytecode.length / 2, 'bytes');
      console.log('Compressed WASM size:', compressedWasmSize, 'bytes');
      return { 
        success: true, 
        deployment_data: result.deployment_data,
        compressed_wasm_size: result.compressed_wasm_size 
      };
    } else {
      console.error('Compilation failed:', result.error);
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.error('Compilation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Compilation failed' 
    };
  }
}

/**
 * Deploy contract using Wizard Wallet (backend private key)
 */
export async function deployWithWizardWallet(
  userId: string,
  projectId: string
): Promise<DeploymentResult> {
  try {
    // Use the wizard deployment endpoint
    const response = await axios.post(`${API_URL}/api/deploy/wizard`, {
      user_id: userId,
      project_id: projectId,
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Deployment failed');
    }

    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      throw new Error(error.response.data.error?.message || 'Failed to deploy contract');
    }
    throw error;
  }
}

/**
 * Deploy contract using user's connected wallet (REFERENCE IMPLEMENTATION PATTERN)
 */
export async function deployWithUserWallet(
  userId: string,
  projectId: string,
  chainId: number,
  walletAddress: string,
  sourceCode?: string
): Promise<DeploymentResult> {
  try {
    // Validate wallet and network connection
    const { account, networkConfig } = await validateWalletAndNetwork(chainId, walletAddress);
    const checksummedAddress = getAddress(walletAddress || account.address!);
    
    console.log(`Deploying to ${networkConfig.name} (Chain ID: ${chainId})`);
    console.log(`Using wallet: ${checksummedAddress}`);
    
    // Step 1: Compile if we don't have bytecode (or if source code provided)
    if (!compiledBytecode || sourceCode) {
      if (!sourceCode) {
        throw new Error('No compiled bytecode available and no source code provided');
      }
      
      console.log('Compiling contract...');
      const compileResult = await compileContractForDeployment(sourceCode, 'MyContract', userId, projectId);
      
      if (!compileResult.success) {
        throw new Error(compileResult.error || 'Compilation failed');
      }
      
      if (!compileResult.deployment_data) {
        throw new Error('Compilation succeeded but no deployment data returned');
      }
      
      compiledBytecode = compileResult.deployment_data;
      compressedWasmSize = compileResult.compressed_wasm_size || null;
    }
    
    if (!compiledBytecode) {
      throw new Error('No compiled bytecode available. Please compile your contract first.');
    }
    
    // Ensure we have compressed WASM size - extract from deployment data if needed
    if (!compressedWasmSize && compiledBytecode) {
      console.log('Extracting compressed WASM size from deployment data...');
      try {
        // Call backend to extract the size from deployment data
        const extractResponse = await axios.post(`${API_URL}/api/extract-wasm-size`, {
          deployment_data: compiledBytecode
        });
        
        if (extractResponse.data && extractResponse.data.compressed_wasm_size) {
          compressedWasmSize = extractResponse.data.compressed_wasm_size;
          console.log('Extracted compressed WASM size:', compressedWasmSize, 'bytes');
        }
      } catch (error) {
        console.warn('Failed to extract compressed WASM size, using fallback estimate');
        compressedWasmSize = 5800; // Use the estimate from our previous logs
      }
    }
    
    console.log('Using compiled bytecode:', compiledBytecode.slice(0, 20) + '...');
    
    // Step 2: Prepare deployment transaction
    console.log('Preparing deployment transaction...');
    
    const prepareResponse = await axios.post(`${API_URL}/api/prepare-deployment`, {
      bytecode: compiledBytecode,
      constructor_args: [], // Add constructor args if needed
      sender_address: checksummedAddress
    });

    if (!prepareResponse.data) {
      throw new Error('Failed to prepare deployment transaction');
    }

    const deployTxData: PreparedTransaction = prepareResponse.data;
    console.log('Deploy TX Data:', deployTxData);
    
    // Step 3: Sign and send deployment transaction
    console.log('Deploying contract directly...');
    console.log('Please sign the deployment transaction in your wallet');
    
    const deployTx = await sendTransaction(wagmiConfig, {
      to: deployTxData.to ? (deployTxData.to as `0x${string}`) : undefined, // Contract creation
      data: deployTxData.data as `0x${string}`,
      value: BigInt(deployTxData.value || "0"),
      gas: BigInt(deployTxData.gas_limit || "5000000"),
      chainId: chainId
    });
    
    console.log('Deployment TX sent:', deployTx);
    
    // Step 4: Wait for deployment confirmation
    const deployReceipt = await waitForTransactionReceipt(wagmiConfig, {
      hash: deployTx,
    });
    
    console.log('Deployment receipt:', deployReceipt);
    
    if (deployReceipt.status !== 'success') {
      throw new Error('Deployment transaction failed');
    }
    
    // Get the deployed contract address
    const deployedAddress = deployReceipt.contractAddress;
    if (!deployedAddress) {
      throw new Error('No contract address found in deployment receipt');
    }
    
    console.log('Contract deployed at:', deployedAddress);
    
    // Step 5: Check if contract is already activated with deployment bytecode
    console.log('Checking if contract is already activated...');
    
    const checkResponse = await axios.post(`${API_URL}/api/check-activation`, {
      contract_address: deployedAddress,
      deployment_bytecode: compiledBytecode, // Include bytecode for more accurate checking
      compressed_wasm_size: compressedWasmSize,
      chain_id: chainId, // Check activation on the correct chain
    });
    
    console.log('Check activation response:', checkResponse.data);
    
    if (checkResponse.data && checkResponse.data.is_activated) {
      console.log('Contract is already activated! Skipping activation transaction.');
      console.log(`Contract version: ${checkResponse.data.version}`);
      
      // Return early with successful deployment but no activation transaction
      const deploymentResult: DeploymentResult = {
        success: true,
        transaction: {
          deployment_tx_hash: deployReceipt.transactionHash,
          activation_tx_hash: null, // No activation needed
          contract_address: deployedAddress,
          deployer_address: deployReceipt.from,
          chain_id: chainId,
        },
        deployment_time: Date.now() / 1000,
        gas_used: Number(deployReceipt.gasUsed).toString(),
        deployment_cost: '0', // TODO: Calculate from gas used * gas price
        verification_status: 'unverified',
      };
      
      // Save deployment to backend
      await saveDeploymentToBackend(userId, projectId, deploymentResult);
      
      return deploymentResult;
    }
    
    console.log('Contract is not activated yet. Proceeding with activation...');
    
    // Step 6: Prepare activation transaction
    console.log('Preparing activation transaction...');
    
    const activateResponse = await axios.post(`${API_URL}/api/prepare-activation`, {
      contract_address: deployedAddress,
      sender_address: checksummedAddress,
      compressed_wasm_size: compressedWasmSize
    });

    if (!activateResponse.data) {
      throw new Error('Failed to prepare activation transaction');
    }

    const activateTxData: PreparedTransaction = activateResponse.data;
    console.log('Activation TX Data:', activateTxData);
    
    // Step 7: Sign and send activation transaction
    console.log('Please sign the activation transaction in your wallet');
    
    let activateReceipt;
    try {
      const activateTx = await sendTransaction(wagmiConfig, {
        to: activateTxData.to as `0x${string}`, // ArbWasm precompile
        data: activateTxData.data as `0x${string}`,
        value: BigInt(activateTxData.value), // Data fee - CRITICAL for activation
        gas: BigInt(activateTxData.gas_limit),
        chainId: chainId
      });
      
      console.log('Activation TX sent:', activateTx);
      
      // Step 8: Wait for activation confirmation
      activateReceipt = await waitForTransactionReceipt(wagmiConfig, {
        hash: activateTx,
      });
      
      console.log('Activation receipt:', activateReceipt);
      
      if (activateReceipt.status !== 'success') {
        throw new Error('Activation transaction failed');
      }
      
      console.log('Contract activated successfully!');
      
    } catch (activationError: any) {
      console.error('Activation error:', activationError);
      
      // Check if this is a ProgramUpToDate error (which is actually success)
      const categorizedError = categorizeError(activationError);
      
      if (categorizedError.type === DeploymentErrorType.PROGRAM_UP_TO_DATE) {
        console.log('Contract is already activated (ProgramUpToDate) - treating as success');
        
        // Return successful deployment without activation transaction
        const deploymentResult: DeploymentResult = {
          success: true,
          transaction: {
            deployment_tx_hash: deployReceipt.transactionHash,
            activation_tx_hash: null, // No activation needed - already activated
            contract_address: deployedAddress,
            deployer_address: deployReceipt.from,
            chain_id: chainId,
          },
          deployment_time: Date.now() / 1000,
          gas_used: Number(deployReceipt.gasUsed).toString(),
          deployment_cost: '0', // TODO: Calculate from gas used * gas price
          verification_status: 'unverified',
        };
        
        // Save deployment to backend
        await saveDeploymentToBackend(userId, projectId, deploymentResult);
        
        return deploymentResult;
      }
      
      // Re-throw other activation errors
      throw activationError;
    }

    // Step 9: Return deployment result
    const deploymentResult: DeploymentResult = {
      success: true,
      transaction: {
        deployment_tx_hash: deployReceipt.transactionHash,
        activation_tx_hash: activateReceipt.transactionHash || null,
        contract_address: deployedAddress,
        deployer_address: deployReceipt.from,
        chain_id: chainId,
      },
      deployment_time: Date.now() / 1000,
      gas_used: (Number(deployReceipt.gasUsed) + Number(activateReceipt.gasUsed || 0)).toString(),
      deployment_cost: '0', // TODO: Calculate from gas used * gas price
      verification_status: 'unverified',
    };
    
    // Step 9: Save deployment to backend with ABI
    await saveDeploymentToBackend(userId, projectId, deploymentResult);
    
    return deploymentResult;
  } catch (error) {
    console.error('User wallet deployment error:', error);
    
    // Categorize error for better UX
    const categorizedError = categorizeError(error);
    
    // Special handling for ProgramUpToDate - this should never reach here but just in case
    if (categorizedError.type === DeploymentErrorType.PROGRAM_UP_TO_DATE) {
      console.log('ProgramUpToDate detected at top level - this should not happen');
      // This case should be handled earlier, but if it reaches here, don't treat as failure
      throw new Error('Contract is already activated. Please refresh and try interacting with it.');
    }
    
    // Enhanced error message with categorization
    let enhancedMessage = categorizedError.message;
    if (categorizedError.userAction) {
      enhancedMessage += `\n\n💡 ${categorizedError.userAction}`;
    }
    
    // Add network context for better debugging
    const networkConfig = getNetworkConfig(chainId);
    if (networkConfig) {
      enhancedMessage += `\n\n🌐 Network: ${networkConfig.name} (Chain ID: ${chainId})`;
    }
    
    // Log categorized error for debugging
    console.error('Categorized error:', {
      type: categorizedError.type,
      isRecoverable: categorizedError.isRecoverable,
      original: categorizedError.originalError
    });
    
    throw new Error(enhancedMessage);
  }
}

/**
 * Save deployment result to backend with validation
 */
async function saveDeploymentToBackend(
  userId: string,
  projectId: string,
  deployment: DeploymentResult
): Promise<void> {
  try {
    // Only save successful deployments
    if (!deployment.success || !deployment.transaction?.contract_address) {
      console.warn('Skipping save - deployment was not successful or missing contract address');
      return;
    }
    
    console.log('Saving successful deployment to backend...', {
      contractAddress: deployment.transaction.contract_address,
      chainId: deployment.transaction.chain_id,
      hasActivation: !!deployment.transaction.activation_tx_hash
    });
    
    await axios.post(`${API_URL}/api/deployments/save`, {
      user_id: userId,
      project_id: projectId,
      deployment
    });
    
    console.log('Deployment saved successfully to backend');
  } catch (error) {
    console.error('Failed to save deployment to backend:', error);
    // Don't throw - deployment succeeded even if saving failed
    // But log it properly for debugging
  }
}

/**
 * Get deployment mode display info
 */
export function getDeploymentModeInfo(mode: 'wizard' | 'user', chainId?: number) {
  const networkConfig = chainId ? getNetworkConfig(chainId) : null;
  
  if (mode === 'wizard') {
    return {
      mode: 'wizard' as const,
      displayName: 'Wizard Wallet',
      description: 'Gas-free deployment using Wizard\'s managed wallet',
      icon: '🧙‍♂️',
      badge: 'Free',
      network: networkConfig?.name || 'Unknown Network'
    };
  } else {
    return {
      mode: 'user' as const,
      displayName: 'External Wallet',
      description: 'Deploy using your connected wallet',
      icon: '👛',
      badge: 'Your Wallet',
      network: networkConfig?.name || 'Unknown Network'
    };
  }
}

/**
 * Check if deployment mode is available for the given chain
 */
export function isDeploymentModeAvailable(mode: 'wizard' | 'user', chainId?: number): boolean {
  if (mode === 'user') {
    // External wallet deployment available for all configured networks
    return chainId ? !!getNetworkConfig(chainId) : true;
  } else {
    // Wizard wallet only available for specific networks
    const networkConfig = chainId ? getNetworkConfig(chainId) : null;
    return networkConfig?.wizardWalletSupported || false;
  }
}

/**
 * Main deployment function that checks mode and routes accordingly
 */
export async function deployContract(
  userId: string,
  projectId: string,
  deploymentMode: 'wizard' | 'user',
  chainId?: number,
  walletAddress?: string,
  sourceCode?: string
): Promise<DeploymentResult> {
  if (deploymentMode === 'wizard') {
    return deployWithWizardWallet(userId, projectId);
  } else {
    if (!chainId) {
      throw new Error('Chain ID required for external wallet deployment');
    }
    
    // Validate deployment mode is available for this chain
    if (!isDeploymentModeAvailable('user', chainId)) {
      const networkConfig = getNetworkConfig(chainId);
      throw new Error(
        `External wallet deployment not available for ${networkConfig?.name || 'this network'}. ` +
        'Please use a supported network or contact support.'
      );
    }
    
    if (!walletAddress) {
      throw new Error('Wallet address required for external wallet deployment');
    }
    
    return deployWithUserWallet(userId, projectId, chainId, walletAddress, sourceCode);
  }
}

/**
 * Clear compiled bytecode (useful for forcing recompilation)
 */
export function clearCompiledBytecode() {
  compiledBytecode = null;
  compressedWasmSize = null;
}