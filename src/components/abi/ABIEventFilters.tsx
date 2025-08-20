import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Filter, X, Search, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventFilter {
  eventNames: string[];
  searchQuery: string;
  fromBlock?: number;
  toBlock?: number;
  timeRange?: 'all' | '1h' | '24h' | '7d' | '30d';
}

interface ABIEventFiltersProps {
  availableEvents: string[];
  onFilterChange: (filter: EventFilter) => void;
  className?: string;
}

export function ABIEventFilters({ 
  availableEvents, 
  onFilterChange,
  className 
}: ABIEventFiltersProps) {
  const [filter, setFilter] = useState<EventFilter>({
    eventNames: [],
    searchQuery: '',
    timeRange: 'all',
  });
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== filter.searchQuery) {
        const newFilter = { ...filter, searchQuery: searchInput };
        setFilter(newFilter);
        onFilterChange(newFilter);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput, filter, onFilterChange]);

  const handleEventToggle = (eventName: string) => {
    const newEventNames = filter.eventNames.includes(eventName)
      ? filter.eventNames.filter(e => e !== eventName)
      : [...filter.eventNames, eventName];
    
    const newFilter = { ...filter, eventNames: newEventNames };
    setFilter(newFilter);
    onFilterChange(newFilter);
  };

  const handleTimeRangeChange = (range: string) => {
    const newFilter = { ...filter, timeRange: range as EventFilter['timeRange'] };
    
    // Calculate block range based on time (approximate)
    if (range !== 'all') {
      // Calculate time range for filtering
      // This is handled in the parent component based on the timeRange value
      // Block number calculation would require access to the provider
      
      // For now, we'll just set the time range without block numbers
      // Block numbers would need to be calculated with actual provider
    }
    
    setFilter(newFilter);
    onFilterChange(newFilter);
  };

  const handleReset = () => {
    const newFilter = {
      eventNames: [],
      searchQuery: '',
      timeRange: 'all' as const,
    };
    setFilter(newFilter);
    setSearchInput('');
    onFilterChange(newFilter);
  };

  const activeFilterCount = 
    filter.eventNames.length + 
    (filter.searchQuery ? 1 : 0) + 
    (filter.timeRange !== 'all' ? 1 : 0);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Search Input */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Time Range Selector */}
      <Select value={filter.timeRange} onValueChange={handleTimeRangeChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Time range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All time</SelectItem>
          <SelectItem value="1h">Last hour</SelectItem>
          <SelectItem value="24h">Last 24h</SelectItem>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
        </SelectContent>
      </Select>

      {/* Advanced Filters */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Event Types</Label>
              <div className="mt-2 space-y-2">
                {availableEvents.length > 0 ? (
                  availableEvents.map(eventName => (
                    <label
                      key={eventName}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filter.eventNames.includes(eventName)}
                        onChange={() => handleEventToggle(eventName)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{eventName}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No events available</p>
                )}
              </div>
            </div>

            {/* Block Range (optional, for advanced users) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Block Range (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="From block"
                  value={filter.fromBlock || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : undefined;
                    const newFilter = { ...filter, fromBlock: value };
                    setFilter(newFilter);
                    onFilterChange(newFilter);
                  }}
                />
                <Input
                  type="number"
                  placeholder="To block"
                  value={filter.toBlock || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : undefined;
                    const newFilter = { ...filter, toBlock: value };
                    setFilter(newFilter);
                    onFilterChange(newFilter);
                  }}
                />
              </div>
            </div>

            {/* Active Filters Summary */}
            {activeFilterCount > 0 && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {activeFilterCount} active filter{activeFilterCount !== 1 ? 's' : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Reset Button (visible when filters are active) */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
          className="h-9 w-9"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}