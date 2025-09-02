// Backend Configuration
export const API_URL = import.meta.env.VITE_API_URL;
export const WS_URL = API_URL.replace(/^http/, 'ws');

// Blockchain Configuration (Legacy - use NETWORK_CONFIGS for new code)
export const BLOCKCHAIN_CONFIG = {
  superposition: {
    rpc: import.meta.env.VITE_SUPERPOSITION_RPC_URL || 'https://testnet-rpc.superposition.so',
    chainId: parseInt(import.meta.env.VITE_SUPERPOSITION_CHAIN_ID) || 98985,
    name: "Superposition Testnet",
    explorerUrl: import.meta.env.VITE_SUPERPOSITION_EXPLORER_URL || 'https://testnet-explorer.superposition.so',
    currency: 'ETH',
  },
  // Keep arbitrumSepolia for backward compatibility
  arbitrumSepolia: {
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
    chainId: 421614,
    name: "Arbitrum Sepolia",
    explorerUrl: 'https://sepolia.arbiscan.io',
    currency: 'ETH',
  },
} as const;

// Analytics Configuration
export const GA_TRACKING_ID = import.meta.env.VITE_GA_TRACKING_ID;

// Application URLs
export const APP_URLS = {
  base: import.meta.env.VITE_APP_URL,
  docs: import.meta.env.VITE_DOCS_URL,
  telegram: import.meta.env.VITE_TELEGRAM_URL,
} as const;

// Services
export const SERVICES = {
  avatar: import.meta.env.VITE_AVATAR_SERVICE_URL,
} as const;

// Supabase Configuration
export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
} as const;

// Network configurations for multiple chains
export const NETWORK_CONFIGS = {
  // Superposition Networks
  55244: {
    chainId: 55244,
    name: 'Superposition',
    rpcUrl: 'https://rpc.superposition.so',
    explorerUrl: 'https://explorer.superposition.so',
    isTestnet: false,
    currency: 'ETH',
  },
  98985: {
    chainId: 98985,
    name: 'Superposition Testnet',
    rpcUrl: 'https://testnet-rpc.superposition.so',
    explorerUrl: 'https://testnet-explorer.superposition.so',
    isTestnet: true,
    currency: 'ETH',
  },
  // Arbitrum Networks
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    isTestnet: false,
    currency: 'ETH',
  },
  421614: {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
    isTestnet: true,
    currency: 'ETH',
  },
} as const;

// Helper function to get network info by chain ID
export function getNetworkInfo(chainId: number) {
  return NETWORK_CONFIGS[chainId as keyof typeof NETWORK_CONFIGS] || {
    chainId,
    name: `Chain ${chainId}`,
    explorerUrl: '',
    isTestnet: true,
    currency: 'ETH',
  };
}

// Helper function to get explorer URL by chain ID
export function getExplorerUrlByChainId(chainId: number, type: 'tx' | 'address', value: string): string {
  const network = getNetworkInfo(chainId);
  if (!network.explorerUrl) return '#';
  return `${network.explorerUrl}/${type}/${value}`;
}

// Legacy helper functions (for backward compatibility)
export function getExplorerTxUrl(txHash: string, chainId?: number): string {
  if (chainId) {
    return getExplorerUrlByChainId(chainId, 'tx', txHash);
  }
  return `${BLOCKCHAIN_CONFIG.arbitrumSepolia.explorerUrl}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string, chainId?: number): string {
  if (chainId) {
    return getExplorerUrlByChainId(chainId, 'address', address);
  }
  return `${BLOCKCHAIN_CONFIG.arbitrumSepolia.explorerUrl}/address/${address}`;
}

// Helper function to get avatar URL
export function getAvatarUrl(seed: string): string {
  return `${SERVICES.avatar}/${seed}`;
}