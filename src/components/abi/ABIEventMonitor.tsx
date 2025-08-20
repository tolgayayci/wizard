import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Activity,
  Download,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  AlertCircle,
  Loader2,
  MoreVertical,
  Radio,
  Clock,
} from 'lucide-react';
import { ContractEvent, Deployment } from '@/lib/types';
import { EventMonitor } from '@/lib/services/events';
import { ABIEventCard } from './ABIEventCard';
import { ABIEventFilters } from './ABIEventFilters';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ABIEventMonitorProps {
  projectId: string;
  deployment: Deployment;
  isSharedView?: boolean;
}

export function ABIEventMonitor({ projectId, deployment, isSharedView = false }: ABIEventMonitorProps) {
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableEventTypes, setAvailableEventTypes] = useState<string[]>([]);
  const [filter, setFilter] = useState({
    eventNames: [] as string[],
    searchQuery: '',
    timeRange: 'all' as 'all' | '1h' | '24h' | '7d' | '30d',
  });
  
  const { toast } = useToast();
  const monitorRef = useRef<EventMonitor | null>(null);
  const [newEventCount, setNewEventCount] = useState(0);

  // Extract available event types from ABI
  useEffect(() => {
    if (deployment.abi) {
      const eventTypes = deployment.abi
        .filter(item => item.type === 'event')
        .map(item => item.name || 'Unknown');
      setAvailableEventTypes(eventTypes);
    }
  }, [deployment.abi]);

  // Load saved events on mount
  useEffect(() => {
    const loadSavedEvents = async () => {
      setIsLoading(true);
      try {
        const savedEvents = await EventMonitor.getSavedEvents(projectId, {
          contractAddress: deployment.contract_address,
          limit: 100,
        });
        setEvents(savedEvents);
      } catch (error) {
        console.error('Error loading saved events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedEvents();
    
    return () => {
      // Cleanup monitor on unmount
      if (monitorRef.current) {
        monitorRef.current.destroy();
      }
    };
  }, [deployment.contract_address, projectId]);

  const startMonitoring = async () => {
    if (!deployment.abi || isSharedView) return;
    
    try {
      setError(null);
      setIsMonitoring(true);
      setNewEventCount(0);

      // Create event monitor instance
      const monitor = new EventMonitor(
        deployment.contract_address,
        deployment.abi,
        deployment.chain_id,
        projectId,
        deployment.id
      );
      
      monitorRef.current = monitor;

      // Start monitoring with filter
      await monitor.startMonitoring(
        (event: ContractEvent) => {
          // Add new event to the list
          setEvents(prev => [event, ...prev]);
          setNewEventCount(prev => prev + 1);
          
          // Show toast for new event
          toast({
            title: 'New Event',
            description: `${event.event_name} detected at block ${event.block_number}`,
          });
        },
        filter.eventNames.length > 0 ? { eventNames: filter.eventNames } : undefined
      );

      // Also fetch recent historical events
      const historicalEvents = await monitor.getHistoricalEvents({
        eventNames: filter.eventNames.length > 0 ? filter.eventNames : undefined,
        fromBlock: Math.max(0, (await monitor['provider']!.getBlockNumber()) - 1000), // Last 1000 blocks
      });

      // Merge with existing events, avoiding duplicates
      const existingIds = new Set(events.map(e => 
        `${e.chain_id}-${e.transaction_hash}-${e.log_index}`
      ));
      
      const newHistoricalEvents = historicalEvents.filter(e => 
        !existingIds.has(`${e.chain_id}-${e.transaction_hash}-${e.log_index}`)
      );

      if (newHistoricalEvents.length > 0) {
        setEvents(prev => [...prev, ...newHistoricalEvents].sort((a, b) => 
          b.block_number - a.block_number || b.log_index - a.log_index
        ));
      }

      toast({
        title: 'Monitoring Started',
        description: 'Listening for contract events...',
      });
    } catch (error) {
      console.error('Error starting monitoring:', error);
      setError('Failed to start event monitoring');
      setIsMonitoring(false);
      
      toast({
        title: 'Error',
        description: 'Failed to start event monitoring',
        variant: 'destructive',
      });
    }
  };

  const stopMonitoring = async () => {
    if (monitorRef.current) {
      await monitorRef.current.stopMonitoring();
      monitorRef.current = null;
    }
    setIsMonitoring(false);
    setNewEventCount(0);
    
    toast({
      title: 'Monitoring Stopped',
      description: 'Event monitoring has been stopped',
    });
  };

  const refreshEvents = async () => {
    setIsLoading(true);
    try {
      const savedEvents = await EventMonitor.getSavedEvents(projectId, {
        contractAddress: deployment.contract_address,
        limit: 100,
      });
      setEvents(savedEvents);
    } catch (error) {
      console.error('Error loading saved events:', error);
    } finally {
      setIsLoading(false);
    }
    
    // If monitoring, also fetch latest events
    if (monitorRef.current && isMonitoring) {
      try {
        const latestEvents = await monitorRef.current.getHistoricalEvents({
          eventNames: filter.eventNames.length > 0 ? filter.eventNames : undefined,
          fromBlock: Math.max(...events.map(e => e.block_number), 0),
        });
        
        if (latestEvents.length > 0) {
          const existingIds = new Set(events.map(e => 
            `${e.chain_id}-${e.transaction_hash}-${e.log_index}`
          ));
          
          const newEvents = latestEvents.filter(e => 
            !existingIds.has(`${e.chain_id}-${e.transaction_hash}-${e.log_index}`)
          );
          
          if (newEvents.length > 0) {
            setEvents(prev => [...newEvents, ...prev]);
            toast({
              title: 'Events Refreshed',
              description: `Found ${newEvents.length} new event${newEvents.length !== 1 ? 's' : ''}`,
            });
          }
        }
      } catch (error) {
        console.error('Error refreshing events:', error);
      }
    }
  };

  const clearEvents = async () => {
    try {
      await EventMonitor.clearSavedEvents(projectId, deployment.contract_address);
      setEvents([]);
      toast({
        title: 'Events Cleared',
        description: 'All saved events have been removed',
      });
    } catch (error) {
      console.error('Error clearing events:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear events',
        variant: 'destructive',
      });
    }
  };

  const exportEvents = () => {
    const dataStr = JSON.stringify(filteredEvents, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `events-${deployment.contract_address.slice(0, 8)}-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({
      title: 'Events Exported',
      description: `Exported ${filteredEvents.length} events to JSON`,
    });
  };

  // Filter events based on current filter
  const filteredEvents = events.filter(event => {
    // Filter by event names
    if (filter.eventNames.length > 0 && !filter.eventNames.includes(event.event_name)) {
      return false;
    }
    
    // Filter by search query
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      const matchesName = event.event_name.toLowerCase().includes(query);
      const matchesTxHash = event.transaction_hash.toLowerCase().includes(query);
      const matchesArgs = Object.entries(event.args).some(([key, value]) => 
        key.toLowerCase().includes(query) || 
        String(value).toLowerCase().includes(query)
      );
      
      if (!matchesName && !matchesTxHash && !matchesArgs) {
        return false;
      }
    }
    
    // Filter by time range
    if (filter.timeRange !== 'all') {
      const now = Date.now() / 1000;
      let cutoffTime = now;
      
      switch (filter.timeRange) {
        case '1h': cutoffTime = now - 3600; break;
        case '24h': cutoffTime = now - 86400; break;
        case '7d': cutoffTime = now - 604800; break;
        case '30d': cutoffTime = now - 2592000; break;
      }
      
      if (event.timestamp < cutoffTime) {
        return false;
      }
    }
    
    return true;
  });

  if (!deployment.abi || deployment.abi.filter(item => item.type === 'event').length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Events Found</h3>
            <p className="text-sm text-muted-foreground">
              This contract doesn't have any events defined in its ABI.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none px-4 py-3 border-b bg-muted/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex items-center gap-2',
              isMonitoring && 'animate-pulse'
            )}>
              {isMonitoring ? (
                <>
                  <Radio className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-500">Live Monitoring</span>
                  {newEventCount > 0 && (
                    <Badge variant="default" className="ml-2">
                      {newEventCount} new
                    </Badge>
                  )}
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Event Monitor</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isSharedView && (
              <>
                {isMonitoring ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={stopMonitoring}
                    className="gap-2"
                  >
                    <Pause className="h-4 w-4" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startMonitoring}
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Start Monitoring
                  </Button>
                )}
              </>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={refreshEvents}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportEvents} disabled={filteredEvents.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Export as JSON
                </DropdownMenuItem>
                {!isSharedView && (
                  <DropdownMenuItem 
                    onClick={clearEvents} 
                    disabled={events.length === 0}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All Events
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Filters */}
        <ABIEventFilters
          availableEvents={availableEventTypes}
          onFilterChange={setFilter}
        />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mx-4 mt-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Events List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="p-4 space-y-2">
            {filteredEvents.map((event, index) => (
              <ABIEventCard
                key={`${event.chain_id}-${event.transaction_hash}-${event.log_index}-${index}`}
                event={event}
                isExpanded={index === 0 && newEventCount > 0}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {filter.eventNames.length > 0 || filter.searchQuery
                  ? 'No events match your filters'
                  : 'No events detected yet'}
              </p>
              {!isMonitoring && !isSharedView && (
                <p className="text-xs text-muted-foreground mt-2">
                  Start monitoring to capture new events
                </p>
              )}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Status Bar */}
      <div className="flex-none px-4 py-2 border-t bg-muted/10 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>
            {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
            {filter.eventNames.length > 0 || filter.searchQuery ? ' (filtered)' : ''}
          </span>
          <span>
            Chain: {deployment.chain_name} (ID: {deployment.chain_id})
          </span>
        </div>
      </div>
    </div>
  );
}