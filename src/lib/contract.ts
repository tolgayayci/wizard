import { ethers } from 'ethers';
import { ContractConfig, ExecuteOptions } from './types';
import { BLOCKCHAIN_CONFIG } from './config';

export function getProvider() {
  return new ethers.JsonRpcProvider(BLOCKCHAIN_CONFIG.arbitrumSepolia.rpc);
}

export async function getSigner() {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed. Please install MetaMask to interact with the contract.");
  }

  try {
    // Check if we're on the right network
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (parseInt(chainId, 16) !== BLOCKCHAIN_CONFIG.arbitrumSepolia.chainId) {
      try {
        // Request network switch
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${BLOCKCHAIN_CONFIG.arbitrumSepolia.chainId.toString(16)}` }],
        });
      } catch (error: any) {
        if (error.code === 4902) {
          // Network needs to be added
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${BLOCKCHAIN_CONFIG.arbitrumSepolia.chainId.toString(16)}`,
              chainName: BLOCKCHAIN_CONFIG.arbitrumSepolia.name,
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: [BLOCKCHAIN_CONFIG.arbitrumSepolia.rpc],
              blockExplorerUrls: [BLOCKCHAIN_CONFIG.arbitrumSepolia.explorerUrl]
            }]
          });
        } else {
          throw new Error("Please switch to Arbitrum Sepolia network in your wallet.");
        }
      }
    }
    
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.BrowserProvider(window.ethereum);
    return provider.getSigner();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to get signer. Please check your wallet connection.");
  }
}

export async function verifyContract(address: string): Promise<boolean> {
  try {
    if (!ethers.isAddress(address)) {
      throw new Error("Invalid contract address format");
    }

    const provider = getProvider();
    
    // Verify we're on Arbitrum Sepolia
    const network = await provider.getNetwork();
    if (network.chainId !== BigInt(BLOCKCHAIN_CONFIG.arbitrumSepolia.chainId)) {
      throw new Error(`Wrong network. Please connect to ${BLOCKCHAIN_CONFIG.arbitrumSepolia.name}`);
    }

    // Get contract code
    const code = await provider.getCode(address);
    
    // If code is "0x" or empty, it means no contract exists at this address
    return code !== "0x" && code !== "";
  } catch (error) {
    console.error('Error verifying contract:', error);
    throw error;
  }
}

export function getContract(config: ContractConfig) {
  if (!config.address) {
    throw new Error("Contract address required");
  }
  
  const contract = new ethers.Contract(
    config.address,
    config.abi,
    config.signer || config.provider
  );

  return contract;
}

export function formatValue(value: any, type: string): any {
  if (value === null || value === undefined) return value;
  
  try {
    // Handle array types
    if (type.endsWith('[]')) {
      if (!Array.isArray(value)) {
        // If value is a Result object from ethers, convert it to array
        if (typeof value === 'object' && value.length !== undefined) {
          value = Array.from(value);
        } else {
          return value;
        }
      }
      return value;
    }

    // Handle basic types
    if (type.startsWith('uint') || type.startsWith('int')) {
      return value.toString();
    }
    
    if (type === 'bool') {
      return value;
    }
    
    if (type === 'address') {
      return value;
    }

    if (type === 'bytes32') {
      return value;
    }
    
    return value;
  } catch (error) {
    console.error('Error formatting value:', error);
    return value;
  }
}

export function parseValue(value: string, type: string): any {
  if (!value) {
    if (type.endsWith('[]')) return [];
    return null;
  }
  
  try {
    if (type.startsWith('uint') || type.startsWith('int')) {
      return BigInt(value);
    }
    
    if (type === 'bool') {
      const lowered = value.toLowerCase();
      if (lowered !== 'true' && lowered !== 'false') {
        throw new Error(`Invalid boolean value: ${value}`);
      }
      return lowered === 'true';
    }
    
    if (type === 'address') {
      if (!ethers.isAddress(value)) {
        throw new Error(`Invalid address format: ${value}`);
      }
      return ethers.getAddress(value);
    }
    
    if (type === 'bytes32') {
      if (!value.startsWith('0x') || value.length !== 66) {
        throw new Error(`Invalid bytes32 format: ${value}`);
      }
      return value;
    }
    
    if (type.endsWith('[]')) {
      try {
        const array = JSON.parse(value);
        if (!Array.isArray(array)) {
          throw new Error(`Value must be an array for type ${type}`);
        }
        return array.map(v => parseValue(v, type.slice(0, -2)));
      } catch (error) {
        throw new Error(`Invalid array format for type ${type}: ${error.message}`);
      }
    }
    
    return value;
  } catch (error) {
    throw new Error(`Error parsing ${type} value: ${error.message}`);
  }
}