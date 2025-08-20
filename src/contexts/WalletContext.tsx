import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useChainId, useSwitchChain, useBalance } from 'wagmi';
import { Chain } from 'viem';
import { 
  DeploymentMode, 
  getNetworkConfig, 
  isWizardWalletSupported, 
  defaultChain, 
  createCustomChain,
  supportedChains 
} from '@/lib/wallet/config';

// Wallet context state interface
interface WalletContextState {
  // Connection state
  isConnected: boolean;
  address: string | undefined;
  chainId: number;
  balance: bigint | undefined;
  
  // Deployment mode
  deploymentMode: DeploymentMode;
  setDeploymentMode: (mode: DeploymentMode) => void;
  
  // Network management
  selectedNetwork: Chain;
  setSelectedNetwork: (network: Chain) => void;
  availableNetworks: Chain[];
  isWizardWalletAvailable: boolean;
  
  // Custom networks
  customNetworks: Chain[];
  addCustomNetwork: (network: Chain) => void;
  removeCustomNetwork: (chainId: number) => void;
  
  // Network switching
  switchNetwork: (chainId: number) => Promise<void>;
  isSwitchingNetwork: boolean;
  
  // Utilities
  getNetworkName: (chainId: number) => string;
  getExplorerUrl: (type: 'address' | 'tx', value: string) => string;
  formatBalance: (balance: bigint | undefined) => string;
}

// Create context
const WalletContext = createContext<WalletContextState | undefined>(undefined);

// Provider component props
interface WalletProviderProps {
  children: ReactNode;
}

// Local storage keys
const DEPLOYMENT_MODE_KEY = 'wizard-deployment-mode';
const CUSTOM_NETWORKS_KEY = 'wizard-custom-networks';

export function WalletProvider({ children }: WalletProviderProps) {
  // Wagmi hooks
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingNetwork } = useSwitchChain();
  const { data: balanceData } = useBalance({
    address: address,
  });

  // Local state
  const [deploymentMode, setDeploymentModeState] = useState<DeploymentMode>('wizard');
  const [selectedNetwork, setSelectedNetworkState] = useState<Chain>(defaultChain);
  const [customNetworks, setCustomNetworks] = useState<Chain[]>([]);

  // Load saved settings from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem(DEPLOYMENT_MODE_KEY) as DeploymentMode;
    if (savedMode === 'wizard' || savedMode === 'user') {
      setDeploymentModeState(savedMode);
    }

    const savedCustomNetworks = localStorage.getItem(CUSTOM_NETWORKS_KEY);
    if (savedCustomNetworks) {
      try {
        const networks = JSON.parse(savedCustomNetworks);
        setCustomNetworks(networks);
      } catch (error) {
        console.warn('Failed to parse custom networks from localStorage:', error);
      }
    }
  }, []);

  // Save deployment mode to localStorage
  const setDeploymentMode = (mode: DeploymentMode) => {
    setDeploymentModeState(mode);
    localStorage.setItem(DEPLOYMENT_MODE_KEY, mode);
  };

  // Save custom networks to localStorage
  const saveCustomNetworks = (networks: Chain[]) => {
    setCustomNetworks(networks);
    localStorage.setItem(CUSTOM_NETWORKS_KEY, JSON.stringify(networks));
  };

  // Add custom network
  const addCustomNetwork = (network: Chain) => {
    const updated = [...customNetworks.filter(n => n.id !== network.id), network];
    saveCustomNetworks(updated);
  };

  // Remove custom network
  const removeCustomNetwork = (chainId: number) => {
    const updated = customNetworks.filter(n => n.id !== chainId);
    saveCustomNetworks(updated);
  };

  // Set selected network
  const setSelectedNetwork = (network: Chain) => {
    setSelectedNetworkState(network);
  };

  // Switch network
  const switchNetwork = async (chainId: number) => {
    if (!isConnected) return;
    
    try {
      await switchChain({ chainId });
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw error;
    }
  };

  // Get all available networks (built-in + custom)
  const availableNetworks = [
    ...supportedChains,
    ...customNetworks,
  ].filter(Boolean) as Chain[];

  // Check if wizard wallet is available for current network
  const isWizardWalletAvailable = isWizardWalletSupported(selectedNetwork.id);

  // Utility functions
  const getNetworkName = (chainId: number): string => {
    const config = getNetworkConfig(chainId);
    if (config) return config.name;
    
    const customNetwork = customNetworks.find(n => n.id === chainId);
    return customNetwork?.name || `Chain ${chainId}`;
  };

  const getExplorerUrl = (type: 'address' | 'tx', value: string): string => {
    const config = getNetworkConfig(selectedNetwork.id);
    if (!config) return '#';
    
    return `${config.explorerUrl}/${type}/${value}`;
  };

  const formatBalance = (balance: bigint | undefined): string => {
    if (!balance) return '0';
    
    // Convert wei to ether and format with 4 decimal places
    const ether = Number(balance) / 1e18;
    return ether.toFixed(4);
  };

  // Update selected network when chain changes (for connected wallets)
  useEffect(() => {
    if (isConnected && deploymentMode === 'user') {
      const networkConfig = getNetworkConfig(chainId);
      if (networkConfig) {
        // Find the network in our supported list
        const network = availableNetworks.find(n => n.id === chainId);
        if (network) {
          setSelectedNetworkState(network);
        }
      }
    }
  }, [chainId, isConnected, deploymentMode]);

  // Handle wallet disconnection
  useEffect(() => {
    if (!isConnected && deploymentMode === 'user') {
      // When wallet disconnects while in user mode, switch back to wizard mode
      setDeploymentMode('wizard');
      setSelectedNetworkState(defaultChain);
    }
  }, [isConnected, deploymentMode]);

  const contextValue: WalletContextState = {
    // Connection state
    isConnected,
    address,
    chainId,
    balance: balanceData?.value,
    
    // Deployment mode
    deploymentMode,
    setDeploymentMode,
    
    // Network management
    selectedNetwork,
    setSelectedNetwork,
    availableNetworks,
    isWizardWalletAvailable,
    
    // Custom networks
    customNetworks,
    addCustomNetwork,
    removeCustomNetwork,
    
    // Network switching
    switchNetwork,
    isSwitchingNetwork,
    
    // Utilities
    getNetworkName,
    getExplorerUrl,
    formatBalance,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

// Hook to use wallet context
export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

// Additional hooks for specific functionality
export function useDeploymentMode() {
  const { deploymentMode, setDeploymentMode } = useWallet();
  return { deploymentMode, setDeploymentMode };
}

export function useNetworkManagement() {
  const {
    selectedNetwork,
    setSelectedNetwork,
    availableNetworks,
    customNetworks,
    addCustomNetwork,
    removeCustomNetwork,
    switchNetwork,
    isSwitchingNetwork,
  } = useWallet();
  
  return {
    selectedNetwork,
    setSelectedNetwork,
    availableNetworks,
    customNetworks,
    addCustomNetwork,
    removeCustomNetwork,
    switchNetwork,
    isSwitchingNetwork,
  };
}