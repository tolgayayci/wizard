import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ABIMethod, Deployment } from '@/lib/types';
import { ABIMethodCard } from '@/components/abi/ABIMethodCard';
import { ABIEmptyState } from '@/components/abi/ABIEmptyState';
import { ABIContractSelector } from '@/components/abi/ABIContractSelector';
import { ABIExecuteDialog } from '@/components/abi/ABIExecuteDialog';
import { ABIExecutionHistory } from '@/components/abi/ABIExecutionHistory';
import { ABIEventMonitor } from '@/components/abi/ABIEventMonitor';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { History, PlayCircle, Activity, WifiOff, AlertCircle } from 'lucide-react';
import { ethers } from 'ethers';
import { BLOCKCHAIN_CONFIG, API_URL, NETWORK_CONFIGS } from '@/lib/config';
import axios from 'axios';

interface ABIViewProps {
  projectId: string;
  isSharedView?: boolean;
}

export function ABIView({ projectId, isSharedView = false }: ABIViewProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [isContractVerified, setIsContractVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<ABIMethod | null>(null);
  const [activeView, setActiveView] = useState<'interface' | 'history' | 'events'>('interface');
  const [isLoading, setIsLoading] = useState(true);
  const [backendConnectionError, setBackendConnectionError] = useState(false);
  const { toast } = useToast();

  const verifyContract = async (address: string, networkInfo?: Deployment['network_info']) => {
    try {
      // Use network-specific RPC, fallback to Sepolia for backward compatibility
      const rpcUrl = networkInfo?.rpc_url ||
        (networkInfo?.chain_id ? NETWORK_CONFIGS[networkInfo.chain_id as keyof typeof NETWORK_CONFIGS]?.rpcUrl : null) ||
        BLOCKCHAIN_CONFIG.arbitrumSepolia.rpc;
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const code = await provider.getCode(address);
      return code !== "0x" && code !== "";
    } catch (error) {
      console.error('Error verifying contract:', error);
      // Don't throw error, just return false
      return false;
    }
  };

  const fetchDeployments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('deployments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDeployments(data || []);
      
      // Select the most recent deployment by default
      if (data && data.length > 0) {
        const mostRecent = data[0];
        setSelectedDeployment(mostRecent);
        // Verify the contract using the correct network RPC
        const isValid = await verifyContract(mostRecent.contract_address, mostRecent.network_info);
        setIsContractVerified(isValid);
      }
    } catch (error) {
      console.error('Error fetching deployments:', error);
      toast({
        title: "Error",
        description: "Failed to load deployments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check backend connection
  const checkBackendConnection = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/health`, { timeout: 5000 });
      if (response.status === 200) {
        setBackendConnectionError(false);
      }
    } catch (error) {
      console.error('Backend connection check failed:', error);
      setBackendConnectionError(true);
    }
  }, []);

  // Check backend connection on mount and periodically
  useEffect(() => {
    checkBackendConnection();
    const interval = setInterval(checkBackendConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkBackendConnection]);

  // Fetch deployments when component mounts or when refreshTrigger changes
  useEffect(() => {
    fetchDeployments();
  }, [projectId]);

  const handleAddressChange = async (address: string) => {
    setError(null);
    setIsContractVerified(false);

    const deployment = deployments.find(d => d.contract_address === address);
    if (!deployment) {
      setError('Deployment not found');
      return;
    }

    setSelectedDeployment(deployment);

    try {
      // Verify the contract using the correct network RPC
      const isValid = await verifyContract(address, deployment.network_info);
      setIsContractVerified(isValid);
    } catch (error) {
      // Only show error for actual verification failures, not network mismatches
      console.warn('Contract verification failed:', error);
    }
  };

  const handleExecute = (method: ABIMethod) => {
    if (isSharedView) {
      toast({
        title: "Read-only View",
        description: "Contract execution is disabled in shared view",
      });
      return;
    }
    setSelectedMethod(method);
  };

  return (
    <div className="h-full flex flex-col bg-background border rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-md">
            <PlayCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">Contract Interface</h3>
            <p className="text-xs text-muted-foreground">
              {isSharedView 
                ? "View deployed contract methods and execution history"
                : "Make calls to your deployed contract on Superposition Testnet"
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={activeView === 'interface' ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-2"
            onClick={() => setActiveView('interface')}
          >
            <PlayCircle className="h-4 w-4" />
            Interface
          </Button>
          <Button
            variant={activeView === 'history' ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-2"
            onClick={() => setActiveView('history')}
          >
            <History className="h-4 w-4" />
            History
          </Button>
          <Button
            variant={activeView === 'events' ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-2"
            onClick={() => setActiveView('events')}
          >
            <Activity className="h-4 w-4" />
            Events
          </Button>
        </div>
      </div>

      {/* Contract selector for all tabs */}
      <ABIContractSelector
        contractAddress={selectedDeployment?.contract_address || ''}
        onAddressChange={handleAddressChange}
        error={error}
        deployments={deployments}
        isLoading={isLoading}
      />

      {activeView === 'interface' ? (
        selectedDeployment ? (
          backendConnectionError && selectedDeployment.deployment_mode === 'wizard' ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-4">
                <div className="p-2.5 bg-destructive/10 rounded-md w-fit mx-auto">
                  <WifiOff className="h-6 w-6 text-destructive" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">Connection Problem</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
                    Wizard wallet deployments require backend connection to interact with contracts. If you have contracts deployed with your own wallet, you can still interact with them.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {selectedDeployment.abi
                  .filter((method) => method.type !== 'error')
                  .map((method, index) => (
                  <ABIMethodCard
                    key={index}
                    method={method}
                    onExecute={handleExecute}
                    isContractVerified={!isSharedView}
                    isSharedView={isSharedView}
                    isDisabled={backendConnectionError && selectedDeployment.deployment_mode === 'wizard'}
                  />
                ))}
              </div>
            </ScrollArea>
          )
        ) : (
          <div className="flex-1">
            <ABIEmptyState />
          </div>
        )
      ) : activeView === 'history' ? (
        selectedDeployment ? (
          <ABIExecutionHistory 
            projectId={projectId} 
            deployment={selectedDeployment}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Select a deployment to view history
              </p>
            </div>
          </div>
        )
      ) : (
        selectedDeployment ? (
          <ABIEventMonitor 
            projectId={projectId} 
            deployment={selectedDeployment}
            isSharedView={isSharedView}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Select a deployment to monitor events
              </p>
            </div>
          </div>
        )
      )}

      {selectedMethod && selectedDeployment && !isSharedView && (
        <ABIExecuteDialog
          open={true}
          onOpenChange={(open) => !open && setSelectedMethod(null)}
          method={selectedMethod}
          contractAddress={selectedDeployment.contract_address}
          projectId={projectId}
          deploymentMode={selectedDeployment.deployment_mode}
          deploymentId={selectedDeployment.id}
          networkInfo={selectedDeployment.network_info}
          onExecute={(result) => {
            toast({
              title: "Success",
              description: "Method executed successfully",
            });
          }}
        />
      )}
    </div>
  );
}