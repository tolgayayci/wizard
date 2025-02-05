import { useState } from 'react';
import { ethers } from 'ethers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Terminal, 
  PlayCircle, 
  ExternalLink,
  Loader2,
  Info,
  Copy,
} from 'lucide-react';
import { ABIMethod } from '@/lib/types';
import { ABIMethodSignature } from './ABIMethodSignature';
import { parseValue, formatValue } from '@/lib/contract';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { BLOCKCHAIN_CONFIG } from '@/lib/config';

interface ABIExecuteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  method: ABIMethod;
  contractAddress: string;
  projectId: string;
  onExecute: (result: any) => void;
}

interface ExecutionResult {
  status: 'success' | 'error' | 'pending';
  outputs?: any[];
  error?: string;
  txHash?: string;
  gasUsed?: string;
}

// Private key for contract interactions
const PRIVATE_KEY = import.meta.env.VITE_CONTRACT_PRIVATE_KEY;

export function ABIExecuteDialog({
  open,
  onOpenChange,
  method,
  contractAddress,
  projectId,
  onExecute,
}: ABIExecuteDialogProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const { toast } = useToast();

  const handleInputChange = (name: string, value: string) => {
    setInputs(prev => ({ ...prev, [name]: value }));
  };

  const handleExecute = async () => {
    if (!method || !contractAddress) return;

    setIsExecuting(true);
    setResult({ status: 'pending' });

    try {
      // Get provider and wallet
      const provider = new ethers.JsonRpcProvider(BLOCKCHAIN_CONFIG.arbitrumSepolia.rpc);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      const contract = new ethers.Contract(contractAddress, [method], wallet);

      // Parse input parameters
      const parsedInputs = method.inputs.map(input => 
        parseValue(inputs[input.name] || '', input.type)
      );

      let result;
      let receipt;

      // Execute the method
      if (method.stateMutability === 'view' || method.stateMutability === 'pure') {
        // For read-only methods
        result = await contract[method.name](...parsedInputs);
      } else {
        // For state-changing methods
        const tx = await contract[method.name](...parsedInputs);
        receipt = await tx.wait();
        result = receipt.logs;
      }

      // Format the result
      const outputs = method.outputs?.map((output, index) => {
        const value = Array.isArray(result) ? result[index] : result;
        return formatValue(value, output.type);
      }) || [];

      const successResult: ExecutionResult = {
        status: 'success',
        outputs,
        txHash: receipt?.hash,
        gasUsed: receipt?.gasUsed?.toString(),
      };

      setResult(successResult);
      onExecute(successResult);

      // Record the call in history
      const { error } = await supabase
        .from('abi_calls')
        .insert({
          project_id: projectId,
          contract_address: contractAddress,
          method_name: method.name,
          method_type: method.type,
          inputs,
          outputs: successResult.outputs,
          status: 'success',
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Method executed successfully",
      });
    } catch (error) {
      console.error('Execution error:', error);
      const errorResult: ExecutionResult = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Transaction failed',
      };
      setResult(errorResult);

      // Record the failed call
      await supabase
        .from('abi_calls')
        .insert({
          project_id: projectId,
          contract_address: contractAddress,
          method_name: method.name,
          method_type: method.type,
          inputs,
          outputs: {},
          status: 'error',
          error: errorResult.error,
        });

      toast({
        title: "Error",
        description: "Failed to execute method",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopy = async (content: any) => {
    await navigator.clipboard.writeText(JSON.stringify(content, null, 2));
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Execute {method.name}</span>
            <Badge variant="outline" className={cn(
              "text-xs",
              method.stateMutability === 'view' && "bg-green-500/10 text-green-500",
              method.stateMutability === 'nonpayable' && "bg-orange-500/10 text-orange-500",
              method.stateMutability === 'payable' && "bg-yellow-500/10 text-yellow-500"
            )}>
              {method.stateMutability}
            </Badge>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span>Contract:</span>
            <code className="font-mono text-xs">{contractAddress}</code>
            <a
              href={`https://sepolia.arbiscan.io/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              <span className="text-xs">View on Explorer</span>
            </a>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 py-4">
            {/* Method Signature */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Method Signature
              </h4>
              <pre className="p-3 bg-muted rounded-lg font-mono text-xs overflow-auto">
                <ABIMethodSignature method={method} />
              </pre>
            </div>

            {/* Input Parameters */}
            {method.inputs.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Input Parameters</h4>
                {method.inputs.map((input, index) => (
                  <div key={index} className="space-y-2">
                    <label className="text-sm font-medium flex items-center justify-between">
                      <div>
                        {input.name}
                        <span className="ml-2 text-xs text-muted-foreground font-mono">
                          {input.type}
                        </span>
                      </div>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </label>
                    <Input
                      value={inputs[input.name] || ''}
                      onChange={(e) => handleInputChange(input.name, e.target.value)}
                      placeholder={`Enter ${input.type}`}
                      className="font-mono text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Execution Result */}
            {result && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Execution Result
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      result.status === 'success' && "bg-green-500/10 text-green-500",
                      result.status === 'error' && "bg-red-500/10 text-red-500",
                      result.status === 'pending' && "bg-yellow-500/10 text-yellow-500"
                    )}>
                      {result.status}
                    </Badge>
                    {result.status === 'pending' && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {result.status === 'success' && (
                    <>
                      {result.outputs && result.outputs.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Return Values</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 gap-1.5"
                              onClick={() => handleCopy(result.outputs)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              <span className="text-xs">Copy</span>
                            </Button>
                          </div>
                          <div className="max-h-[200px] overflow-y-auto rounded-lg">
                            <pre className="p-3 bg-muted rounded-lg font-mono text-xs whitespace-pre-wrap break-all">
                              {JSON.stringify(
                                Array.isArray(result.outputs) && result.outputs.length === 1 
                                  ? result.outputs[0] 
                                  : result.outputs, 
                                null, 
                                2
                              )}
                            </pre>
                          </div>
                        </div>
                      )}

                      {result.txHash && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Transaction Hash:</span>
                          <a
                            href={`https://sepolia.arbiscan.io/tx/${result.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono hover:underline flex items-center gap-1"
                          >
                            {result.txHash.slice(0, 10)}...{result.txHash.slice(-8)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}

                      {result.gasUsed && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Gas Used:</span>
                          <span className="font-mono">{result.gasUsed}</span>
                        </div>
                      )}
                    </>
                  )}

                  {result.status === 'error' && (
                    <div className="max-h-[200px] overflow-y-auto rounded-lg">
                      <div className="p-3 bg-red-500/10 text-red-500 rounded-lg text-sm whitespace-pre-wrap break-all">
                        {result.error}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            disabled={isExecuting} 
            onClick={handleExecute}
            className="gap-2"
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" />
                Execute
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}