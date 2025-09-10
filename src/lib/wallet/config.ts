import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrum as arbitrumBase, arbitrumSepolia } from 'wagmi/chains';
import { Chain } from 'viem';

// Custom Arbitrum One configuration with explicit name
export const arbitrum: Chain = {
  ...arbitrumBase,
  name: 'Arbitrum One',
};

// Custom Superposition mainnet configuration
export const superpositionMainnet: Chain = {
  id: 55244,
  name: 'Superposition',
  network: 'superposition',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.superposition.so'],
    },
    public: {
      http: ['https://rpc.superposition.so'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Superposition Explorer',
      url: 'https://explorer.superposition.so',
    },
  },
  testnet: false,
};

// Custom Superposition testnet configuration
export const superpositionTestnet: Chain = {
  id: 98985,
  name: 'Superposition Testnet',
  network: 'superposition-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.superposition.so'],
    },
    public: {
      http: ['https://testnet-rpc.superposition.so'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Superposition Testnet Explorer',
      url: 'https://testnet-explorer.superposition.so',
    },
  },
  testnet: true,
};

// Backward compatibility alias
export const superposition = superpositionTestnet;

// Define supported networks
export const supportedChains: readonly [Chain, ...Chain[]] = [
  arbitrum,
  arbitrumSepolia,
  superpositionTestnet,
] as const;

// Network configurations for deployment
export const networkConfigs = {
  // Superposition Networks
  [superpositionMainnet.id]: {
    name: 'Superposition',
    symbol: 'ETH',
    explorerUrl: 'https://explorer.superposition.so',
    rpcUrl: 'https://rpc.superposition.so',
    isTestnet: false,
    faucetUrl: null,
    wizardWalletSupported: true,
  },
  [superpositionTestnet.id]: {
    name: 'Superposition Testnet',
    symbol: 'ETH',
    explorerUrl: 'https://testnet-explorer.superposition.so',
    rpcUrl: 'https://testnet-rpc.superposition.so',
    isTestnet: true,
    faucetUrl: 'https://faucet.superposition.so',
    wizardWalletSupported: true,
  },
  // Arbitrum Networks  
  [arbitrum.id]: {
    name: 'Arbitrum One',
    symbol: 'ETH',
    explorerUrl: 'https://arbiscan.io',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    isTestnet: false,
    faucetUrl: null,
    wizardWalletSupported: false,
  },
  [arbitrumSepolia.id]: {
    name: 'Superposition Testnet',
    symbol: 'ETH',
    explorerUrl: 'https://sepolia.arbiscan.io',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    isTestnet: true,
    faucetUrl: 'https://bridge.arbitrum.io',
    wizardWalletSupported: true,
  },
} as const;

// WalletConnect project ID from environment variables
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'a5f45a93797ad2d4a96c96b8c63e29e2';

// Wagmi configuration
export const wagmiConfig = getDefaultConfig({
  appName: 'Wizard IDE',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: supportedChains,
  ssr: false, // We're not using SSR
});

// Deployment mode types
export type DeploymentMode = 'wizard' | 'user';

// Network helper functions
export const getNetworkConfig = (chainId: number) => {
  return networkConfigs[chainId as keyof typeof networkConfigs] || null;
};

export const isWizardWalletSupported = (chainId: number): boolean => {
  const config = getNetworkConfig(chainId);
  return config?.wizardWalletSupported || false;
};

export const getExplorerUrl = (chainId: number, type: 'address' | 'tx', value: string): string => {
  const config = getNetworkConfig(chainId);
  if (!config) return '#';
  
  return `${config.explorerUrl}/${type}/${value}`;
};

// Custom chain creator for Orbit chains
export const createCustomChain = (
  chainId: number,
  name: string,
  rpcUrl: string,
  explorerUrl?: string
): Chain => ({
  id: chainId,
  name,
  network: name.toLowerCase().replace(/\s+/g, '-'),
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: [rpcUrl] },
    public: { http: [rpcUrl] },
  },
  blockExplorers: explorerUrl ? {
    default: {
      name: `${name} Explorer`,
      url: explorerUrl,
    },
  } : undefined,
  testnet: true, // Assume custom chains are testnets
});

// Default chain for new users
export const defaultChain = superposition;