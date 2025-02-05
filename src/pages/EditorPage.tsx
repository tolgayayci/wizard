import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FileCode2, Terminal, PlayCircle, Wand2, Clock, Calendar, Pencil, Check, X, Share2, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Editor } from '@/components/Editor';
import { useToast } from '@/hooks/use-toast';
import { Project, CompilationResult } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { compileContract } from '@/lib/api';
import { UserNav } from '@/components/UserNav';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CompilerView } from '@/components/views/CompilerView';
import { ABIView } from '@/components/views/ABIView';
import { cn } from '@/lib/utils';
import { SEO } from '@/components/seo/SEO';
import { ShareProjectDialog } from '@/components/ShareProjectDialog';
import { Badge } from '@/components/ui/badge';

const VIEWS = [
  { id: 'editor', title: 'Editor', icon: FileCode2 },
  { id: 'abi', title: 'Contract Interface', icon: PlayCircle },
  { id: 'console', title: 'Console', icon: Terminal },
] as const;

type ViewId = typeof VIEWS[number]['id'];

export function EditorPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [activeViews, setActiveViews] = useState<ViewId[]>(['editor', 'abi', 'console']);
  const [lastCompilationResult, setLastCompilationResult] = useState<CompilationResult | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [refreshABITrigger, setRefreshABITrigger] = useState(0);
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

        // Fetch last compilation regardless of status
        const { data: compilations, error: compilationError } = await supabase
          .from('compilation_history')
          .select('*')
          .eq('project_id', id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!compilationError && compilations && compilations.length > 0) {
          const lastCompilation = compilations[0];
          setLastCompilationResult({
            success: lastCompilation.status === 'success',
            exit_code: lastCompilation.exit_code,
            stdout: lastCompilation.stdout || '',
            stderr: lastCompilation.stderr || '',
            details: lastCompilation.details || { compilation_time: Date.now() / 1000 },
            abi: lastCompilation.abi,
            code_snapshot: lastCompilation.code_snapshot,
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
    
    // Fetch the latest project data to update the UI
    try {
      const { data: updatedProject, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', project.id)
        .single();

      if (error) throw error;
      if (!updatedProject) throw new Error('Project not found');

      setProject(updatedProject);
    } catch (error) {
      console.error('Error fetching updated project:', error);
    }
  };

  const handleCompile = async () => {
    if (!project || isCompiling) return;

    // First save the current code
    try {
      const { error: saveError } = await supabase
        .from('projects')
        .update({ 
          code: project.code,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      if (saveError) throw saveError;
    } catch (error) {
      console.error('Error saving code:', error);
      toast({
        title: "Error",
        description: "Failed to save code before compilation",
        variant: "destructive",
      });
      return;
    }

    setIsCompiling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      const result = await compileContract(project.code, user.id, project.id);
      setLastCompilationResult(result);

      // Save compilation result to history
      const { error: historyError } = await supabase
        .from('compilation_history')
        .insert({
          project_id: project.id,
          user_id: user.id,
          code_snapshot: project.code,
          result: {
            stdout: result.stdout,
            stderr: result.stderr,
            details: result.details,
          },
          status: result.success ? 'success' : 'error',
          exit_code: result.exit_code,
          stdout: result.stdout,
          stderr: result.stderr,
          abi: result.abi,
          error_type: 'compilation',
          metadata: {
            compilation_time: result.details.compilation_time,
            project_path: result.details.project_path,
          }
        });

      if (historyError) throw historyError;

      // Update project activity
      await supabase
        .from('projects')
        .update({ 
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      toast({
        title: result.success ? "Compilation Successful" : "Compilation Failed",
        description: result.success 
          ? "Your code compiled successfully"
          : "Failed to compile your code",
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Compilation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to compile project",
        variant: "destructive",
      });
    } finally {
      setIsCompiling(false);
    }
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

  const handleReportIssue = () => {
    window.open('https://github.com/tolgayayci/wizard/issues/new?labels=bug&template=bug_report.md', '_blank');
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
  const mainHeight = hasConsole ? 'h-[75%]' : 'h-full';
  const consoleHeight = 'h-[25%]';

  const getMainPanelWidth = () => {
    const activeMainViews = [hasEditor, hasABI].filter(Boolean).length;
    if (activeMainViews === 0) return '100%';
    return `${100 / activeMainViews}%`;
  };

  return (
    <div className="h-screen flex flex-col bg-background">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleStartEditing}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Badge 
                        variant="outline" 
                        className="px-1 h-4 text-[10px] bg-primary/10 text-primary hover:bg-primary/20"
                      >
                        BETA
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5"
                        onClick={handleReportIssue}
                      >
                        <Bug className="h-3.5 w-3.5" />
                        <span className="text-xs">Report Issue</span>
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

              <ThemeToggle />
              <UserNav />
            </div>
          </div>
        </div>
      </header>

      {project && (
        <ShareProjectDialog
          open={showShareDialog}
          onOpenChange={handleShareDialogChange}
          projectId={project.id}
          projectName={project.name}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={cn("flex", mainHeight)}>
          {hasEditor && (
            <div style={{ width: getMainPanelWidth() }} className="h-full overflow-hidden p-2">
              <Editor
                value={project.code}
                onChange={(code) => setProject(prev => prev ? { ...prev, code } : null)}
                onCompile={handleCompile}
                isCompiling={isCompiling}
                projectId={project.id}
                lastCompilation={lastCompilationResult}
                onDeploySuccess={handleDeploySuccess}
                onSave={handleSave}
              />
            </div>
          )}

          {hasABI && (
            <div style={{ width: getMainPanelWidth() }} className="h-full overflow-hidden p-2">
              <ABIView 
                projectId={project.id} 
                key={refreshABITrigger}
              />
            </div>
          )}
        </div>

        {hasConsole && (
          <div className={cn("border-t overflow-hidden p-2", consoleHeight)}>
            <CompilerView 
              result={lastCompilationResult}
              isCompiling={isCompiling}
              projectId={project.id}
            />
          </div>
        )}
      </div>
    </div>
  );
}