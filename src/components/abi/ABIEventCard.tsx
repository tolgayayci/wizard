import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Hash,
  Box,
  Clock,
} from 'lucide-react';
import { ContractEvent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getExplorerUrl } from '@/lib/wallet/config';

interface ABIEventCardProps {
  event: ContractEvent;
  isExpanded?: boolean;
}

export function ABIEventCard({ event, isExpanded: defaultExpanded = false }: ABIEventCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`,
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatArgument = (_key: string, value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    
    // Handle addresses
    if (typeof value === 'string' && value.startsWith('0x') && value.length === 42) {
      return formatAddress(value);
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      return `[${value.map(v => formatArgument('', v)).join(', ')}]`;
    }
    
    // Handle objects
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  };

  const getEventColor = () => {
    // Different colors based on event characteristics
    if (event.removed) return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (event.event_name.toLowerCase().includes('error')) return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (event.event_name.toLowerCase().includes('transfer')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    if (event.event_name.toLowerCase().includes('approval')) return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (event.event_name.toLowerCase().includes('mint')) return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    return 'bg-primary/10 text-primary border-primary/20';
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={cn(
        'border rounded-lg transition-colors',
        isExpanded ? 'border-primary/50' : 'hover:border-primary/30',
        event.removed && 'opacity-60'
      )}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 text-left">
            <div className="flex items-center gap-3 flex-1">
              <div className={cn(
                'p-1.5 rounded-md',
                getEventColor()
              )}>
                <Activity className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{event.event_name}</span>
                  {event.removed && (
                    <Badge variant="destructive" className="text-xs">Removed</Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Box className="h-3 w-3" />
                    <span>Block #{event.block_number}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(event.timestamp * 1000), { addSuffix: true })}</span>
                  </div>
                  
                  {Object.keys(event.args).length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {Object.keys(event.args).length} args
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-3 py-3 space-y-3">
            {/* Transaction Hash */}
            <div className="flex items-start gap-2">
              <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-1">Transaction Hash</div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono">
                    {formatAddress(event.transaction_hash)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(event.transaction_hash, 'Transaction hash')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => window.open(
                      getExplorerUrl(event.chain_id, 'tx', event.transaction_hash),
                      '_blank'
                    )}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Event Arguments */}
            {Object.keys(event.args).length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Event Arguments</div>
                <div className="bg-muted/30 rounded-md p-2 space-y-1">
                  {Object.entries(event.args).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2 text-xs">
                      <span className="font-mono text-muted-foreground min-w-[100px]">
                        {key}:
                      </span>
                      <code className="font-mono flex-1 break-all">
                        {formatArgument(key, value)}
                      </code>
                      {typeof value === 'string' && value.startsWith('0x') && value.length === 42 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 flex-none"
                          onClick={() => copyToClipboard(value, `${key} address`)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Topics (for debugging) */}
            {event.topics.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Raw Topics ({event.topics.length})
                </summary>
                <div className="mt-2 space-y-1">
                  {event.topics.map((topic, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-muted-foreground">Topic {index}:</span>
                      <code className="font-mono text-xs break-all">{topic}</code>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Log Index: {event.log_index}</span>
              <span>Tx Index: {event.transaction_index}</span>
              <span>Chain ID: {event.chain_id}</span>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}