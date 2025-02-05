import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  RocketIcon, 
  CheckCircle, 
  Terminal,
  Loader2,
  Code2,
  GitBranch,
  ExternalLink,
  Copy,
  Network,
  Box,
  Coins,
  AlertCircle,
  Info,
  Bug,
} from 'lucide-react';
import { CompilationResult, DeploymentResult } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { deployContract } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DeployDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  lastCompilation: CompilationResult | null;
  onDeploySuccess?: () => void;
  showABIError?: boolean;
}

export function DeployDialog({
  open,
  onOpenChange,
  projectId,
  lastCompilation,
  onDeploySuccess,
  showABIError = false,
}: DeployDialogProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null);
  const { toast } = useToast();

  // Reset deployment result when dialog is opened
  useEffect(() => {
    if (open) {
      setDeploymentResult(null);
      setIsDeploying(false);
    }
  }, [open]);

  const handleDeploy = async () => {
    if (showABIError) return;
    
    setIsDeploying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      // Check if code has changed since last compilation
      const { data: project } = await supabase
        .from('projects')
        .select('code')
        .eq('id', projectId)
        .single();

      if (project && project.code !== lastCompilation?.code_snapshot) {
        throw new Error("Code has changed since last compilation. Please compile again before deploying.");
      }

      // Deploy the contract
      const result = await deployContract(user.id, projectId);
      setDeploymentResult(result);

      // Save deployment to database
      const { error: dbError } = await supabase
        .from('deployments')
        .insert({
          project_id: projectId,
          contract_address: result.transaction.contract_address,
          chain_id: 421614,
          chain_name: 'Arbitrum Sepolia',
          deployed_code: lastCompilation?.code_snapshot || '',
          abi: lastCompilation?.abi || [],
          metadata: {
            deployment_time: result.deployment_time,
            tx_hash: result.transaction.deployment_tx_hash,
          }
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Contract deployed successfully",
      });

      // Immediately close the dialog and notify parent
      onDeploySuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Deployment error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to deploy contract",
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  // Extract metrics from stdout
  const contractSizeMatch = lastCompilation?.stdout.match(/contract size: .*?(\d+\.\d+)\s*KB/);
  const wasmSizeMatch = lastCompilation?.stdout.match(/wasm size: .*?(\d+\.\d+)\s*KB/);
  const wasmFeeMatch = lastCompilation?.stdout.match(/wasm data fee: .*?([\d.]+)\s*ETH/);

  const contractSize = contractSizeMatch ? contractSizeMatch[1] + ' KB' : null;
  const wasmSize = wasmSizeMatch ? wasmSizeMatch[1] + ' KB' : null;
  const wasmFee = wasmFeeMatch ? wasmFeeMatch[1] + ' ETH' : null;

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RocketIcon className="h-5 w-5" />
            Deploy to Arbitrum Sepolia
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Network Info */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
            <Network className="h-5 w-5 text-primary" />
            <div>
              <h4 className="font-medium">Network Information</h4>
              <p className="text-sm text-muted-foreground">
                Your contract will be deployed to Arbitrum Sepolia testnet
              </p>
            </div>
          </div>

          {/* Contract Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Contract Details</h4>
            <div className="p-4 rounded-lg bg-muted">
              <div className="grid grid-cols-2 gap-4">
                {contractSize && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-blue-500/10">
                      <Box className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Contract Size</div>
                      <div className="font-medium mt-0.5">{contractSize}</div>
                    </div>
                  </div>
                )}
                {wasmSize && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-purple-500/10">
                      <Network className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">WASM Size</div>
                      <div className="font-medium mt-0.5">{wasmSize}</div>
                    </div>
                  </div>
                )}
              </div>
              {wasmFee && (
                <div className="flex items-center gap-3 mt-4 pt-4 border-t">
                  <div className="p-2 rounded-md bg-yellow-500/10">
                    <Coins className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Estimated Deployment Fee</div>
                    <div className="font-medium mt-0.5">{wasmFee}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Code Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Contract Code
              </h4>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 gap-1.5"
                onClick={() => {
                  navigator.clipboard.writeText(lastCompilation?.code_snapshot || '');
                  toast({
                    title: "Copied",
                    description: "Contract code copied to clipboard",
                  });
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                <span className="text-xs">Copy Code</span>
              </Button>
            </div>
            <ScrollArea className="h-[200px] w-full rounded-lg border bg-muted/40">
              <pre className="p-4 text-xs font-mono">
                {lastCompilation?.code_snapshot}
              </pre>
            </ScrollArea>
          </div>
          
          {/* Compilation Warning */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <div className="p-1.5 rounded-md bg-blue-500/10">
              <Info className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-blue-500">
                This deployment will use your last successful compilation.
              </p>
              <p className="text-xs text-blue-500/80 mt-0.5">
                If you've made changes to your code since then, please compile again before deploying
              </p>
            </div>
          </div>

          {/* Deployment Result */}
          {deploymentResult && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Deployment Result
              </h4>
              <div className="space-y-3 p-4 rounded-lg bg-muted">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Contract Address:</span>
                  <div className="flex items-center gap-2">
                    <code className="font-mono">{deploymentResult.transaction.contract_address}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => window.open(`https://sepolia.arbiscan.io/address/${deploymentResult.transaction.contract_address}`, '_blank')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Transaction Hash:</span>
                  <div className="flex items-center gap-2">
                    <code className="font-mono">{deploymentResult.transaction.deployment_tx_hash}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => window.open(`https://sepolia.arbiscan.io/tx/${deploymentResult.transaction.deployment_tx_hash}`, '_blank')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
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
                disabled={isDeploying}
                className="gap-2"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deploying...
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
  );
}