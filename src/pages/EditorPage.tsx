import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FileCode2, Terminal as TerminalIcon, PlayCircle, Wand2, Clock, Calendar, Pencil, Check, X, Share2, FolderTree, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Editor } from '@/components/Editor';
import { useToast } from '@/hooks/use-toast';
import { Project, CompilationResult } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { compileContract, initializeProjectFilesystem } from '@/lib/api';
import { UserNav } from '@/components/UserNav';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ABIView } from '@/components/views/ABIView';
import { cn } from '@/lib/utils';
import { SEO } from '@/components/seo/SEO';
import { ShareProjectDialog } from '@/components/ShareProjectDialog';
import { Badge } from '@/components/ui/badge';
import { ProjectBadge } from '@/components/ui/ProjectBadge';
import { PackageManagerDialog } from '@/components/packages/PackageManagerDialogNew';
import { FileExplorerView } from '@/components/explorer/FileExplorerView';
import { FileExplorerRef } from '@/components/explorer/FileExplorer';
import { Terminal, TerminalRef } from '@/components/views/Terminal';
import { WalletButton } from '@/components/wallet/WalletButton';
import { apiClient } from '@/lib/api';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const VIEWS = [
  { id: 'explorer', title: 'Files', icon: FolderTree },
  { id: 'editor', title: 'Editor', icon: FileCode2 },
  { id: 'abi', title: 'Contract Interface', icon: PlayCircle },
  { id: 'console', title: 'Terminal', icon: TerminalIcon },
] as const;

type ViewId = typeof VIEWS[number]['id'];

export function EditorPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [activeViews, setActiveViews] = useState<ViewId[]>(['explorer', 'editor', 'abi', 'console']);
  const [lastCompilationResult, setLastCompilationResult] = useState<CompilationResult | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [refreshABITrigger, setRefreshABITrigger] = useState(0);
  const [selectedFile, setSelectedFile] = useState<string | null>('src/lib.rs');
  const [currentFileContent, setCurrentFileContent] = useState<string>('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const terminalRef = useRef<TerminalRef>(null);
  const fileExplorerRef = useRef<FileExplorerRef>(null);
  const [user, setUser] = useState<any>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Subscribe to project changes
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel('project_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setProject(prev => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;
      
      try {
        const { data: project, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!project) throw new Error('Project not found');

        setProject(project);
        setEditedName(project.name);

        // Initialize project filesystem on backend
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          try {
            console.log('[EditorPage] Initializing project filesystem for:', project.id);
            await initializeProjectFilesystem(
              project.id,
              user.id,
              project.name,
              project.code,
              ['stylus-sdk'] // Default dependencies
            );
            console.log('[EditorPage] Project filesystem initialized successfully');
          } catch (initError) {
            console.error('[EditorPage] Failed to initialize project filesystem:', initError);
            // Don't throw - allow the page to load even if initialization fails
          }
        }

        // Fetch last compilation regardless of status
        const { data: compilations, error: compilationError } = await supabase
          .from('compilations')
          .select('*')
          .eq('project_id', id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!compilationError && compilations && compilations.length > 0) {
          const lastCompilation = compilations[0];
          setLastCompilationResult({
            success: lastCompilation.success,
            exit_code: lastCompilation.exit_code || 0,
            stdout: lastCompilation.stdout || '',
            stderr: lastCompilation.stderr || '',
            details: {
              status: lastCompilation.status,
              contract_size: lastCompilation.contract_size,
              wasm_size: lastCompilation.wasm_size,
              metadata_hash: lastCompilation.metadata_hash,
            },
            abi: lastCompilation.abi_json || null,
            code_snapshot: lastCompilation.code_snapshot || '',
            wasm_available: !!lastCompilation.wasm_binary,
            abi_available: !!(lastCompilation.abi_json || lastCompilation.abi_solidity),
          });
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        toast({
          title: "Error",
          description: "Failed to load project",
          variant: "destructive",
        });
        navigate('/projects');
      }
    };

    fetchProject();
  }, [id, navigate, toast]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Auto-load lib.rs once when project and user are first available
  const initialFileLoadedRef = useRef(false);
  useEffect(() => {
    if (project && user && !initialFileLoadedRef.current) {
      initialFileLoadedRef.current = true;
      loadFileContent('src/lib.rs');
    }
  }, [project, user]);

  // Function to load file content
  const loadFileContent = async (filePath: string) => {
    if (!user || !project) return;
    
    setIsLoadingFile(true);
    try {
      const response = await apiClient.post('/filesystem/read', {
        user_id: user.id,
        project_id: project.id,
        path: filePath,
      });
      
      if (response.data.success) {
        setCurrentFileContent(response.data.data.content);
        setSelectedFile(filePath);
        
        // File loaded successfully - no need for toast notification
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load file',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to load file',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleStartEditing = () => {
    if (project) {
      setEditedName(project.name);
      setIsEditingName(true);
    }
  };

  const handleSaveName = async () => {
    if (!project || !editedName.trim() || editedName === project.name) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          name: editedName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      if (error) throw error;

      setProject(prev => prev ? { ...prev, name: editedName.trim() } : null);
      toast({
        title: "Success",
        description: "Project name updated successfully",
      });
    } catch (error) {
      console.error('Error updating project name:', error);
      toast({
        title: "Error",
        description: "Failed to update project name",
        variant: "destructive",
      });
      setEditedName(project.name);
    } finally {
      setIsSavingName(false);
      setIsEditingName(false);
    }
  };

  const handleCancelEditing = () => {
    if (project) {
      setEditedName(project.name);
      setIsEditingName(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEditing();
    }
  };

  const handleSave = async () => {
    if (!project) return;
    
    // Require a file to be selected for saving
    if (!selectedFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a file in the explorer before saving',
        variant: 'destructive',
      });
      return;
    }
    
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to save files',
        variant: 'destructive',
      });
      return;
    }
    
    // Save to backend filesystem only
    try {
      const response = await axios.post(`${API_URL}/api/filesystem/write`, {
        user_id: user.id,
        project_id: project.id,
        path: selectedFile,
        content: currentFileContent,
      });
      
      if (response.data.success) {
        toast({
          title: 'File saved',
          description: `Updated ${selectedFile}`,
        });
      } else {
        toast({
          title: 'Error',
          description: response.data.message || 'Failed to save file',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving file:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save file',
        variant: 'destructive',
      });
    }
  };

  const handleCompile = async () => {
    if (!project || isCompiling || !user) return;

    // Save the current file first if one is selected
    if (selectedFile) {
      try {
        const saveResponse = await axios.post(`${API_URL}/api/filesystem/write`, {
          user_id: user.id,
          project_id: project.id,
          path: selectedFile,
          content: currentFileContent,
        });
        
        if (!saveResponse.data.success) {
          toast({
            title: 'Save Failed',
            description: 'Could not save file before compilation',
            variant: 'destructive',
          });
          return;
        }
      } catch (error) {
        console.error('Error saving file before compilation:', error);
        toast({
          title: 'Save Error',
          description: 'Failed to save file before compilation',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsCompiling(true);

    try {
      // Execute compilation via API (reads from saved files)
      const response = await axios.post(`${API_URL}/api/local/compile`, {
        user_id: user.id,
        project_id: project.id,
        // No code field - backend will read from filesystem
      });

      if (response.data.success && response.data.data) {
        const compilationData = response.data.data;
        
        // Create a proper compilation result
        const compilationResult: CompilationResult = {
          success: compilationData.success,
          exit_code: compilationData.success ? 0 : 1,
          stdout: compilationData.output || '',
          stderr: compilationData.errors ? compilationData.errors.join('\n') : '',
          details: {
            status: compilationData.success ? 'success' : 'failed',
            compilation_time: Date.now() / 1000,
            contract_size: compilationData.contract_size,
            wasm_size: compilationData.wasm_size,
            metadata_hash: compilationData.metadata_hash,
          },
          abi: (() => {
            try {
              if (!compilationData.abi_json) return [];
              if (typeof compilationData.abi_json === 'object') return compilationData.abi_json;
              return JSON.parse(compilationData.abi_json);
            } catch (error) {
              console.warn('Failed to parse ABI JSON:', error);
              return [];
            }
          })(),
          code_snapshot: currentFileContent,
          wasm_available: !!compilationData.wasm,
          abi_available: !!(compilationData.abi_json || compilationData.abi_solidity),
        };

        setLastCompilationResult(compilationResult);

        // Save to new compilations table
        const compilationRecord = {
          project_id: project.id,
          user_id: user.id,
          success: compilationData.success,
          status: compilationData.success ? 'success' : (compilationData.wasm ? 'partial' : 'failed'),
          wasm_binary: compilationData.wasm ? btoa(String.fromCharCode.apply(null, compilationData.wasm)) : null,
          wasm_size: compilationData.wasm_size,
          wasm_hash: null, // Will be computed server-side
          abi_json: (() => {
            try {
              if (!compilationData.abi_json) return null;
              if (typeof compilationData.abi_json === 'object') return compilationData.abi_json;
              return JSON.parse(compilationData.abi_json);
            } catch (error) {
              console.warn('Failed to parse ABI JSON for database:', error);
              return null;
            }
          })(),
          abi_solidity: compilationData.abi_solidity,
          contract_size: compilationData.contract_size,
          metadata_hash: compilationData.metadata_hash,
          exit_code: compilationData.success ? 0 : 1,
          stdout: compilationData.output || '',
          stderr: compilationData.errors ? compilationData.errors.join('\n') : '',
          compilation_output: compilationData.output || '',
          code_snapshot: currentFileContent,
          error_type: !compilationData.success ? 
            (compilationData.output?.includes('Connection refused') ? 'network' : 
             compilationData.output?.includes('error[E') ? 'compilation' : 'unknown') : null,
          compilation_started_at: new Date().toISOString(),
          compilation_completed_at: new Date().toISOString(),
        };

        const { error: insertError } = await supabase
          .from('compilations')
          .insert(compilationRecord);

        if (insertError) {
          console.error('Failed to save compilation to database:', insertError);
        }

        // Show raw compilation output in terminal
        if (terminalRef.current && compilationData.output) {
          // Display raw cargo stylus check output preserving formatting
          terminalRef.current.writeOutput(compilationData.output);
        }

        toast({
          title: compilationData.success ? "Compilation Successful" : "Compilation Failed",
          description: compilationData.success 
            ? "Your contract compiled successfully and is ready for deployment" 
            : "Check the terminal for error details",
          variant: compilationData.success ? "default" : "destructive",
        });
        
        // Refresh file explorer after successful compilation
        if (compilationData.success && fileExplorerRef.current) {
          setTimeout(() => {
            fileExplorerRef.current?.refresh();
          }, 500); // Small delay to ensure any generated files are written
        }
      } else {
        // Even if the API request fails, check if there's compilation data with output
        if (response.data.data && response.data.data.output && terminalRef.current) {
          terminalRef.current.writeOutput(response.data.data.output);
        }
        throw new Error(response.data.error?.message || 'Compilation failed');
      }
    } catch (error) {
      console.error('Compilation error:', error);
      
      // Try to extract compilation output from axios error response
      if (terminalRef.current && error instanceof Error) {
        if ((error as any).response?.data?.data?.output) {
          terminalRef.current.writeOutput((error as any).response.data.data.output);
        } else if ((error as any).response?.data?.message) {
          // Show the error message in terminal if no output
          terminalRef.current.writeOutput((error as any).response.data.message);
        }
      }
      
      // Set failed compilation result
      setLastCompilationResult({
        success: false,
        exit_code: 1,
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown compilation error',
        details: {
          status: 'failed',
          compilation_time: Date.now() / 1000,
        },
        abi: null,
        code_snapshot: project.code,
        wasm_available: false,
        abi_available: false,
      });

      toast({
        title: "Compilation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const handleCommandComplete = () => {
    // Clear the compiling state when any command completes in terminal
    setIsCompiling(false);
  };

  const toggleView = (viewId: ViewId) => {
    setActiveViews(prev => {
      const isActive = prev.includes(viewId);
      if (isActive) {
        // Don't allow removing the last view
        const newViews = prev.filter(v => v !== viewId);
        return newViews.length > 0 ? newViews : [viewId];
      } else {
        return [...prev, viewId];
      }
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  const handleDeploySuccess = () => {
    // Trigger ABI view refresh
    setRefreshABITrigger(prev => prev + 1);
  };

  // Handle share dialog close and refresh project data
  const handleShareDialogChange = async (open: boolean) => {
    setShowShareDialog(open);
    
    // If dialog is closing, refresh project data to get latest share status
    if (!open && id) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (data) {
          setProject(prev => prev ? { ...prev, ...data } : null);
        }
      } catch (error) {
        console.error('Error refreshing project:', error);
      }
    }
  };


  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm">Loading project...</span>
        </div>
      </div>
    );
  }

  const hasConsole = activeViews.includes('console');
  const hasEditor = activeViews.includes('editor');
  const hasABI = activeViews.includes('abi');
  const hasExplorer = activeViews.includes('explorer');

  const getMainPanelWidth = (viewType: 'explorer' | 'editor' | 'abi') => {
    const views = { hasExplorer, hasEditor, hasABI };
    const mainPanelCount = [views.hasExplorer, views.hasEditor, views.hasABI].filter(Boolean).length;

    // If only one view is active, take full width
    if (mainPanelCount === 1) return '100%';

    // Calculate right-side panels (ABI + AI)
    const rightPanelCount = [views.hasABI].filter(Boolean).length;
    const hasRightPanels = rightPanelCount > 0;

    // If two views are active
    if (mainPanelCount === 2) {
      if (views.hasExplorer && views.hasEditor) {
        return viewType === 'explorer' ? '20%' : '80%';
      }
      if (views.hasEditor && hasRightPanels) {
        return viewType === 'editor' ? '60%' : '40%';
      }
      if (views.hasExplorer && hasRightPanels) {
        return viewType === 'explorer' ? '25%' : '75%';
      }
      // Two right panels (ABI + AI)
    }

    // Three or more views
    if (mainPanelCount >= 3) {
      // Calculate widths based on active panels
      if (views.hasExplorer) {
        if (viewType === 'explorer') return '14%';
      }
      if (views.hasEditor) {
        if (viewType === 'editor') return views.hasExplorer ? '43%' : '50%';
      }
      // ABI and AI share remaining space
      if (viewType === 'abi') {
        const remainingWidth = views.hasExplorer ? 43 : 50;
        return rightPanelCount === 2 ? `${remainingWidth / 2}%` : `${remainingWidth}%`;
      }
    }

    return '100%';
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <SEO 
        title={project?.name || 'Editor'}
        description={project?.description || 'Smart contract development environment'}
        type="app"
      />
      
      <header className="h-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-full flex flex-col justify-center px-4">
          <div className="flex items-center">
            {/* Left side - Project info */}
            <div className="flex-1 flex items-center gap-4">
              <Link 
                to="/projects" 
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wand2 className="h-5 w-5 text-primary" />
                </div>
              </Link>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        ref={nameInputRef}
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="h-8 text-xl font-semibold bg-background"
                        disabled={isSavingName}
                      />
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={handleSaveName}
                          disabled={isSavingName}
                        >
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={handleCancelEditing}
                          disabled={isSavingName}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-semibold">{project.name}</h1>
                      <ProjectBadge 
                        project={project} 
                        variant="detailed" 
                        showLink={true}
                        className="ml-2"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleStartEditing}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Created {formatDate(project.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Updated {formatDate(project.updated_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Center - View controls */}
            <div className="flex items-center">
              <div className="flex items-center gap-px bg-muted rounded-md border overflow-hidden">
                {VIEWS.map(view => (
                  <Button
                    key={view.id}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-3 gap-2 rounded-none transition-all relative",
                      activeViews.includes(view.id) ? [
                        "bg-background text-foreground font-medium",
                        "before:absolute before:inset-x-0 before:bottom-0 before:h-0.5 before:bg-primary",
                      ] : [
                        "text-muted-foreground hover:text-foreground hover:bg-muted/80",
                        "hover:before:absolute hover:before:inset-x-0 hover:before:bottom-0 hover:before:h-0.5 hover:before:bg-muted-foreground/30",
                      ],
                    )}
                    onClick={() => toggleView(view.id)}
                  >
                    <view.icon className={cn(
                      "h-4 w-4 transition-colors",
                      activeViews.includes(view.id) 
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    )} />
                    <span className="text-xs">{view.title}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex-1 flex items-center justify-end gap-4">
              {/* Wallet connection */}
              <WalletButton />
              
              {/* Share button hidden for now
              <div className="h-8 w-px bg-border" />
              
              <Button
                variant="outline"
                className="h-9 px-3 flex items-center gap-2"
                onClick={() => handleShareDialogChange(true)}
              >
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  project?.is_public ? "bg-green-500" : "bg-red-500"
                )} />
                <Share2 className="h-[1.2rem] w-[1.2rem]" />
              </Button>
              */}

              <ThemeToggle />
              <UserNav />
            </div>
          </div>
        </div>
      </header>

      {project && (
        <>
          <ShareProjectDialog
            open={showShareDialog}
            onOpenChange={handleShareDialogChange}
            projectId={project.id}
            projectName={project.name}
          />
          <PackageManagerDialog
            open={showPackageDialog}
            onOpenChange={(open) => {
              setShowPackageDialog(open);
              // Refresh file explorer when dialog closes (after package operations)
              if (!open && fileExplorerRef.current) {
                setTimeout(() => {
                  fileExplorerRef.current?.refresh();
                }, 500);
              }
            }}
            projectId={project.id}
            userId={user?.id || ''}
          />
        </>
      )}

      <div className="flex-1 flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 5rem)' }}>
        <div className={cn("flex overflow-hidden", hasConsole ? "flex-1" : "h-full")}>
          {hasExplorer && (
            <div style={{ width: getMainPanelWidth('explorer') }} className="h-full overflow-hidden p-2">
              <FileExplorerView
                ref={fileExplorerRef}
                userId={user?.id || ''}
                projectId={project.id}
                projectName={project.name}
                selectedFile={selectedFile}
                onFileSelect={(path) => {
                  // Extract just the file path part (remove the project path prefix)
                  const relativePath = path.split(`/${project.id}/`).pop() || path;
                  loadFileContent(relativePath);
                }}
                onManagePackages={() => setShowPackageDialog(true)}
              />
            </div>
          )}

          {hasEditor && (
            <div style={{ width: getMainPanelWidth('editor') }} className="h-full overflow-hidden p-2">
              <Editor
                value={currentFileContent}
                onChange={(content) => setCurrentFileContent(content)}
                onCompile={handleCompile}
                isCompiling={isCompiling}
                projectId={project.id}
                projectName={project.name}
                lastCompilation={lastCompilationResult}
                onDeploySuccess={handleDeploySuccess}
                onSave={handleSave}
                currentFile={selectedFile}
              />
            </div>
          )}

          {hasABI && (
            <div style={{ width: getMainPanelWidth('abi') }} className="h-full overflow-hidden p-2">
              <ABIView
                projectId={project.id}
                key={refreshABITrigger}
              />
            </div>
          )}

        </div>

        {hasConsole && (
          <div className="h-[300px] min-h-[200px] max-h-[400px] overflow-hidden p-2">
            <Terminal 
              ref={terminalRef}
              result={lastCompilationResult}
              isCompiling={isCompiling}
              projectId={project.id}
              userId={user?.id}
              projectName={project.name}
              onCommandComplete={handleCommandComplete}
            />
          </div>
        )}
      </div>
    </div>
  );
}