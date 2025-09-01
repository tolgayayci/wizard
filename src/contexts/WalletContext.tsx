import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAccount, useChainId, useSwitchChain, useBalance, useDisconnect } from 'wagmi';
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
  
  // Wallet management
  disconnectWallet: () => Promise<void>;
  
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
  // Local state - Initialize first to avoid reference errors
  const [deploymentMode, setDeploymentModeState] = useState<DeploymentMode>('wizard');
  const [selectedNetwork, setSelectedNetworkState] = useState<Chain>(defaultChain);
  const [customNetworks, setCustomNetworks] = useState<Chain[]>([]);
  const [prevConnectionState, setPrevConnectionState] = useState(false);
  
  // Wagmi hooks
  const { isConnected, address, connector } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingNetwork, error: switchError } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const { data: balanceData } = useBalance({
    address: address,
  });

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

  // Get all available networks (built-in + custom) - moved up to be available early
  const availableNetworks = [
    ...supportedChains,
    ...customNetworks,
  ].filter(Boolean) as Chain[];

  // Set selected network
  const setSelectedNetwork = (network: Chain) => {
    setSelectedNetworkState(network);
  };

  // Switch network with improved error handling
  const switchNetwork = useCallback(async (targetChainId: number) => {
    // For wizard mode, just update the selected network
    if (deploymentMode === 'wizard') {
      const network = availableNetworks.find(n => n.id === targetChainId);
      if (network) {
        setSelectedNetworkState(network);
      }
      return;
    }
    
    // For user mode, switch the actual wallet network
    if (!isConnected) {
      console.warn('Cannot switch network: wallet not connected');
      return;
    }
    
    try {
      // Attempt to switch chain
      await switchChain({ chainId: targetChainId });
      
      // Update selected network after successful switch
      const network = availableNetworks.find(n => n.id === targetChainId);
      if (network) {
        setSelectedNetworkState(network);
      }
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      
      // Handle specific error cases
      if (error?.code === 4902 || error?.message?.includes('Unrecognized chain')) {
        // Chain not added to wallet - could prompt to add it
        console.warn('Chain not configured in wallet');
      } else if (error?.code === 4001) {
        // User rejected the switch
        console.warn('User rejected network switch');
      }
      
      // Don't throw, just log the error
      // This prevents the app from crashing on network switch failures
    }
  }, [deploymentMode, isConnected, switchChain, availableNetworks]);
  
  // Disconnect wallet and switch to wizard mode
  const disconnectWallet = useCallback(async () => {
    try {
      // Disconnect the wallet
      if (disconnect) {
        await disconnect();
      }
      
      // Switch to wizard mode
      setDeploymentMode('wizard');
      setSelectedNetworkState(defaultChain);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }, [disconnect]);

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
  }, [chainId, isConnected, deploymentMode, availableNetworks]);

  // Handle wallet connection/disconnection events
  useEffect(() => {
    // Detect disconnection (was connected, now not connected)
    if (prevConnectionState && !isConnected && deploymentMode === 'user') {
      console.log('Wallet disconnected, switching to wizard mode');
      // When wallet disconnects while in user mode, switch back to wizard mode
      setDeploymentMode('wizard');
      setSelectedNetworkState(defaultChain);
    }
    
    // Update previous connection state
    setPrevConnectionState(isConnected);
  }, [isConnected, prevConnectionState, deploymentMode]);
  
  // Listen for wallet events (network changes, account changes)
  useEffect(() => {
    if (!connector) return;
    
    const handleChange = () => {
      // Force a re-render when wallet state changes
      console.log('Wallet state changed');
    };
    
    // Listen to connector events if available
    if (connector.emitter) {
      connector.emitter.on('change', handleChange);
      
      return () => {
        connector.emitter.off('change', handleChange);
      };
    }
  }, [connector]);

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
    
    // Wallet management
    disconnectWallet,
    
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