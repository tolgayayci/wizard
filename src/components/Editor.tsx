import { useState, useRef, useEffect, useCallback } from 'react';
import MonacoEditor from "@monaco-editor/react";
import { EditorHeader } from './editor/EditorHeader';
import { EditorStatusBar } from './editor/EditorStatusBar';
import { DeployDialog } from './editor/DeployDialog';
import { AbiViewerModal } from './modals/AbiViewerModal';
import { WasmAnalysisModal } from './modals/WasmAnalysisModal';
import { useTheme } from 'next-themes';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { FileCode2, WifiOff, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  initializeMonaco, 
  defineEditorTheme, 
  defaultEditorOptions 
} from '@/lib/editor';
import { formatCode, lintCode, LintResult, LintIssue } from '@/lib/api';
import axios from 'axios';
import { API_URL } from '@/lib/config';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onCompile?: () => Promise<void>;
  isCompiling?: boolean;
  readOnly?: boolean;
  projectId?: string;
  projectName?: string;
  lastCompilation?: CompilationResult | null;
  onDeploySuccess?: () => void;
  onSave?: () => void;
  isSharedView?: boolean;
  currentFile?: string | null;
}

export function Editor({ 
  value, 
  onChange, 
  onCompile, 
  isCompiling,
  readOnly = false,
  projectId,
  projectName,
  lastCompilation,
  onDeploySuccess,
  onSave,
  isSharedView = false,
  currentFile,
}: EditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [isLintingInBackground, setIsLintingInBackground] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [showABIError, setShowABIError] = useState(false);
  const [showAbiViewerModal, setShowAbiViewerModal] = useState(false);
  const [fetchedAbiData, setFetchedAbiData] = useState<any[] | null>(null);
  const [isLoadingAbi, setIsLoadingAbi] = useState(false);
  const [showWasmAnalysisModal, setShowWasmAnalysisModal] = useState(false);
  const [lintIssues, setLintIssues] = useState<LintIssue[]>([]);
  const [lintStatus, setLintStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const lintDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLintedContentRef = useRef<string>('');
  const lastLintTimeRef = useRef<number>(0);
  const { theme, systemTheme } = useTheme();
  const { toast } = useToast();
  
  // Determine language based on file extension
  const getLanguageFromFile = (filename: string | null | undefined): string => {
    if (!filename) return 'rust';
    
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'rs':
        return 'rust';
      case 'toml':
        return 'toml'; // Custom TOML language support with syntax highlighting
      case 'sh':
        return 'shell';
      case 'bash':
        return 'shell';
      case 'md':
        return 'markdown';
      case 'json':
        return 'json';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'txt':
        return 'plaintext';
      default:
        return 'rust';
    }
  };
  
  const editorLanguage = getLanguageFromFile(currentFile);

  // Get the effective theme (system or user preference)
  const effectiveTheme = theme === 'system' ? systemTheme : theme;

  // Check backend connection
  const checkBackendConnection = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/health`, { timeout: 5000 });
      if (response.status === 200) {
        setConnectionError(null);
      }
    } catch (error: any) {
      console.error('Backend connection check failed:', error);
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || 
          error.message?.includes('Network Error') || error.message?.includes('ECONNREFUSED')) {
        setConnectionError('Backend connection failed. Please check if the server is running.');
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        setConnectionError('Request timed out. The server might be overloaded.');
      } else {
        setConnectionError('Unable to connect to backend server.');
      }
    }
  }, []);

  // Check backend connection on mount and periodically
  useEffect(() => {
    checkBackendConnection();
    const interval = setInterval(checkBackendConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkBackendConnection]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    initializeMonaco(monaco);
    defineEditorTheme(monaco, effectiveTheme === 'dark');

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, handleSave);
    
    // Add content change listener for real-time linting
    editor.onDidChangeModelContent(() => {
      if (currentFile?.endsWith('.rs') && !isSharedView) {
        const content = editor.getValue();
        debouncedLint(content, false); // debounced linting
      }
    });
  };
  
  // Update editor language when file changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, editorLanguage);
      }
    }
  }, [currentFile, editorLanguage]);

  const handleSave = async () => {
    if (!projectId || !editorRef.current || isSaving || isSharedView) return;
    
    // Require a file to be selected for saving
    if (!currentFile) {
      toast({
        title: "No file selected",
        description: "Please select a file in the explorer before saving",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      const currentValue = editorRef.current.getValue();
      
      // Save to backend filesystem instead of database
      const response = await axios.post(`${API_URL}/api/filesystem/write`, {
        user_id: user.id,
        project_id: projectId,
        path: currentFile,
        content: currentValue,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to save file');
      }

      toast({
        title: "Changes saved",
        description: `${currentFile} has been saved successfully`,
      });

      // Call onSave callback to update parent component
      onSave?.();
      
      // Trigger linting after successful save for Rust files
      if (currentFile?.endsWith('.rs')) {
        debouncedLint(currentValue, true); // immediate = true for save
      }
    } catch (error: any) {
      console.error('Error saving:', error);
      
      // Check if it's a connection error
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || 
          error.message?.includes('Network Error')) {
        setConnectionError('Backend connection failed. Please check if the server is running.');
      }
      
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save your changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormat = async () => {
    if (!projectId || !currentFile || isFormatting || isSharedView) return;
    
    setIsFormatting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      const result = await formatCode(user.id, projectId, currentFile);
      
      if (result.success && result.formatted_code) {
        onChange(result.formatted_code);
        toast({
          title: "Code formatted",
          description: "Your code has been formatted successfully",
        });
      } else {
        throw new Error(result.errors.join('\n') || 'Formatting failed');
      }
    } catch (error) {
      console.error('Formatting error:', error);
      toast({
        title: "Formatting failed",
        description: error instanceof Error ? error.message : "Failed to format code",
        variant: "destructive",
      });
    } finally {
      setIsFormatting(false);
    }
  };

  // Debounced lint function for real-time linting
  const debouncedLint = useCallback(
    async (content: string, immediate: boolean = false) => {
      if (!projectId || !currentFile || !currentFile.endsWith('.rs') || isSharedView) return;
      
      // Clear existing timeout
      if (lintDebounceTimeoutRef.current) {
        clearTimeout(lintDebounceTimeoutRef.current);
      }
      
      const runLint = async () => {
        // Check if content actually changed and if enough time has passed
        const now = Date.now();
        if (
          !immediate &&
          content === lastLintedContentRef.current &&
          now - lastLintTimeRef.current < 2000 // Minimum 2 seconds between lints
        ) {
          return;
        }
        setIsLintingInBackground(true);
        setLintStatus('checking');
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const result = await lintCode(user.id, projectId, currentFile);
          
          // Handle both issues and errors from backend
          const allIssues = result.issues || [];
          const errorIssues = (result.errors || []).map((error: string, index: number) => ({
            line: 1, // Default line since backend doesn't provide line numbers yet
            column: 1,
            message: error,
            level: 'error' as const,
            code: 'lint-error'
          }));
          
          const combinedIssues = [...allIssues, ...errorIssues];
          setLintIssues(combinedIssues);
          setLintStatus(combinedIssues.length > 0 ? 'error' : 'success');
          lastLintedContentRef.current = content;
          lastLintTimeRef.current = now;
            
          // Add markers to the editor for lint issues
          if (editorRef.current && monacoRef.current) {
            const model = editorRef.current.getModel();
            if (model) {
              // Clear existing markers
              monacoRef.current.editor.setModelMarkers(model, 'clippy', []);
              
              // Add new markers if there are issues
              if (combinedIssues.length > 0) {
                const markers = combinedIssues.map(issue => ({
                  startLineNumber: issue.line || 1,
                  startColumn: issue.column || 1,
                  endLineNumber: issue.line || 1,
                  endColumn: (issue.column || 1) + 10, // Approximate end column
                  message: issue.message,
                  severity: issue.level === 'error' ? 8 : issue.level === 'warning' ? 4 : 1, // Error=8, Warning=4, Info=1
                  source: issue.code || 'clippy',
                }));
                monacoRef.current.editor.setModelMarkers(model, 'clippy', markers);
              }
            }
          }
        } catch (error) {
          console.error('Background linting error:', error);
          setLintStatus('error');
        } finally {
          setIsLintingInBackground(false);
        }
      };
      
      if (immediate) {
        runLint();
      } else {
        lintDebounceTimeoutRef.current = setTimeout(runLint, 1500);
      }
    },
    [projectId, currentFile, isSharedView]
  );

  const handleDeployClick = () => {
    // Check if we have a valid ABI from the last compilation
    if (!lastCompilation?.abi || !Array.isArray(lastCompilation.abi) || lastCompilation.abi.length === 0) {
      setShowABIError(true);
      setShowDeployDialog(true);
      return;
    }

    setShowABIError(false);
    setShowDeployDialog(true);
  };

  const handleDeploySuccess = () => {
    // Close the deploy dialog
    setShowDeployDialog(false);
    setShowABIError(false);
    
    // Show success message
    toast({
      title: "Success",
      description: "Contract deployed successfully. ABI view will refresh.",
    });

    // Call the onDeploySuccess callback if provided
    if (onDeploySuccess) {
      onDeploySuccess();
    }
  };


  const handleDownloadAbi = async () => {
    if (!projectId) return;

    setIsLoadingAbi(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      // Try to fetch ABI JSON from the backend
      const response = await axios.post(`${API_URL}/api/local/export-abi-json`, {
        user_id: user.id,
        project_id: projectId,
      });

      if (response.data.success && response.data.data) {
        // Parse the ABI JSON string
        let abiData = response.data.data;
        if (typeof abiData === 'string') {
          try {
            abiData = JSON.parse(abiData);
          } catch (parseError) {
            console.warn('Failed to parse ABI JSON, using as-is:', parseError);
          }
        }
        
        setFetchedAbiData(abiData);
        setShowAbiViewerModal(true);
      } else {
        // Fallback to using lastCompilation ABI if available
        if (lastCompilation?.abi && Array.isArray(lastCompilation.abi) && lastCompilation.abi.length > 0) {
          setFetchedAbiData(lastCompilation.abi);
          setShowAbiViewerModal(true);
        } else {
          throw new Error("No ABI data available. Make sure your contract is compiled successfully.");
        }
      }
    } catch (error) {
      console.error('ABI fetch error:', error);
      toast({
        title: "ABI Load Failed",
        description: error instanceof Error ? error.message : "Failed to load ABI data",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAbi(false);
    }
  };

  const handleAnalyzeWasm = () => {
    setShowWasmAnalysisModal(true);
  };

  // Update theme when it changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      defineEditorTheme(monacoRef.current, effectiveTheme === 'dark');
      monacoRef.current.editor.setTheme('custom-theme');
    }
  }, [effectiveTheme]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (lintDebounceTimeoutRef.current) {
        clearTimeout(lintDebounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-background border rounded-md overflow-hidden">
      <EditorHeader
        onCompile={connectionError ? () => {} : (onCompile || (() => {}))}
        onDeploy={connectionError ? () => {} : handleDeployClick}
        onSave={connectionError ? () => {} : handleSave}
        onFormat={connectionError ? () => {} : handleFormat}
        onDownloadAbi={connectionError ? () => {} : handleDownloadAbi}
        onAnalyzeWasm={connectionError ? () => {} : handleAnalyzeWasm}
        isCompiling={isCompiling || false}
        isSaving={isSaving}
        isFormatting={isFormatting}
        isLoadingAbi={isLoadingAbi}
        hasSuccessfulCompilation={lastCompilation?.wasm_available || lastCompilation?.success}
        isSharedView={isSharedView}
        currentFile={currentFile}
        isDisabled={!!connectionError}
      />
      <div className="flex-1 min-h-0 relative">
        {connectionError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-50">
            <div className="text-center space-y-4 max-w-md px-4">
              <div className="p-2.5 bg-destructive/10 rounded-md w-fit mx-auto">
                <WifiOff className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Connection Problem</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {connectionError}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={checkBackendConnection}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          </div>
        ) : null}
        <MonacoEditor
          height="100%"
          language={editorLanguage}
          value={value}
          onChange={(value) => onChange(value || '')}
          options={{
            ...defaultEditorOptions,
            readOnly: readOnly || isCompiling || isSharedView || !!connectionError,
            theme: 'custom-theme', // Set initial theme
          }}
          onMount={handleEditorDidMount}
          loading={
            <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
              <div className="text-center">
                <div className="inline-flex p-3 bg-primary/10 rounded-lg mb-6">
                  <FileCode2 className="h-6 w-6 text-primary animate-pulse" />
                </div>
                <h3 className="font-medium mb-3">Loading Editor</h3>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Initializing development environment
                  </p>
                  <p className="text-sm text-muted-foreground">
                    with syntax highlighting
                  </p>
                </div>
              </div>
            </div>
          }
        />
      </div>
      
      {/* Status Bar - Hide when backend is disconnected */}
      {!connectionError && (
        <EditorStatusBar
          lintStatus={lintStatus}
          lintIssueCount={lintIssues.length}
          isFormatting={isFormatting}
          onFormat={handleFormat}
          currentFile={currentFile}
          isSharedView={isSharedView}
          isDisabled={!!connectionError}
        />
      )}
      {projectId && !isSharedView && (
        <>
          <DeployDialog
            open={showDeployDialog}
            onOpenChange={setShowDeployDialog}
            projectId={projectId}
            lastCompilation={lastCompilation}
            onDeploySuccess={handleDeploySuccess}
            showABIError={showABIError}
            onCompile={onCompile}
          />
          <AbiViewerModal
            open={showAbiViewerModal}
            onOpenChange={(open) => {
              setShowAbiViewerModal(open);
              if (!open) {
                setFetchedAbiData(null);
              }
            }}
            abiJson={fetchedAbiData || lastCompilation?.abi}
            projectName={projectName || 'Contract'}
          />
          <WasmAnalysisModal
            open={showWasmAnalysisModal}
            onOpenChange={setShowWasmAnalysisModal}
            projectId={projectId}
          />
        </>
      )}
    </div>
  );
}