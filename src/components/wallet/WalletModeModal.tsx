import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Zap, Wallet } from 'lucide-react';
import { DeploymentMode } from '@/lib/wallet/config';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

interface WalletSelectionModalProps {
  open: boolean;
  onSelectMode: (mode: DeploymentMode) => void;
  onClose: () => void;
}

export function WalletSelectionModal({ open, onSelectMode, onClose }: WalletSelectionModalProps) {
  const { openConnectModal } = useConnectModal();
  const { isConnected } = useAccount();
  
  const handleModeSelect = (mode: DeploymentMode) => {
    console.log('WalletModeModal: Selected mode:', mode); // Debug log
    onSelectMode(mode);
    onClose();
    
    // If selecting personal wallet and not connected, open connect modal
    if (mode === 'user' && !isConnected && openConnectModal) {
      setTimeout(() => {
        openConnectModal();
      }, 200); // Delay to let the modal close smoothly
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Wallet Type</DialogTitle>
          <DialogDescription>
            Select how you want to deploy your contracts
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <Button
            className="w-full justify-start gap-3 h-auto py-4"
            variant="outline"
            onClick={() => handleModeSelect('wizard')}
          >
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-md">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <div className="font-medium">Wizard Wallet</div>
              <div className="text-sm text-muted-foreground">Free testnet deployments</div>
            </div>
          </Button>
          
          <Button
            className="w-full justify-start gap-3 h-auto py-4"
            variant="outline"
            onClick={() => handleModeSelect('user')}
          >
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-md">
              <Wallet className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-left">
              <div className="font-medium">Personal Wallet</div>
              <div className="text-sm text-muted-foreground">Use your own funds</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}