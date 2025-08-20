import { Info, Clock, Code2, Copy, FileCode2, ExternalLink, Wallet, Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Deployment } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { BLOCKCHAIN_CONFIG, getNetworkInfo, getExplorerAddressUrl } from '@/lib/config';

interface ABIContractSelectorProps {
  contractAddress: string;
  onAddressChange: (address: string) => void;
  error?: string | null;
  deployments: Deployment[];
  isLoading?: boolean;
}

export function ABIContractSelector({ 
  contractAddress, 
  onAddressChange,
  error,
  deployments,
  isLoading
}: ABIContractSelectorProps) {
  const { toast } = useToast();
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const selectedDeployment = deployments.find(d => d.contract_address === contractAddress);

  const formatDeploymentTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const handleCopyCode = async () => {
    if (!selectedDeployment) return;
    await navigator.clipboard.writeText(selectedDeployment.deployed_code);
    toast({
      title: "Copied",
      description: "Contract code copied to clipboard",
    });
  };

  const handleOpenExplorer = (address: string, chainId?: number) => {
    const url = chainId ? getExplorerAddressUrl(address, chainId) : `${BLOCKCHAIN_CONFIG.arbitrumSepolia.explorerUrl}/address/${address}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="p-4 border-b bg-muted/20">
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-4 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-10 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 border-b bg-muted/20">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Contract Address</label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Select a deployed contract address</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={contractAddress}
              onValueChange={onAddressChange}
              disabled={deployments.length === 0}
            >
              <SelectTrigger className="w-full font-mono text-xs">
                <SelectValue placeholder={
                  deployments.length === 0 
                    ? "No deployments found" 
                    : "Select a deployed contract"
                } />
              </SelectTrigger>
              <SelectContent>
                {deployments.map((deployment) => (
                  <SelectItem 
                    key={deployment.contract_address} 
                    value={deployment.contract_address}
                    className="font-mono text-xs"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate">{deployment.contract_address}</span>
                        {deployment.network_info && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                            {deployment.network_info.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        {deployment.deployment_mode && (
                          <div className="flex items-center gap-1">
                            <Wallet className="h-3 w-3" />
                            <span>{deployment.deployment_mode === 'wizard' ? 'Wizard' : 'External'}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDeploymentTime(deployment.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDeployment && (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 gap-1.5 flex-none"
                onClick={() => setShowCodeDialog(true)}
              >
                <Code2 className="h-4 w-4" />
                <span className="text-xs">View Code</span>
              </Button>
            )}
          </div>
          
          {/* Deployment Info */}
          {selectedDeployment && (
            <div className="space-y-3">
              {/* Network and Wallet Badges */}
              <div className="px-4 py-2 border-t bg-muted/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedDeployment.network_info && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                        <Globe className="h-4 w-4" />
                        <span>{selectedDeployment.network_info.name}</span>
                        {selectedDeployment.network_info.is_testnet && (
                          <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 rounded text-xs">
                            Testnet
                          </span>
                        )}
                      </div>
                    )}
                    {selectedDeployment.deployment_mode && (
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                        selectedDeployment.deployment_mode === 'wizard'
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                      )}>
                        <Wallet className="h-4 w-4" />
                        <span>
                          {selectedDeployment.deployment_mode === 'wizard' ? 'Wizard Wallet' : 'External Wallet'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Deployer Info */}
              {selectedDeployment.deployer_address && (
                <div className="px-4 pb-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Deployer:</span>
                    <code className="font-mono text-xs bg-muted/50 px-2 py-1 rounded flex-1 min-w-0">
                      <span className="truncate">
                        {selectedDeployment.deployer_address}
                      </span>
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-none"
                      onClick={() => handleOpenExplorer(selectedDeployment.deployer_address!, selectedDeployment.network_info?.chain_id)}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              
              {/* External Wallet Warning */}
              {selectedDeployment.deployment_mode === 'user' && (
                <div className="px-4 pb-3">
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-none" />
                      <div className="text-xs text-yellow-600 dark:text-yellow-400">
                        <p className="font-medium">External wallet deployment detected</p>
                        <p className="mt-1 opacity-90">
                          Connect your wallet to interact with this contract. Wizard wallet cannot execute transactions on contracts deployed with external wallets.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {error && (
            <p className="text-sm text-red-500 flex items-center gap-1 px-4">
              <Info className="h-4 w-4" />
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Code Dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode2 className="h-5 w-5" />
              Contract Source Code
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 mt-4">
            {/* File Header */}
            <div className="flex items-center justify-between p-3 bg-muted/50 border rounded-t-lg">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Contract.rs</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={handleCopyCode}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
            </div>

            {/* Code Content */}
            <div className="border-x border-b rounded-b-lg">
              <ScrollArea className="h-[500px] w-full">
                <pre className={cn(
                  "p-4 text-sm font-mono leading-relaxed",
                  "bg-muted/20 dark:bg-muted/5"
                )}>
                  <code>{selectedDeployment?.deployed_code}</code>
                </pre>
              </ScrollArea>
            </div>

            {/* Contract Info */}
            <div className="mt-4 p-4 border rounded-lg space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Contract Address</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs bg-muted/50 px-2 py-1 rounded">
                    {selectedDeployment?.contract_address}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => selectedDeployment && handleOpenExplorer(selectedDeployment.contract_address, selectedDeployment.network_info?.chain_id)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Deployed</span>
                <span className="text-xs">
                  {selectedDeployment && formatDeploymentTime(selectedDeployment.created_at)}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}