import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Wallet } from 'lucide-react';
import { DeploymentMode } from '@/lib/wallet/config';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

interface WalletSelectionModalProps {
  open: boolean;
  onSelectMode: (mode: DeploymentMode) => void;
  onClose: () => void;
  currentMode?: DeploymentMode;
}

export function WalletSelectionModal({ open, onSelectMode, onClose, currentMode }: WalletSelectionModalProps) {
  const { openConnectModal } = useConnectModal();
  const { isConnected } = useAccount();
  
  const handleModeSelect = (mode: DeploymentMode) => {
    console.log('WalletModeModal: Selected mode:', mode); // Debug log
    onSelectMode(mode);
    onClose();
    
    // If selecting external wallet and not connected, open connect modal
    if (mode === 'user' && !isConnected && openConnectModal) {
      setTimeout(() => {
        openConnectModal();
      }, 200); // Delay to let the modal close smoothly
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Your Wallet</DialogTitle>
          <DialogDescription>
            Select how you want to deploy and interact with your smart contracts
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-2">
          <Button
            className={`w-full justify-start gap-3 h-auto py-4 ${
              currentMode === 'wizard' 
                ? 'ring-2 ring-blue-500' 
                : ''
            }`}
            variant="outline"
            onClick={() => handleModeSelect('wizard')}
          >
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-md">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left flex-1">
              <div className="font-medium flex items-center gap-2">
                Wizard Wallet
                {currentMode === 'wizard' && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                    Selected
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Gas-free deployments using our managed wallet
              </div>
              <div className="text-xs mt-1">
                <span className="text-green-600 dark:text-green-400">Perfect for testing</span> • 
                <span className="text-blue-600 dark:text-blue-400 ml-1">Pre-funded</span> • 
                <span className="text-purple-600 dark:text-purple-400 ml-1">No wallet setup required</span>
              </div>
            </div>
          </Button>
          
          <Button
            className={`w-full justify-start gap-3 h-auto py-4 ${
              currentMode === 'user' 
                ? 'ring-2 ring-purple-500' 
                : ''
            }`}
            variant="outline"
            onClick={() => handleModeSelect('user')}
          >
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-md">
              <Wallet className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-left flex-1">
              <div className="font-medium flex items-center gap-2">
                External Wallet
                {currentMode === 'user' && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400">
                    Selected
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Connect your own wallet (MetaMask, Coinbase, etc.)
              </div>
              <div className="text-xs mt-1">
                <span className="text-green-600 dark:text-green-400">Full control</span> • 
                <span className="text-blue-600 dark:text-blue-400 ml-1">Your keys</span> • 
                <span className="text-purple-600 dark:text-purple-400 ml-1">Works on all networks</span>
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}