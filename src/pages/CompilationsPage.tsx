import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AbiViewerModal } from '@/components/modals/AbiViewerModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileJson, 
  Download, 
  Terminal,
  Clock,
  Loader2,
  ArrowLeft,
  Code2,
  FileCode2,
  Copy,
  ExternalLink
} from 'lucide-react';

interface Compilation {
  id: string;
  project_id: string;
  user_id: string;
  success: boolean;
  status: 'success' | 'failed' | 'partial';
  wasm_binary?: string;
  wasm_size?: string;
  wasm_hash?: string;
  abi_json?: any;
  abi_solidity?: string;
  contract_size?: string;
  metadata_hash?: string;
  exit_code?: number;
  stdout?: string;
  stderr?: string;
  compilation_output?: string;
  code_snapshot: string;
  error_type?: string;
  error_details?: any;
  created_at: string;
  updated_at?: string;
}

export function CompilationsPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [compilations, setCompilations] = useState<Compilation[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState<string>('');
  const [selectedCompilation, setSelectedCompilation] = useState<Compilation | null>(null);
  const [showAbiModal, setShowAbiModal] = useState(false);
  const [showOutputModal, setShowOutputModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProjectAndCompilations();
    }
  }, [projectId]);

  const fetchProjectAndCompilations = async () => {
    try {
      setLoading(true);
      
      // Fetch project name
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();
      
      if (projectError) throw projectError;
      setProjectName(project?.name || 'Project');
      
      // Fetch compilations
      const { data, error } = await supabase
        .from('compilations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        setCompilations(data);
      }
    } catch (error) {
      console.error('Error fetching compilations:', error);
      toast({
        title: "Error",
        description: "Failed to load compilations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewAbi = (compilation: Compilation) => {
    setSelectedCompilation(compilation);
    setShowAbiModal(true);
  };

  const handleViewOutput = (compilation: Compilation) => {
    setSelectedCompilation(compilation);
    setShowOutputModal(true);
  };

  const handleViewCode = (compilation: Compilation) => {
    setSelectedCompilation(compilation);
    setShowCodeModal(true);
  };

  const handleDownloadWasm = async (compilation: Compilation) => {
    if (!compilation.wasm_binary) {
      toast({
        title: "No WASM available",
        description: "This compilation does not have a WASM binary",
        variant: "destructive",
      });
      return;
    }

    try {
      const filename = `contract_${compilation.id.slice(0, 8)}.wasm`;
      
      // Decode base64 and download
      const byteCharacters = atob(compilation.wasm_binary);
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
    } catch (error) {
      console.error('Error downloading WASM:', error);
      toast({
        title: "Download failed",
        description: "Failed to download WASM binary",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
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
        return <Badge className="bg-green-500">Success</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500">Partial</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/projects/${projectId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-6 w-6" />
              Compilation History
            </h1>
            <p className="text-muted-foreground">
              {projectName} • {compilations.length} compilations
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={fetchProjectAndCompilations}
        >
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Compilations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{compilations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {compilations.filter(c => c.status === 'success').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {compilations.filter(c => c.status === 'failed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {compilations.length > 0 
                ? Math.round((compilations.filter(c => c.status === 'success').length / compilations.length) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compilations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Compilation Records</CardTitle>
          <CardDescription>
            View and download compilation artifacts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {compilations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No compilations yet. Compile your contract to see results here.
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Date & Time</TableHead>
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
                        {format(new Date(compilation.created_at), 'MMM d, yyyy HH:mm:ss')}
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
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewOutput(compilation)}
                            title="View output"
                          >
                            <Terminal className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewCode(compilation)}
                            title="View code snapshot"
                          >
                            <Code2 className="h-4 w-4" />
                          </Button>
                          {(compilation.abi_json || compilation.abi_solidity) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewAbi(compilation)}
                              title="View ABI"
                            >
                              <FileJson className="h-4 w-4" />
                            </Button>
                          )}
                          {compilation.wasm_binary && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadWasm(compilation)}
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

      {/* Modals */}
      {selectedCompilation && (
        <>
          {/* ABI Viewer Modal */}
          <AbiViewerModal
            open={showAbiModal}
            onOpenChange={setShowAbiModal}
            abiJson={selectedCompilation.abi_json}
            abiSolidity={selectedCompilation.abi_solidity}
            compilationId={selectedCompilation.id}
            projectName={projectName}
          />

          {/* Output Viewer Modal */}
          <Dialog open={showOutputModal} onOpenChange={setShowOutputModal}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    Compilation Output
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(
                      selectedCompilation.compilation_output || '',
                      'Output'
                    )}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[500px] w-full rounded-md border bg-black p-4">
                <pre className="text-sm font-mono whitespace-pre-wrap text-green-400">
                  {selectedCompilation.compilation_output || 'No output available'}
                </pre>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* Code Snapshot Modal */}
          <Dialog open={showCodeModal} onOpenChange={setShowCodeModal}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileCode2 className="h-5 w-5" />
                    Code Snapshot
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(
                      selectedCompilation.code_snapshot,
                      'Code'
                    )}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  <code>{selectedCompilation.code_snapshot}</code>
                </pre>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}