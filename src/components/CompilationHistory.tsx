import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AbiViewerModal } from '@/components/modals/AbiViewerModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileJson, 
  Download, 
  Eye, 
  Clock,
  Loader2,
  Terminal
} from 'lucide-react';

interface CompilationRecord {
  id: string;
  project_id: string;
  success: boolean;
  status: 'success' | 'failed' | 'partial';
  wasm_size?: string;
  contract_size?: string;
  error_type?: string;
  created_at: string;
  has_wasm: boolean;
  has_abi: boolean;
}

interface CompilationDetail {
  id: string;
  success: boolean;
  status: string;
  abi_json?: any;
  abi_solidity?: string;
  compilation_output?: string;
  code_snapshot: string;
  error_details?: any;
}

interface CompilationHistoryProps {
  projectId: string;
  projectName?: string;
  onRefresh?: () => void;
}

export function CompilationHistory({ projectId, projectName, onRefresh }: CompilationHistoryProps) {
  const [compilations, setCompilations] = useState<CompilationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompilation, setSelectedCompilation] = useState<CompilationDetail | null>(null);
  const [showAbiModal, setShowAbiModal] = useState(false);
  const [showOutputModal, setShowOutputModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCompilations();
  }, [projectId]);

  const fetchCompilations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('compilations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      if (data) {
        setCompilations(data.map(comp => ({
          ...comp,
          has_wasm: !!comp.wasm_binary,
          has_abi: !!(comp.abi_json || comp.abi_solidity)
        })));
      }
    } catch (error) {
      console.error('Error fetching compilations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch compilation history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCompilationDetails = async (compilationId: string) => {
    try {
      const { data, error } = await supabase
        .from('compilations')
        .select('*')
        .eq('id', compilationId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching compilation details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch compilation details",
        variant: "destructive",
      });
    }
    return null;
  };

  const handleViewAbi = async (compilation: CompilationRecord) => {
    const details = await fetchCompilationDetails(compilation.id);
    if (details) {
      setSelectedCompilation(details);
      setShowAbiModal(true);
    }
  };

  const handleViewOutput = async (compilation: CompilationRecord) => {
    const details = await fetchCompilationDetails(compilation.id);
    if (details) {
      setSelectedCompilation(details);
      setShowOutputModal(true);
    }
  };

  const handleDownloadWasm = async (compilationId: string) => {
    try {
      const { data, error } = await supabase
        .from('compilations')
        .select('wasm_binary, project_id')
        .eq('id', compilationId)
        .single();
      
      if (error) throw error;
      
      if (data && data.wasm_binary) {
        const filename = `contract_${compilationId.slice(0, 8)}.wasm`;
        
        // Decode base64 and download
        const byteCharacters = atob(data.wasm_binary);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/wasm' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Download started",
          description: `${filename} is being downloaded`,
        });
      } else {
        toast({
          title: "No WASM available",
          description: "This compilation does not have a WASM binary",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error downloading WASM:', error);
      toast({
        title: "Download failed",
        description: "Failed to download WASM binary",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case 'partial':
        return <Badge variant="secondary" className="bg-yellow-500">Partial</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Compilation History
              </CardTitle>
              <CardDescription>
                Recent compilation attempts for {projectName || 'this project'}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchCompilations();
                if (onRefresh) onRefresh();
              }}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {compilations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No compilation history yet. Compile your contract to see results here.
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Contract Size</TableHead>
                    <TableHead>WASM Size</TableHead>
                    <TableHead>Error Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compilations.map((compilation) => (
                    <TableRow key={compilation.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(compilation.status)}
                          {getStatusBadge(compilation.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(compilation.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {compilation.contract_size || '-'}
                      </TableCell>
                      <TableCell>
                        {compilation.wasm_size || '-'}
                      </TableCell>
                      <TableCell>
                        {compilation.error_type && (
                          <Badge variant="outline">{compilation.error_type}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewOutput(compilation)}
                            title="View compilation output"
                          >
                            <Terminal className="h-4 w-4" />
                          </Button>
                          {compilation.has_abi && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewAbi(compilation)}
                              title="View ABI"
                            >
                              <FileJson className="h-4 w-4" />
                            </Button>
                          )}
                          {compilation.has_wasm && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadWasm(compilation.id)}
                              title="Download WASM"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ABI Viewer Modal */}
      {selectedCompilation && (
        <AbiViewerModal
          open={showAbiModal}
          onOpenChange={setShowAbiModal}
          abiJson={selectedCompilation.abi_json}
          abiSolidity={selectedCompilation.abi_solidity}
          compilationId={selectedCompilation.id}
          projectName={projectName}
        />
      )}

      {/* Output Viewer Modal */}
      {selectedCompilation && showOutputModal && (
        <Dialog open={showOutputModal} onOpenChange={setShowOutputModal}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Compilation Output
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[500px] w-full rounded-md border p-4">
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {selectedCompilation.compilation_output || 'No output available'}
              </pre>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// Import Dialog components that were missing
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';