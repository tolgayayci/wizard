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
import { Zap, Wallet, Settings, Copy, ExternalLink, ChevronDown } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { WalletSelectionModal } from './WalletModeModal';
import { DeploymentMode } from '@/lib/wallet/config';
import { useToast } from '@/hooks/use-toast';
import { getWizardWalletAddress, formatAddress } from '@/lib/wallet/utils';

export function WalletButton() {
  const { 
    deploymentMode, 
    setDeploymentMode, 
    selectedNetwork, 
    getNetworkName,
    getExplorerUrl,
  } = useWallet();
  
  const [showModeModal, setShowModeModal] = useState(false);
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
              Wizard Wallet
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
                <span className="font-medium">{getNetworkName(selectedNetwork.id)}</span>
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
            <DropdownMenuItem onClick={() => setShowModeModal(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Switch to Personal Wallet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Badge variant="secondary">Testnet</Badge>
        
        <WalletSelectionModal
          open={showModeModal}
          onSelectMode={(mode: DeploymentMode) => {
            setDeploymentMode(mode);
          }}
          onClose={() => setShowModeModal(false)}
        />
      </div>
    );
  }

  // Personal Wallet mode - use RainbowKit directly
  if (deploymentMode === 'user') {
    return (
      <div className="flex items-center gap-2">
        <ConnectButton />
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setShowModeModal(true)}
        >
          <Settings className="h-4 w-4" />
        </Button>
        
        <WalletSelectionModal
          open={showModeModal}
          onSelectMode={(mode: DeploymentMode) => {
            setDeploymentMode(mode);
          }}
          onClose={() => setShowModeModal(false)}
        />
      </div>
    );
  }

  return null;
}