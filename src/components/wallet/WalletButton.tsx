import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Zap, Wallet, Settings, Copy, ExternalLink, ChevronDown, LogOut, Network } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { WalletSelectionModal } from './WalletModeModal';
import { DeploymentMode } from '@/lib/wallet/config';
import { useToast } from '@/hooks/use-toast';
import { getWizardWalletAddress, formatAddress } from '@/lib/wallet/utils';
import { useAccount } from 'wagmi';

export function WalletButton() {
  const { 
    deploymentMode, 
    setDeploymentMode, 
    selectedNetwork, 
    getNetworkName,
    getExplorerUrl,
    disconnectWallet,
    switchNetwork,
    availableNetworks,
  } = useWallet();
  
  const { isConnected, address: userAddress } = useAccount();
  const [showModeModal, setShowModeModal] = useState(false);
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);
  const { toast } = useToast();

  // Get wizard wallet address
  const wizardAddress = getWizardWalletAddress();
  const wizardAddressFormatted = formatAddress(wizardAddress);

  // No deployment mode selected - show initial connect button
  if (!deploymentMode) {
    return (
      <>
        <Button 
          onClick={() => setShowModeModal(true)}
          className="gap-2"
        >
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </Button>
        
        <WalletSelectionModal
          open={showModeModal}
          onSelectMode={(mode: DeploymentMode) => {
            setDeploymentMode(mode);
          }}
          onClose={() => setShowModeModal(false)}
          currentMode={deploymentMode}
        />
      </>
    );
  }

  // Wizard Wallet mode - button with dropdown
  if (deploymentMode === 'wizard') {
    return (
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span>Wizard Wallet</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">Superposition Testnet</Badge>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {/* Wallet Info */}
            <div className="px-3 py-2">
              <div className="font-medium">Wizard Wallet</div>
              <div className="text-sm text-muted-foreground font-mono">
                {wizardAddressFormatted}
              </div>
            </div>
            
            <DropdownMenuSeparator />
            
            {/* Network Info */}
            <div className="px-3 py-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Network: </span>
                <span className="font-medium">Superposition Testnet</span>
              </div>
            </div>
            
            <DropdownMenuSeparator />
            
            {/* Actions */}
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(wizardAddress);
                toast({
                  title: 'Address copied',
                  description: 'Wizard wallet address copied to clipboard',
                });
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Address
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={() => {
                const url = getExplorerUrl('address', wizardAddress);
                if (url !== '#') {
                  window.open(url, '_blank');
                }
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Explorer
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            {/* Switch Mode */}
            <DropdownMenuItem 
              onClick={() => setShowModeModal(true)}
              className="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 focus:bg-purple-100 dark:focus:bg-purple-900/30"
            >
              <Settings className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
              Switch to External Wallet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <WalletSelectionModal
          open={showModeModal}
          onSelectMode={(mode: DeploymentMode) => {
            setDeploymentMode(mode);
          }}
          onClose={() => setShowModeModal(false)}
          currentMode={deploymentMode}
        />
      </div>
    );
  }

  // Personal Wallet mode - Enhanced with custom controls
  if (deploymentMode === 'user') {
    return (
      <div className="flex items-center gap-2">
        {/* Use RainbowKit's ConnectButton with custom chain switcher */}
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            mounted,
          }) => {
            const ready = mounted;
            const connected = ready && account && chain;

            return (
              <div
                {...(!ready && {
                  'aria-hidden': true,
                  'style': {
                    opacity: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <Button onClick={openConnectModal}>
                        <Wallet className="h-4 w-4 mr-2" />
                        Connect Wallet
                      </Button>
                    );
                  }

                  if (chain.unsupported) {
                    return (
                      <Button onClick={openChainModal} variant="destructive">
                        Wrong network
                      </Button>
                    );
                  }

                  return (
                    <div className="flex items-center gap-2">
                      {/* Network Selector */}
                      <Button
                        onClick={openChainModal}
                        variant="outline"
                        className="gap-2"
                      >
                        <Network className="h-4 w-4" />
                        {chain.name}
                      </Button>

                      {/* Account Button with Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="gap-2">
                            <Wallet className="h-4 w-4" />
                            {account.displayName}
                            {account.displayBalance && (
                              <Badge variant="secondary" className="ml-1">
                                {account.displayBalance}
                              </Badge>
                            )}
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          {/* Account Info */}
                          <div className="px-3 py-2">
                            <div className="font-medium">Connected Wallet</div>
                            <div className="text-sm text-muted-foreground font-mono">
                              {formatAddress(account.address)}
                            </div>
                          </div>
                          
                          <DropdownMenuSeparator />
                          
                          {/* Actions */}
                          <DropdownMenuItem onClick={openAccountModal}>
                            <Settings className="h-4 w-4 mr-2" />
                            Account Details
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => {
                              navigator.clipboard.writeText(account.address);
                              toast({
                                title: 'Address copied',
                                description: 'Wallet address copied to clipboard',
                              });
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Address
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => {
                              const url = getExplorerUrl('address', account.address);
                              if (url !== '#') {
                                window.open(url, '_blank');
                              }
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View on Explorer
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          {/* Switch to Wizard Wallet */}
                          <DropdownMenuItem 
                            onClick={() => setShowModeModal(true)}
                            className="text-blue-600 dark:text-blue-400"
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Switch to Wizard Wallet
                          </DropdownMenuItem>
                          
                          {/* Disconnect */}
                          <DropdownMenuItem 
                            onClick={disconnectWallet}
                            className="text-red-600 dark:text-red-400"
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Disconnect
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
        
        <WalletSelectionModal
          open={showModeModal}
          onSelectMode={(mode: DeploymentMode) => {
            setDeploymentMode(mode);
          }}
          onClose={() => setShowModeModal(false)}
          currentMode={deploymentMode}
        />
      </div>
    );
  }

  return null;
}