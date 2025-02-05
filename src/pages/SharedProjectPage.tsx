import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Wand2, 
  Clock, 
  Calendar, 
  FileCode2,
  Terminal,
  PlayCircle,
  Lock,
} from 'lucide-react';
import { Editor } from '@/components/Editor';
import { CompilerView } from '@/components/views/CompilerView';
import { ABIView } from '@/components/views/ABIView';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Project, User, CompilationResult } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { SEO } from '@/components/seo/SEO';

const VIEWS = [
  { id: 'editor', title: 'Editor', icon: FileCode2 },
  { id: 'abi', title: 'Contract Interface', icon: PlayCircle },
  { id: 'console', title: 'Console', icon: Terminal },
] as const;

type ViewId = typeof VIEWS[number]['id'];

export function SharedProjectPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [owner, setOwner] = useState<User | null>(null);
  const [activeViews, setActiveViews] = useState<ViewId[]>(['editor', 'abi', 'console']);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCompilation, setLastCompilation] = useState<CompilationResult | null>(null);
  const { id } = useParams();

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;
      
      try {
        // First check if project exists and is public
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select(`
            *,
            user:user_id (
              id,
              email
            )
          `)
          .eq('id', id)
          .single();

        if (projectError) throw projectError;
        if (!project) throw new Error('Project not found');
        if (!project.is_public) throw new Error('This project is private');

        setProject(project);
        setOwner(project.user);

        // Fetch last successful compilation
        const { data: compilations, error: compilationError } = await supabase
          .from('compilation_history')
          .select('*')
          .eq('project_id', id)
          .eq('status', 'success')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!compilationError && compilations && compilations.length > 0) {
          const lastCompilation = compilations[0];
          setLastCompilation({
            success: true,
            exit_code: lastCompilation.exit_code,
            stdout: lastCompilation.stdout || '',
            stderr: lastCompilation.stderr || '',
            details: lastCompilation.details || { compilation_time: Date.now() / 1000 },
            abi: lastCompilation.abi,
            code_snapshot: lastCompilation.code_snapshot,
          });
        }

        // Record view
        try {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase
            .from('project_views')
            .insert({
              project_id: project.id,
              viewer_id: user?.id,
              viewer_ip: 'anonymous',
            })
            .select()
            .single();
        } catch (viewError) {
          console.warn('Failed to record view:', viewError);
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        setError(error instanceof Error ? error.message : 'Failed to load project');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  const toggleView = (viewId: ViewId) => {
    setActiveViews(prev => {
      const isActive = prev.includes(viewId);
      if (isActive) {
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

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm">Loading project...</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="p-3 rounded-full bg-red-500/10 mx-auto w-fit">
            <Lock className="h-6 w-6 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Access Denied</h1>
            <p className="text-muted-foreground">{error || 'Project not found'}</p>
          </div>
          <Button asChild>
            <Link to="/">Return Home</Link>
          </Button>
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
        title={`${project.name} (Shared View)`}
        description={project.description || 'Shared smart contract project'}
        type="app"
      />
      
      <header className="h-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-full flex flex-col justify-center px-4">
          <div className="flex items-center">
            {/* Left side - Project info */}
            <div className="flex-1 flex items-center gap-4">
              <Link 
                to="/" 
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wand2 className="h-5 w-5 text-primary" />
                </div>
              </Link>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-semibold">{project.name}</h1>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                      Shared View
                    </Badge>
                    {owner && (
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-500">
                        Developer: {owner.email}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Created {formatDate(project.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Shared {formatDate(project.shared_at || project.updated_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Center - View Controls */}
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

            {/* Right side - Theme toggle */}
            <div className="flex-1 flex items-center justify-end">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={cn("flex", mainHeight)}>
          {hasEditor && (
            <div style={{ width: getMainPanelWidth() }} className="h-full overflow-hidden p-2">
              <Editor
                value={project.code}
                onChange={() => {}} // No-op since this is read-only
                readOnly={true}
                projectId={project.id}
                lastCompilation={lastCompilation}
                isSharedView={true}
              />
            </div>
          )}

          {hasABI && (
            <div style={{ width: getMainPanelWidth() }} className="h-full overflow-hidden p-2">
              <ABIView 
                projectId={project.id}
                isSharedView={true}
              />
            </div>
          )}
        </div>

        {hasConsole && (
          <div className={cn("border-t overflow-hidden p-2", consoleHeight)}>
            <CompilerView 
              result={lastCompilation}
              isSharedView={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}