import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  History,
  ArrowUpDown,
  Eye,
  Copy,
  Terminal,
} from 'lucide-react';
import { ABICall } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ABIExecutionHistoryProps {
  projectId: string;
}

export function ABIExecutionHistory({ projectId }: ABIExecutionHistoryProps) {
  const [calls, setCalls] = useState<ABICall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedCall, setSelectedCall] = useState<ABICall | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCalls();
  }, [projectId, sortOrder]);

  const fetchCalls = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('abi_calls')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: sortOrder === 'asc' });

      if (error) throw error;
      setCalls(data || []);
    } catch (error) {
      console.error('Error fetching ABI calls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/10 text-green-500';
      case 'error':
        return 'bg-red-500/10 text-red-500';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-none flex items-center justify-between px-4 py-3 border-b bg-muted/20">
          <div className="text-sm text-muted-foreground">Loading calls...</div>
          <Button variant="ghost" size="sm" disabled className="gap-2">
            <ArrowUpDown className="h-4 w-4" />
            {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex p-3 bg-primary/10 rounded-lg mb-4">
              <Clock className="h-6 w-6 text-primary animate-spin" />
            </div>
            <h3 className="font-medium mb-1">Loading History</h3>
            <p className="text-sm text-muted-foreground">
              Please wait while we fetch the execution history
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-none flex items-center justify-between px-4 py-3 border-b bg-muted/20">
          <div className="text-sm text-muted-foreground">No calls recorded</div>
          <Button variant="ghost" size="sm" disabled className="gap-2">
            <ArrowUpDown className="h-4 w-4" />
            {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center bg-muted/40">
          <div className="text-center">
            <div className="inline-flex p-3 bg-primary/10 rounded-lg mb-6">
              <History className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <h3 className="font-medium mb-3">No Contract Interactions</h3>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Start interacting with your deployed contract
              </p>
              <p className="text-sm text-muted-foreground">
                to see your execution history here
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b bg-muted/20">
        <div className="text-sm text-muted-foreground">
          {calls.length} {calls.length === 1 ? 'call' : 'calls'} recorded
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => setSortOrder(order => order === 'desc' ? 'asc' : 'desc')}
        >
          <ArrowUpDown className="h-4 w-4" />
          {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
        </Button>
      </div>

      <ScrollArea className="flex-1 bg-muted/40">
        <div className="divide-y">
          {calls.map((call) => (
            <div
              key={call.id}
              onClick={() => setSelectedCall(call)}
              className={cn(
                "group relative flex items-center gap-4 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
              )}
            >
              <div className="flex-none">
                {call.status === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : call.status === 'error' ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{call.method_name}</span>
                  <Badge variant="outline" className={cn("text-[10px]", getStatusColor(call.status))}>
                    {call.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <code className="font-mono">
                    {call.contract_address.slice(0, 6)}...{call.contract_address.slice(-4)}
                  </code>
                  <span>•</span>
                  <span>{formatDate(call.created_at)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCall(call);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(
                      `https://sepolia.arbiscan.io/address/${call.contract_address}`,
                      '_blank'
                    );
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Dialog open={selectedCall !== null} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          {selectedCall && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>{selectedCall.method_name}</span>
                  <Badge variant="outline" className={cn(getStatusColor(selectedCall.status))}>
                    {selectedCall.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-4 py-4">
                  {/* Contract Address */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Contract</h4>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-muted-foreground" />
                        <code className="font-mono text-sm">{selectedCall.contract_address}</code>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopy(selectedCall.contract_address)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            window.open(
                              `https://sepolia.arbiscan.io/address/${selectedCall.contract_address}`,
                              '_blank'
                            );
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Input Parameters */}
                  {Object.keys(selectedCall.inputs).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Input Parameters</h4>
                      <div className="space-y-2">
                        {Object.entries(selectedCall.inputs).map(([key, value]) => (
                          <div key={key} className="p-3 bg-muted rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-sm text-muted-foreground">{key}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleCopy(String(value))}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                              {String(value)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Output */}
                  {selectedCall.status === 'success' && Object.keys(selectedCall.outputs).length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">Output</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5"
                          onClick={() => handleCopy(JSON.stringify(selectedCall.outputs, null, 2))}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span className="text-xs">Copy</span>
                        </Button>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                          {JSON.stringify(selectedCall.outputs, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {selectedCall.status === 'error' && selectedCall.error && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">Error</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5"
                          onClick={() => handleCopy(selectedCall.error || '')}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span className="text-xs">Copy</span>
                        </Button>
                      </div>
                      <div className="p-3 bg-red-500/10 text-red-500 rounded-lg">
                        <pre className="text-sm whitespace-pre-wrap break-all">
                          {selectedCall.error}
                        </pre>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Executed {formatDate(selectedCall.created_at)}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}