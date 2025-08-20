import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Copy,
  ExternalLink,
  MoreVertical,
  FileCode2,
  Rocket,
  Network,
  Clock,
  Wallet,
  Code2,
  ShieldCheck,
  ShieldX,
  Shield,
} from 'lucide-react';
import { Deployment } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { getExplorerUrlByChainId, getNetworkInfo } from '@/lib/config';

interface DeploymentWithProject extends Deployment {
  project?: {
    id: string;
    name: string;
    exists: boolean;
  };
}

interface DeploymentTableProps {
  deployments: Deployment[];
  isLoading?: boolean;
}

const getChainExplorerUrl = (chainId: number, type: 'address' | 'tx', value: string) => {
  return getExplorerUrlByChainId(chainId, type, value);
};

const getChainName = (chainId: number) => {
  return getNetworkInfo(chainId).name;
};

const getChainColor = (chainId: number) => {
  const colors: Record<number, string> = {
    421614: 'text-blue-500',
    42161: 'text-green-500',
    98985: 'text-purple-500',
  };
  return colors[chainId] || 'text-gray-500';
};

export function DeploymentTable({
  deployments,
  isLoading,
}: DeploymentTableProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [deploymentsWithProjects, setDeploymentsWithProjects] = useState<DeploymentWithProject[]>([]);
  const itemsPerPage = 10;
  
  useEffect(() => {
    fetchProjectNames();
  }, [deployments]);
  
  const fetchProjectNames = async () => {
    try {
      const projectIds = [...new Set(deployments.map(d => d.project_id))];
      
      if (projectIds.length === 0) {
        setDeploymentsWithProjects(deployments);
        return;
      }
      
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);
      
      if (error) throw error;
      
      const projectMap = new Map(projects?.map(p => [p.id, { ...p, exists: true }]) || []);
      
      const enhanced = deployments.map(d => ({
        ...d,
        project: projectMap.get(d.project_id) || { id: d.project_id, name: 'Deleted Project', exists: false }
      }));
      
      setDeploymentsWithProjects(enhanced);
    } catch (error) {
      console.error('Error fetching project names:', error);
      setDeploymentsWithProjects(deployments);
    }
  };
  
  const totalPages = Math.max(1, Math.ceil(deploymentsWithProjects.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDeployments = deploymentsWithProjects.slice(startIndex, startIndex + itemsPerPage);
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`,
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
            <div className="w-10 h-10 rounded-md bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (deploymentsWithProjects.length === 0) {
    return (
      <div className="h-[calc(100vh-20rem)] rounded-lg border bg-card flex items-center justify-center p-8">
        <div className="text-center max-w-sm mx-auto">
          <div className="relative mx-auto w-24 h-24 mb-6">
            {/* Background glow effect */}
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            
            {/* Icon container */}
            <div className="relative bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center">
              <Rocket className="h-12 w-12 text-primary" />
            </div>
          </div>
          
          <h3 className="text-2xl font-semibold mb-3">
            No deployments yet
          </h3>
          
          <p className="text-muted-foreground">
            Deploy your contracts to see them here. Your deployment history will be tracked across all supported chains.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-11 px-6 text-left text-xs font-medium text-muted-foreground w-[20%]">
                <div className="flex items-center gap-2">
                  <Code2 className="h-3.5 w-3.5" />
                  Project
                </div>
              </th>
              <th className="h-11 px-6 text-left text-xs font-medium text-muted-foreground w-[20%]">
                Contract Address
              </th>
              <th className="h-11 px-6 text-left text-xs font-medium text-muted-foreground w-[15%]">
                <div className="flex items-center gap-2">
                  <Network className="h-3.5 w-3.5" />
                  Chain
                </div>
              </th>
              <th className="h-11 px-6 text-left text-xs font-medium text-muted-foreground w-[15%]">
                Transaction
              </th>
              <th className="h-11 px-6 text-left text-xs font-medium text-muted-foreground w-[12%]">
                <div className="flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5" />
                  Wallet
                </div>
              </th>
              <th className="h-11 px-6 text-left text-xs font-medium text-muted-foreground w-[13%]">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Deployed
                </div>
              </th>
              <th className="w-[46px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedDeployments.map((deployment) => (
              <tr 
                key={deployment.id}
                className={cn(
                  "group hover:bg-muted/50 cursor-pointer",
                  "transition-colors duration-100"
                )}
                onClick={() => 
                  window.open(
                    getChainExplorerUrl(deployment.chain_id, 'address', deployment.contract_address),
                    '_blank'
                  )
                }
              >
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <span 
                      className={cn(
                        "text-sm font-medium",
                        deployment.project?.exists ? "hover:text-primary cursor-pointer" : "text-muted-foreground"
                      )}
                      onClick={(e) => {
                        if (deployment.project?.exists) {
                          e.stopPropagation();
                          navigate(`/projects/${deployment.project_id}`);
                        }
                      }}
                    >
                      {deployment.project?.name || 'Unknown Project'}
                    </span>
                    {deployment.project?.exists && (
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                    )}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono">
                      {deployment.contract_address.slice(0, 6)}...
                      {deployment.contract_address.slice(-4)}
                    </code>
                    {/* Verification Badge */}
                    {(deployment.chain_id === 42161 || deployment.chain_id === 421614) && (
                      <div className="flex items-center">
                        {deployment.verification_status === 'verified' && (
                          <div className="flex items-center gap-1 text-green-600" title="Verified on Arbiscan">
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </div>
                        )}
                        {deployment.verification_status === 'pending' && (
                          <div className="flex items-center gap-1 text-yellow-600" title="Verification pending">
                            <Shield className="h-3.5 w-3.5 animate-pulse" />
                          </div>
                        )}
                        {deployment.verification_status === 'failed' && (
                          <div className="flex items-center gap-1 text-red-600" title="Verification failed">
                            <ShieldX className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(deployment.contract_address, 'Contract address');
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", getChainColor(deployment.chain_id).replace('text-', 'bg-'))} />
                    <span className={cn("text-sm", getChainColor(deployment.chain_id))}>
                      {deployment.chain_name || getChainName(deployment.chain_id)}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  {deployment.tx_hash || deployment.metadata?.tx_hash ? (
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-muted-foreground">
                        {(deployment.tx_hash || deployment.metadata?.tx_hash || '').slice(0, 8)}...
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            getChainExplorerUrl(
                              deployment.chain_id, 
                              'tx', 
                              deployment.tx_hash || deployment.metadata?.tx_hash || ''
                            ),
                            '_blank'
                          );
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  <Badge 
                    variant="outline"
                    className={cn(
                      "font-normal",
                      deployment.deployment_mode === 'wizard' || deployment.metadata?.deployment_mode === 'wizard'
                        ? 'border-blue-500/50 text-blue-600' 
                        : 'border-purple-500/50 text-purple-600'
                    )}
                  >
                    {deployment.deployment_mode === 'wizard' || deployment.metadata?.deployment_mode === 'wizard' 
                      ? 'Wizard Wallet' 
                      : 'Personal Wallet'}
                  </Badge>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(deployment.created_at), { addSuffix: true })}
                  </span>
                </td>
                <td className="pr-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {deployment.project?.exists && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${deployment.project_id}`);
                          }}
                        >
                          <Code2 className="mr-2 h-4 w-4" />
                          Open Project
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            getChainExplorerUrl(deployment.chain_id, 'address', deployment.contract_address),
                            '_blank'
                          );
                        }}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View on Explorer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(deployment.contract_address, 'Contract address');
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Address
                      </DropdownMenuItem>
                      {deployment.abi && deployment.abi.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              const abiStr = JSON.stringify(deployment.abi, null, 2);
                              copyToClipboard(abiStr, 'Contract ABI');
                            }}
                          >
                            <FileCode2 className="mr-2 h-4 w-4" />
                            Copy ABI
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <div>
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, deploymentsWithProjects.length)} of{' '}
            {deploymentsWithProjects.length} deployments
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }
              
              if (pageNumber > totalPages) return null;
              
              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNumber)}
                  className="w-8"
                >
                  {pageNumber}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}