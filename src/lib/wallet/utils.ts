import { privateKeyToAccount } from 'viem/accounts';

/**
 * Get the wallet address from a private key
 */
export function getAddressFromPrivateKey(privateKey: string): string {
  try {
    // Ensure private key has 0x prefix
    const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const account = privateKeyToAccount(key as `0x${string}`);
    return account.address;
  } catch (error) {
    console.error('Failed to derive address from private key:', error);
    return '0x...';
  }
}

/**
 * Format an address for display
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get the wizard wallet address from environment variable
 */
export function getWizardWalletAddress(): string {
  const privateKey = import.meta.env.VITE_CONTRACT_PRIVATE_KEY;
  if (!privateKey) return '0x...';
  return getAddressFromPrivateKey(privateKey);
}

/**
 * Get the wizard wallet private key for backend deployment
 */
export function getWizardWalletPrivateKey(): string | null {
  return import.meta.env.VITE_CONTRACT_PRIVATE_KEY || null;
}