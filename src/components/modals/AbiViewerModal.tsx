import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { 
  FileJson, 
  Copy, 
  Download, 
  ChevronDown, 
  ChevronRight,
  Code2,
  Eye,
  Settings,
  Zap,
  ArrowDownUp,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AbiItem, AbiInput, AbiOutput } from '@/lib/types';

interface AbiViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  abiJson?: AbiItem[] | null;
  projectName?: string;
}

export function AbiViewerModal({ 
  open, 
  onOpenChange, 
  abiJson, 
  projectName = "Contract"
}: AbiViewerModalProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  // Handle empty ABI
  if (!abiJson || !Array.isArray(abiJson) || abiJson.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-blue-500" />
              Contract ABI - {projectName}
            </DialogTitle>
            <DialogDescription>
              No ABI data available. Make sure your contract is compiled successfully.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Sort ABI: constructor first, functions second, events third, errors last
  const sortedAbi = [...abiJson].sort((a, b) => {
    const priority = (type: string) => {
      switch (type) {
        case 'constructor': return 0;
        case 'function': return 1;
        case 'event': return 2;
        case 'error': return 3;
        default: return 4;
      }
    };
    const orderDiff = priority(a.type) - priority(b.type);
    if (orderDiff !== 0) return orderDiff;
    // Secondary sort by name
    return (a.name || '').localeCompare(b.name || '');
  });

  const formattedJson = JSON.stringify(abiJson, null, 2);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(formattedJson);
      toast({
        title: "Copied to clipboard",
        description: "ABI JSON copied successfully",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDownloadJson = () => {
    const filename = `${projectName}-abi.json`;
    
    const blob = new Blob([formattedJson], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Complete",
      description: `${filename} has been downloaded successfully`,
    });
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'function':
        return <Code2 className="h-4 w-4 text-blue-500" />;
      case 'event':
        return <Eye className="h-4 w-4 text-blue-500" />;
      case 'constructor':
        return <Settings className="h-4 w-4 text-purple-500" />;
      case 'fallback':
      case 'receive':
        return <Zap className="h-4 w-4 text-orange-500" />;
      default:
        return <FileJson className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeBadgeColors = (type: string, stateMutability?: string) => {
    if (type === 'event') return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    if (type === 'constructor') return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    if (type === 'function') {
      if (stateMutability === 'view' || stateMutability === 'pure') {
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      }
      if (stateMutability === 'nonpayable') {
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      }
      if (stateMutability === 'payable') {
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      }
    }
    return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  const getStateMutabilityBadge = (stateMutability?: string) => {
    if (!stateMutability) return null;
    
    const colors = {
      view: 'bg-green-500/10 text-green-500 border-green-500/20',
      pure: 'bg-green-500/10 text-green-500 border-green-500/20',
      payable: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      nonpayable: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    } as const;
    
    return (
      <Badge 
        variant="outline" 
        className={cn("text-xs", colors[stateMutability as keyof typeof colors])}
      >
        {stateMutability}
      </Badge>
    );
  };

  const renderParameterList = (
    params: AbiInput[] | AbiOutput[] | undefined, 
    title: string,
    icon: React.ReactNode
  ) => {
    if (!params || params.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          {title} ({params.length})
        </div>
        <div className="space-y-1 pl-5">
          {params.map((param, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="text-xs font-mono px-1.5 py-0.5">
                {param.type}
              </Badge>
              <span className="font-medium">{param.name || `param_${index}`}</span>
              {'indexed' in param && param.indexed && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">indexed</Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-1">
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-blue-500" />
            Contract ABI
          </DialogTitle>
          <DialogDescription className="mt-1">
            Application Binary Interface (ABI) defines how to interact with the smart contract.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-1.5 border-b flex-shrink-0 px-6">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <FileJson className="h-3 w-3" />
              {abiJson.length} method{abiJson.length === 1 ? '' : 's'}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyJson}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadJson}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download JSON
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-2 pt-3 pb-2">
            {sortedAbi.map((item, index) => (
              <div 
                key={index}
                className="border rounded-lg bg-card hover:bg-muted/30 transition-colors"
              >
                <Collapsible 
                  open={expandedItems.has(index)} 
                  onOpenChange={() => toggleExpanded(index)}
                >
                  <CollapsibleTrigger className="flex items-center gap-3 w-full p-3 text-left hover:bg-muted/50 transition-colors min-h-[52px]">
                    {expandedItems.has(index) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    
                    {getTypeIcon(item.type)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-sm truncate">
                            {item.name || item.type}
                          </span>
                          <Badge variant="outline" className={cn("text-xs capitalize flex-shrink-0", getTypeBadgeColors(item.type, item.stateMutability))}>
                            {item.type}
                          </Badge>
                          {getStateMutabilityBadge(item.stateMutability)}
                          {item.anonymous && (
                            <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-500 border-gray-500/20 flex-shrink-0">anonymous</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                          {item.inputs && item.inputs.length > 0 && (
                            <span>({item.inputs.length} input{item.inputs.length !== 1 ? 's' : ''})</span>
                          )}
                          {item.outputs && item.outputs.length > 0 && (
                            <span>({item.outputs.length} output{item.outputs.length !== 1 ? 's' : ''})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="px-3 pb-3">
                    <div className="pl-6 space-y-3 pt-3 border-t border-muted">
                      {renderParameterList(
                        item.inputs, 
                        "Inputs", 
                        <ArrowDown className="h-4 w-4" />
                      )}
                      
                      {renderParameterList(
                        item.outputs, 
                        "Outputs", 
                        <ArrowUp className="h-4 w-4" />
                      )}

                      {/* Raw JSON for debugging */}
                      <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Raw JSON
                        </summary>
                        <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto font-mono whitespace-pre-wrap">
                          {JSON.stringify(item, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 px-6 py-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}