import { ethers } from 'ethers';
import { supabase } from '@/lib/supabase';
import { getNetworkConfig } from '@/lib/wallet/config';

export interface ContractEvent {
  id?: string;
  project_id: string;
  deployment_id?: string;
  contract_address: string;
  event_name: string;
  event_signature: string;
  block_number: number;
  transaction_hash: string;
  transaction_index: number;
  log_index: number;
  args: Record<string, any>;
  topics: string[];
  timestamp: number;
  chain_id: number;
  removed?: boolean;
}

export interface EventFilter {
  eventNames?: string[];
  fromBlock?: number;
  toBlock?: number;
  argFilters?: Record<string, any>;
}

export class EventMonitor {
  private contract: ethers.Contract | null = null;
  private provider: ethers.Provider | null = null;
  private listeners: Map<string, ((...args: unknown[]) => void)> = new Map();
  private isMonitoring: boolean = false;
  private chainId: number;
  private contractAddress: string;
  private abi: any[];
  private projectId: string;
  private deploymentId?: string;

  constructor(
    contractAddress: string,
    abi: any[],
    chainId: number,
    projectId: string,
    deploymentId?: string
  ) {
    this.contractAddress = contractAddress;
    this.abi = abi;
    this.chainId = chainId;
    this.projectId = projectId;
    this.deploymentId = deploymentId;
    this.initializeProvider();
  }

  private initializeProvider() {
    const networkConfig = getNetworkConfig(this.chainId);
    if (!networkConfig) {
      throw new Error(`Unsupported chain ID: ${this.chainId}`);
    }

    this.provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    this.contract = new ethers.Contract(this.contractAddress, this.abi, this.provider);
  }

  // Start monitoring events
  async startMonitoring(
    onEvent: (event: ContractEvent) => void,
    filter?: EventFilter
  ): Promise<void> {
    if (this.isMonitoring) {
      console.warn('Event monitoring is already active');
      return;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    this.isMonitoring = true;

    // Get event signatures from ABI
    const events = this.abi.filter(item => item.type === 'event');
    
    // Filter events based on filter criteria
    const eventsToMonitor = filter?.eventNames 
      ? events.filter(e => filter.eventNames?.includes(e.name))
      : events;

    // Set up listeners for each event
    for (const eventAbi of eventsToMonitor) {
      const eventName = eventAbi.name;
      
      const listener = async (...args: unknown[]) => {
        try {
          // The last argument is the event object
          const event = args[args.length - 1];
          
          // Get block timestamp
          const block = await this.provider!.getBlock(event.blockNumber);
          
          // Create contract event object
          const contractEvent: ContractEvent = {
            project_id: this.projectId,
            deployment_id: this.deploymentId,
            contract_address: this.contractAddress,
            event_name: eventName,
            event_signature: event.eventSignature || '',
            block_number: event.blockNumber,
            transaction_hash: event.transactionHash,
            transaction_index: event.transactionIndex,
            log_index: event.logIndex,
            args: this.decodeEventArgs(eventAbi, args.slice(0, -1)) as Record<string, any>,
            topics: event.topics || [],
            timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
            chain_id: this.chainId,
            removed: event.removed || false,
          };

          // Save to database
          await this.saveEvent(contractEvent);
          
          // Notify callback
          onEvent(contractEvent);
        } catch (error) {
          console.error(`Error processing event ${eventName}:`, error);
        }
      };

      // Store listener reference for cleanup
      this.listeners.set(eventName, listener);
      
      // Attach listener to contract
      this.contract.on(eventName, listener);
    }
  }

  // Stop monitoring events
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring || !this.contract) {
      return;
    }

    // Remove all listeners
    for (const [eventName, listener] of this.listeners) {
      this.contract.off(eventName, listener);
    }

    this.listeners.clear();
    this.isMonitoring = false;
  }

  // Get historical events
  async getHistoricalEvents(
    filter?: EventFilter
  ): Promise<ContractEvent[]> {
    if (!this.contract || !this.provider) {
      throw new Error('Contract not initialized');
    }

    const events: ContractEvent[] = [];
    const eventAbis = this.abi.filter(item => item.type === 'event');
    
    // Filter events based on criteria
    const eventsToQuery = filter?.eventNames 
      ? eventAbis.filter(e => filter.eventNames?.includes(e.name))
      : eventAbis;

    // Query each event type
    for (const eventAbi of eventsToQuery) {
      try {
        const eventFilter = this.contract.filters[eventAbi.name]();
        
        const logs = await this.contract.queryFilter(
          eventFilter,
          filter?.fromBlock || 0,
          filter?.toBlock || 'latest'
        );

        for (const log of logs) {
          const block = await this.provider.getBlock(log.blockNumber);
          
          const contractEvent: ContractEvent = {
            project_id: this.projectId,
            deployment_id: this.deploymentId,
            contract_address: this.contractAddress,
            event_name: eventAbi.name,
            event_signature: log.eventSignature || '',
            block_number: log.blockNumber,
            transaction_hash: log.transactionHash,
            transaction_index: log.transactionIndex,
            log_index: log.index,
            args: this.decodeEventArgs(eventAbi, log.args as unknown[]) as Record<string, any>,
            topics: log.topics,
            timestamp: block?.timestamp || 0,
            chain_id: this.chainId,
            removed: log.removed,
          };

          // Apply argument filters if specified
          if (filter?.argFilters) {
            let matches = true;
            for (const [key, value] of Object.entries(filter.argFilters)) {
              if (contractEvent.args[key] !== value) {
                matches = false;
                break;
              }
            }
            if (!matches) continue;
          }

          events.push(contractEvent);
        }
      } catch (error) {
        console.error(`Error fetching historical events for ${eventAbi.name}:`, error);
      }
    }

    // Sort by block number and log index
    events.sort((a, b) => {
      if (a.block_number !== b.block_number) {
        return b.block_number - a.block_number; // Newest first
      }
      return b.log_index - a.log_index;
    });

    return events;
  }

  // Decode event arguments
  private decodeEventArgs(eventAbi: { inputs?: Array<{ name: string; type: string }> }, args: unknown[]): Record<string, unknown> {
    const decoded: Record<string, unknown> = {};
    
    if (!eventAbi.inputs) return decoded;

    eventAbi.inputs.forEach((input: any, index: number) => {
      const value = args[index];
      decoded[input.name] = this.formatValue(value, input.type);
    });

    return decoded;
  }

  // Format values for display
  private formatValue(value: unknown, type: string): unknown {
    if (value === null || value === undefined) return value;

    try {
      if (type.startsWith('uint') || type.startsWith('int')) {
        return value.toString();
      }
      
      if (type === 'address') {
        return ethers.getAddress(value);
      }
      
      if (type === 'bytes32' || type.startsWith('bytes')) {
        return value;
      }
      
      if (type.endsWith('[]')) {
        return Array.isArray(value) ? value.map((v: unknown) => 
          this.formatValue(v, type.slice(0, -2))
        ) : value;
      }

      return value;
    } catch (error) {
      console.error('Error formatting value:', error);
      return value;
    }
  }

  // Save event to database
  private async saveEvent(event: ContractEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('contract_events')
        .insert({
          project_id: event.project_id,
          deployment_id: event.deployment_id,
          contract_address: event.contract_address,
          event_name: event.event_name,
          event_signature: event.event_signature,
          block_number: event.block_number,
          transaction_hash: event.transaction_hash,
          transaction_index: event.transaction_index,
          log_index: event.log_index,
          args: event.args,
          topics: event.topics,
          timestamp: new Date(event.timestamp * 1000).toISOString(),
          chain_id: event.chain_id,
          removed: event.removed,
        });

      if (error) {
        console.error('Error saving event to database:', error);
      }
    } catch (error) {
      console.error('Error saving event:', error);
    }
  }

  // Get saved events from database
  static async getSavedEvents(
    projectId: string,
    filter?: {
      contractAddress?: string;
      eventNames?: string[];
      limit?: number;
      offset?: number;
    }
  ): Promise<ContractEvent[]> {
    try {
      let query = supabase
        .from('contract_events')
        .select('*')
        .eq('project_id', projectId)
        .order('block_number', { ascending: false })
        .order('log_index', { ascending: false });

      if (filter?.contractAddress) {
        query = query.eq('contract_address', filter.contractAddress);
      }

      if (filter?.eventNames && filter.eventNames.length > 0) {
        query = query.in('event_name', filter.eventNames);
      }

      if (filter?.limit) {
        query = query.limit(filter.limit);
      }

      if (filter?.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching saved events:', error);
        return [];
      }

      return data?.map(event => ({
        ...event,
        timestamp: new Date(event.timestamp).getTime() / 1000,
      })) || [];
    } catch (error) {
      console.error('Error fetching saved events:', error);
      return [];
    }
  }

  // Clear saved events
  static async clearSavedEvents(
    projectId: string,
    contractAddress?: string
  ): Promise<void> {
    try {
      let query = supabase
        .from('contract_events')
        .delete()
        .eq('project_id', projectId);

      if (contractAddress) {
        query = query.eq('contract_address', contractAddress);
      }

      const { error } = await query;

      if (error) {
        console.error('Error clearing saved events:', error);
      }
    } catch (error) {
      console.error('Error clearing events:', error);
    }
  }

  // Get event statistics
  static async getEventStatistics(
    projectId: string,
    contractAddress?: string
  ): Promise<{ eventName: string; count: number }[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_event_statistics', {
          p_project_id: projectId,
          p_contract_address: contractAddress || null,
        });

      if (error) {
        console.error('Error fetching event statistics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return [];
    }
  }

  // Cleanup
  destroy() {
    this.stopMonitoring();
    this.contract = null;
    this.provider = null;
  }
}