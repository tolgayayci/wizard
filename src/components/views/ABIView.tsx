import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ABIMethod, Deployment } from '@/lib/types';
import { ABIMethodCard } from '@/components/abi/ABIMethodCard';
import { ABIEmptyState } from '@/components/abi/ABIEmptyState';
import { ABIContractSelector } from '@/components/abi/ABIContractSelector';
import { ABIExecuteDialog } from '@/components/abi/ABIExecuteDialog';
import { ABIExecutionHistory } from '@/components/abi/ABIExecutionHistory';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { History, PlayCircle } from 'lucide-react';
import { ethers } from 'ethers';
import { BLOCKCHAIN_CONFIG } from '@/lib/config';

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
  const [activeView, setActiveView] = useState<'interface' | 'history'>('interface');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const verifyContract = async (address: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(BLOCKCHAIN_CONFIG.arbitrumSepolia.rpc);
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
        // Verify the contract
        const isValid = await verifyContract(mostRecent.contract_address);
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
      const isValid = await verifyContract(address);
      setIsContractVerified(isValid);
      if (!isValid) {
        setError('Contract not deployed on Arbitrum Sepolia');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to verify contract');
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
                : "Make calls to your deployed contract on Arbitrum Sepolia"
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
        </div>
      </div>

      {activeView === 'interface' ? (
        <>
          <ABIContractSelector
            contractAddress={selectedDeployment?.contract_address || ''}
            onAddressChange={handleAddressChange}
            error={error}
            deployments={deployments}
            isLoading={isLoading}
          />
          {selectedDeployment ? (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {selectedDeployment.abi.map((method, index) => (
                  <ABIMethodCard
                    key={index}
                    method={method}
                    onExecute={handleExecute}
                    isContractVerified={!isSharedView}
                    isSharedView={isSharedView}
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1">
              <ABIEmptyState />
            </div>
          )}
        </>
      ) : (
        <ABIExecutionHistory projectId={projectId} />
      )}

      {selectedMethod && selectedDeployment && !isSharedView && (
        <ABIExecuteDialog
          open={true}
          onOpenChange={(open) => !open && setSelectedMethod(null)}
          method={selectedMethod}
          contractAddress={selectedDeployment.contract_address}
          projectId={projectId}
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