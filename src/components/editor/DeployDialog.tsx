import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  RocketIcon, 
  CheckCircle, 
  Terminal,
  Loader2,
  ExternalLink,
  Copy,
  Network,
  Box,
  Coins,
  AlertCircle,
  Info,
  Bug,
  Wallet,
  Zap,
  ChevronRight,
  Activity,
  HardDrive,
  Shield,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { CompilationResult, DeploymentResult } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { deployContract as deployContractService } from '@/lib/services/deployment';
import { verifyStylusContract, getVerificationUrl } from '@/lib/services/verification';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useWallet } from '@/contexts/WalletContext';
import { WalletSelectionModal } from '@/components/wallet/WalletModeModal';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { getNetworkConfig } from '@/lib/wallet/config';
import { useAccount } from 'wagmi';

interface DeployDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  lastCompilation: CompilationResult | null;
  onDeploySuccess?: () => void;
  showABIError?: boolean;
  onCompile?: () => void;
}

export function DeployDialog({
  open,
  onOpenChange,
  projectId,
  lastCompilation,
  onDeploySuccess,
  showABIError = false,
  onCompile,
}: DeployDialogProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { toast } = useToast();
  const { openConnectModal } = useConnectModal();
  const { connector } = useAccount();
  const { 
    deploymentMode, 
    setDeploymentMode,
    selectedNetwork, 
    isConnected, 
    address,
    balance,
    formatBalance 
  } = useWallet();
  
  // Local state for immediate UI updates
  const [localDeploymentMode, setLocalDeploymentMode] = useState(deploymentMode);

  // Reset deployment result when dialog is opened
  useEffect(() => {
    if (open) {
      setDeploymentResult(null);
      setIsDeploying(false);
    }
  }, [open]);
  
  // Sync local state with context state
  useEffect(() => {
    setLocalDeploymentMode(deploymentMode);
  }, [deploymentMode]);

  // Auto-switch to user mode when wallet is connected
  useEffect(() => {
    if (isConnected && deploymentMode === 'wizard') {
      // When wallet is connected, suggest switching to user mode
      console.log('Wallet connected, deployment mode is still wizard. Consider switching to user mode.');
    }
  }, [isConnected, deploymentMode]);

  const handleDeploy = async () => {
    if (showABIError) return;
    
    // Check wallet connection for user mode
    if (localDeploymentMode === 'user' && !isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to deploy",
        variant: "destructive",
      });
      // Open connect modal
      if (openConnectModal) {
        openConnectModal();
      }
      return;
    }
    
    setIsDeploying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      // Get project data for deployment
      const { data: project } = await supabase
        .from('projects')
        .select('code')
        .eq('id', projectId)
        .single();

      // Deploy the contract using the appropriate deployment method
      const result = await deployContractService(
        user.id, 
        projectId,
        localDeploymentMode,
        localDeploymentMode === 'user' ? selectedNetwork.id : undefined,
        localDeploymentMode === 'user' ? address : undefined,
        localDeploymentMode === 'user' ? (project?.code || lastCompilation?.code_snapshot) : undefined
      );
      
      // Check if deployment was successful
      if (!result.success) {
        throw new Error('Deployment failed - contract not deployed successfully');
      }

      // Extract contract address
      const contractAddress = result.transaction?.contract_address || result.contract_address;
      
      if (!contractAddress) {
        throw new Error('Deployment failed - no contract address returned');
      }

      setDeploymentResult(result);
      
      // Save deployment to database only if deployment was successful
      // Build network info based on selected network
      const networkInfo = {
        chain_id: localDeploymentMode === 'user' ? selectedNetwork.id : 98985,
        name: localDeploymentMode === 'user' ? selectedNetwork.name : 'Superposition Testnet',
        rpc_url: localDeploymentMode === 'user' ? selectedNetwork.rpcUrls?.default?.http?.[0] : 'https://testnet-rpc.superposition.so',
        explorer_url: localDeploymentMode === 'user' 
          ? (selectedNetwork.blockExplorers?.default?.url || 'https://testnet-explorer.superposition.so')
          : 'https://testnet-explorer.superposition.so',
        is_testnet: localDeploymentMode === 'user' 
          ? selectedNetwork.testnet !== false 
          : true,
        currency: localDeploymentMode === 'user' ? selectedNetwork.nativeCurrency?.symbol || 'ETH' : 'SPN'
      };

      console.log('Saving deployment with mode:', localDeploymentMode, 'address:', address);
      console.log('Network info:', networkInfo);

      const { error: dbError } = await supabase
        .from('deployments')
        .insert({
          project_id: projectId,
          contract_address: contractAddress,
          chain_id: networkInfo.chain_id,
          chain_name: networkInfo.name,
          deployment_mode: localDeploymentMode,
          deployer_address: localDeploymentMode === 'user' ? address : undefined,
          network_info: networkInfo,
          explorer_base_url: networkInfo.explorer_url,
          deployed_code: lastCompilation?.code_snapshot || '',
          abi: lastCompilation?.abi || [],
          metadata: {
            deployment_time: result.deployment_time || Date.now() / 1000,
            tx_hash: result.transaction?.deployment_tx_hash || result.transaction_hash,
            activation_tx_hash: result.transaction?.activation_tx_hash,
            gas_used: result.gas_used,
            deployment_cost: result.deployment_cost,
          }
        });

      if (dbError) throw dbError;

      // Get the inserted deployment record ID
      const { data: deploymentRecord } = await supabase
        .from('deployments')
        .select('id')
        .eq('contract_address', contractAddress)
        .eq('chain_id', localDeploymentMode === 'user' ? selectedNetwork.id : 98985)
        .single();

      toast({
        title: "Success",
        description: `Contract deployed successfully${localDeploymentMode === 'user' ? ' with your wallet' : ' using Wizard Wallet'}`,
      });

      // Start background verification for Arbitrum chains
      const chainId = localDeploymentMode === 'user' ? selectedNetwork.id : 98985;
      if (chainId === 42161 || chainId === 421614) {
        // Run verification in background without blocking UI
        setTimeout(async () => {
          try {
            // Get project name for verification
            const { data: project } = await supabase
              .from('projects')
              .select('name')
              .eq('id', projectId)
              .single();

            toast({
              title: "Verification Started",
              description: "Contract verification is running in the background...",
            });

            const verificationResult = await verifyStylusContract(
              contractAddress,
              projectId,
              chainId,
              lastCompilation?.code_snapshot || '',
              project?.name || 'StylusContract'
            );

            // Show result via toast
            if (verificationResult.status === 'verified') {
              toast({
                title: "Contract Verified ✅",
                description: "Your contract has been verified on Arbiscan",
                action: (
                  <Button variant="outline" size="sm" onClick={() => {
                    const verificationUrl = getVerificationUrl(contractAddress, chainId);
                    if (verificationUrl) window.open(verificationUrl, '_blank');
                  }}>
                    View on Arbiscan
                  </Button>
                ),
              });
            } else if (verificationResult.status === 'pending') {
              toast({
                title: "Verification Pending 🔄",
                description: "Contract verification is pending. Check status later.",
              });
            } else {
              toast({
                title: "Verification Failed ❌",
                description: verificationResult.message || 'Contract verification failed',
                variant: "destructive",
              });
            }
          } catch (error) {
            console.error('Background verification error:', error);
            toast({
              title: "Verification Error",
              description: "Failed to verify contract due to an error",
              variant: "destructive",
            });
          }
        }, 1000); // 1 second delay to let deployment complete
      }

      // Close dialog immediately - don't wait for verification
      onDeploySuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Deployment error:', error);
      
      // Extract detailed error message
      let errorMessage = "Failed to deploy contract";
      let errorDetails: string | undefined;
      
      if (error?.response?.data?.data?.deployment_output) {
        // For wizard deployment, show the cargo stylus output
        const output = error.response.data.data.deployment_output;
        
        // Extract key error messages from the output
        if (output.includes("Docker not running")) {
          errorMessage = "Docker not running";
          errorDetails = "Deployment requires Docker for reproducible builds. Please start Docker or contact support.";
        } else if (output.includes("insufficient funds")) {
          errorMessage = "Insufficient funds";
          errorDetails = "The deployment wallet doesn't have enough funds to pay for gas.";
        } else if (output.includes("network") || output.includes("connection")) {
          errorMessage = "Network connection failed";
          errorDetails = "Failed to connect to the blockchain network. Please try again.";
        } else if (output.includes("already deployed")) {
          errorMessage = "Contract already deployed";
          errorDetails = "This contract has already been deployed to the network.";
        } else {
          // Show first meaningful line of error
          const lines = output.split('\n').filter((line: string) => 
            line.trim() && !line.includes("NOTE:") && !line.includes("Running")
          );
          errorDetails = lines.find((line: string) => 
            line.toLowerCase().includes("error") || 
            line.toLowerCase().includes("failed")
          ) || lines[0];
        }
      } else if (error?.response?.data?.error?.details) {
        errorDetails = error.response.data.error.details;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Deployment Failed",
        description: (
          <div className="space-y-2">
            <p className="font-medium">{errorMessage}</p>
            {errorDetails && (
              <p className="text-sm text-muted-foreground">{errorDetails}</p>
            )}
          </div>
        ),
        variant: "destructive",
        duration: 8000, // Show for longer to read the details
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleWalletModeSelect = (mode: 'wizard' | 'user') => {
    console.log('Wallet mode selected:', mode); // Debug log
    setLocalDeploymentMode(mode); // Update local state immediately
    setDeploymentMode(mode); // Update context state
    setShowWalletModal(false);
    
    // If switching to user mode and not connected, open connect modal
    if (mode === 'user' && !isConnected && openConnectModal) {
      setTimeout(() => {
        openConnectModal();
      }, 100); // Small delay to allow modal to close first
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  // Extract metrics from compilation
  const getMetricsFromCompilation = () => {
    if (!lastCompilation) return { wasmSize: null, contractSize: null, estimatedFee: null };
    
    // Get from details if available
    const wasmSize = lastCompilation.details?.wasm_size || null;
    const contractSize = lastCompilation.details?.contract_size || null;
    
    // Try to extract fee from stdout if not in details
    const feeMatch = lastCompilation.stdout.match(/wasm data fee: .*?([\d.]+)\s*ETH/);
    const estimatedFee = feeMatch ? `${feeMatch[1]} ETH` : '~0.001 ETH';
    
    return { wasmSize, contractSize, estimatedFee };
  };

  const { wasmSize, contractSize, estimatedFee } = getMetricsFromCompilation();
  
  // Get network configuration
  const networkConfig = getNetworkConfig(localDeploymentMode === 'user' ? selectedNetwork.id : 98985);
  const explorerUrl = networkConfig?.explorerUrl || 'https://testnet-explorer.superposition.so';
  const networkName = localDeploymentMode === 'user' ? selectedNetwork.name : 'Superposition Testnet';
  const chainId = localDeploymentMode === 'user' ? selectedNetwork.id : 98985;

  if (showABIError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              ABI Not Found
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-none mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm">
                    No valid ABI found for your contract. This usually happens when:
                  </p>
                  <ul className="text-sm space-y-1 list-disc pl-4">
                    <li>The contract hasn't been compiled successfully</li>
                    <li>The last compilation failed</li>
                    <li>The contract doesn't expose any public functions</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 flex-none mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm">
                    Please try the following steps:
                  </p>
                  <ul className="text-sm space-y-1 list-disc pl-4">
                    <li>Compile your contract again</li>
                    <li>Check for compilation errors in the console</li>
                    <li>Ensure your contract has public functions marked with #[public]</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2">
                <Bug className="h-5 w-5 text-purple-500 flex-none mt-0.5" />
                <div>
                  <p className="text-sm">
                    If you think this is a bug, please report it on our GitHub issues page:
                  </p>
                  <Button
                    variant="link"
                    className="h-8 px-0 text-purple-500"
                    onClick={() => window.open('https://github.com/tolgayayci/wizard/issues/new?labels=bug&template=bug_report.md&title=[ABI]%20Contract%20ABI%20not%20found', '_blank')}
                  >
                    <span className="underline">Open Issue on GitHub</span>
                    <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button 
              onClick={() => {
                onOpenChange(false);
                onCompile?.();
              }}
              className="gap-2"
            >
              <Terminal className="h-4 w-4" />
              Compile Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RocketIcon className="h-5 w-5" />
              Deploy Contract
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Wallet Section - Primary Focus */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {localDeploymentMode === 'wizard' ? (
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-md">
                      <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  ) : (
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-md">
                      <Wallet className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-base">
                      {localDeploymentMode === 'wizard' ? 'Wizard Wallet' : 'Personal Wallet'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {localDeploymentMode === 'wizard' ? (
                        'Free testnet deployment'
                      ) : isConnected ? (
                        <div className="flex items-center gap-2">
                          {connector && <span className="font-medium">{connector.name}</span>}
                          {connector && <span className="text-muted-foreground">•</span>}
                          <span className="font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                          {balance !== undefined && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span>{formatBalance(balance)} ETH</span>
                            </>
                          )}
                        </div>
                      ) : (
                        'Not connected'
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Change Wallet Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWalletModal(true)}
                  className="gap-2"
                >
                  <ChevronRight className="h-4 w-4" />
                  Switch Mode
                </Button>
              </div>

              {/* Network Info */}
              <Separator className="my-3" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{networkName}</span>
                  <Badge variant="secondary" className="text-xs">
                    Chain ID: {chainId}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 h-7 px-2"
                  onClick={() => window.open(explorerUrl, '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="text-xs">Explorer</span>
                </Button>
              </div>
              
              {/* Suggestion to use connected wallet */}
              {isConnected && localDeploymentMode === 'wizard' && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1 text-sm">
                      <p className="text-blue-800 dark:text-blue-200 font-medium">
                        Use your connected wallet for deployment?
                      </p>
                      <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                        Switch to Personal Wallet mode to deploy with your connected wallet ({address?.slice(0, 6)}...{address?.slice(-4)})
                      </p>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-6 px-0 mt-1 text-blue-600 dark:text-blue-400"
                        onClick={() => setShowWalletModal(true)}
                      >
                        Switch to Personal Wallet →
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Contract Metrics - Clean Display */}
            <div className="grid grid-cols-3 gap-3">
              {wasmSize && (
                <div className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-1">
                    <HardDrive className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">WASM Size</span>
                  </div>
                  <div className="font-semibold">{wasmSize}</div>
                </div>
              )}
              
              {contractSize && (
                <div className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-1">
                    <Box className="h-4 w-4 text-purple-500" />
                    <span className="text-xs text-muted-foreground">Contract Size</span>
                  </div>
                  <div className="font-semibold">{contractSize}</div>
                </div>
              )}
              
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Est. Fee</span>
                </div>
                <div className="font-semibold">{estimatedFee}</div>
              </div>
            </div>

            {/* Deployment Status */}
            {!deploymentResult && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                <div className="text-sm space-y-1">
                  <div className="text-yellow-800 dark:text-yellow-200 font-medium">
                    This will deploy your last compiled contract
                  </div>
                  <div className="text-yellow-700 dark:text-yellow-300">
                    Make sure to compile again if you've made changes
                  </div>
                </div>
              </div>
            )}

            {/* Deployment Result */}
            {deploymentResult && (
              <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-600">Deployment Successful</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Contract:</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs font-mono">
                        {(deploymentResult.transaction?.contract_address || deploymentResult.contract_address || '').slice(0, 8)}...
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(
                          deploymentResult.transaction?.contract_address || deploymentResult.contract_address || '',
                          'Contract address'
                        )}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => window.open(
                          `${explorerUrl}/address/${deploymentResult.transaction?.contract_address || deploymentResult.contract_address}`,
                          '_blank'
                        )}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {(deploymentResult.transaction?.deployment_tx_hash || deploymentResult.transaction_hash) && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Transaction:</span>
                      <div className="flex items-center gap-1">
                        <code className="text-xs font-mono">
                          {(deploymentResult.transaction?.deployment_tx_hash || deploymentResult.transaction_hash || '').slice(0, 8)}...
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => window.open(
                            `${explorerUrl}/tx/${deploymentResult.transaction?.deployment_tx_hash || deploymentResult.transaction_hash}`,
                            '_blank'
                          )}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          <DialogFooter>
            {deploymentResult ? (
              <Button 
                onClick={() => onOpenChange(false)}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Close
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isDeploying}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleDeploy}
                  disabled={isDeploying || (localDeploymentMode === 'user' && !isConnected)}
                  className="gap-2"
                >
                  {isDeploying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deploying...
                    </>
                  ) : localDeploymentMode === 'user' && !isConnected ? (
                    <>
                      <Wallet className="h-4 w-4" />
                      Connect Wallet First
                    </>
                  ) : (
                    <>
                      <RocketIcon className="h-4 w-4" />
                      Deploy Contract
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wallet Selection Modal */}
      <WalletSelectionModal
        open={showWalletModal}
        onSelectMode={handleWalletModeSelect}
        onClose={() => setShowWalletModal(false)}
      />
    </>
  );
}