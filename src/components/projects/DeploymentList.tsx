import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import { Deployment } from '@/lib/types';
import { DeploymentTable } from './DeploymentTable';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface DeploymentListProps {
  searchQuery?: string;
  projectId?: string;
  isLoading?: boolean;
}

const ITEMS_PER_PAGE = 10;

export function DeploymentList({ 
  searchQuery: externalSearchQuery = '', 
  projectId,
  isLoading: externalLoading = false 
}: DeploymentListProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [filteredDeployments, setFilteredDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery);
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    fetchDeployments();
  }, [projectId]);

  useEffect(() => {
    filterDeployments();
  }, [deployments, searchQuery, selectedChain, selectedMode, externalSearchQuery]);

  const fetchDeployments = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      let query = supabase
        .from('deployments')
        .select('*')
        .order('created_at', { ascending: false });

      // If projectId is provided, filter by it
      if (projectId) {
        query = query.eq('project_id', projectId);
      } else {
        // Otherwise, get all deployments for the user's projects
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('user_id', user.id);
        
        if (projects && projects.length > 0) {
          const projectIds = projects.map(p => p.id);
          query = query.in('project_id', projectIds);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setDeployments(data || []);
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

  const filterDeployments = () => {
    let filtered = [...deployments];

    // Search filter
    const query = (externalSearchQuery || searchQuery).toLowerCase();
    if (query) {
      filtered = filtered.filter(d => 
        d.contract_address.toLowerCase().includes(query) ||
        d.chain_name.toLowerCase().includes(query) ||
        (d.tx_hash && d.tx_hash.toLowerCase().includes(query)) ||
        (d.metadata?.tx_hash && d.metadata.tx_hash.toLowerCase().includes(query))
      );
    }

    // Chain filter
    if (selectedChain !== 'all') {
      filtered = filtered.filter(d => d.chain_id.toString() === selectedChain);
    }

    // Mode filter
    if (selectedMode !== 'all') {
      filtered = filtered.filter(d => 
        (d.deployment_mode || d.metadata?.deployment_mode || 'wizard') === selectedMode
      );
    }

    setFilteredDeployments(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const uniqueChains = Array.from(new Set(deployments.map(d => d.chain_id)));
  const totalPages = Math.ceil(filteredDeployments.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by address, transaction hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedChain} onValueChange={setSelectedChain}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Chains" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Chains</SelectItem>
              {uniqueChains.map(chainId => (
                <SelectItem key={chainId} value={chainId.toString()}>
                  {getChainName(chainId)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMode} onValueChange={setSelectedMode}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Modes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="wizard">Wizard</SelectItem>
              <SelectItem value="user">Personal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <DeploymentTable
        deployments={filteredDeployments}
        isLoading={isLoading || externalLoading}
      />
    </div>
  );
}

function getChainName(chainId: number): string {
  const chains: Record<number, string> = {
    421614: 'Arbitrum Sepolia',
    42161: 'Arbitrum One',
    98985: 'Superposition Testnet',
  };
  return chains[chainId] || `Chain ${chainId}`;
}