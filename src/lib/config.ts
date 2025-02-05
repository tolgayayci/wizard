// API Configuration
export const API_URL = import.meta.env.VITE_API_URL;

// Blockchain Configuration
export const BLOCKCHAIN_CONFIG = {
  arbitrumSepolia: {
    rpc: import.meta.env.VITE_ARB_SEPOLIA_RPC_URL,
    chainId: parseInt(import.meta.env.VITE_ARB_SEPOLIA_CHAIN_ID),
    name: "Arbitrum Sepolia",
    explorerUrl: import.meta.env.VITE_ARB_SEPOLIA_EXPLORER_URL,
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

// Helper function to get explorer URL for transaction
export function getExplorerTxUrl(txHash: string): string {
  return `${BLOCKCHAIN_CONFIG.arbitrumSepolia.explorerUrl}/tx/${txHash}`;
}

// Helper function to get explorer URL for address
export function getExplorerAddressUrl(address: string): string {
  return `${BLOCKCHAIN_CONFIG.arbitrumSepolia.explorerUrl}/address/${address}`;
}

// Helper function to get avatar URL
export function getAvatarUrl(seed: string): string {
  return `${SERVICES.avatar}/${seed}`;
}