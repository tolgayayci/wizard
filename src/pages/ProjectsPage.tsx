import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2Icon, Blocks, Sparkles, Wand2, PlayCircle, Bug, Rocket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ThemeProvider } from 'next-themes';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Project, Deployment } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { UserNav } from '@/components/UserNav';
import { ProjectList } from '@/components/projects/ProjectList';
import { TemplateList } from '@/components/projects/TemplateList';
import { DeploymentList } from '@/components/projects/DeploymentList';
import { PROJECT_TEMPLATES } from '@/lib/templates';
import { ProjectHeader } from '@/components/projects/ProjectHeader';
import { ProjectTabs, SortOption } from '@/components/projects/ProjectTabs';
import { ProjectEditDialog } from '@/components/projects/ProjectEditDialog';
import { ProjectDeleteDialog } from '@/components/projects/ProjectDeleteDialog';
import { NewProjectDialog } from '@/components/projects/NewProjectDialog';
import { GitHubImportDialog } from '@/components/projects/GitHubImportDialog';
import { WelcomeDialog } from '@/components/landing/WelcomeDialog';
import { cn } from '@/lib/utils';
import { SEO } from '@/components/seo/SEO';
import { Badge } from '@/components/ui/badge';

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption['value']>('updated_desc');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [activeSection, setActiveSection] = useState<'projects' | 'templates' | 'deployments'>('projects');
  const [deploymentCount, setDeploymentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [showGitHubImportDialog, setShowGitHubImportDialog] = useState(false);
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is new and show welcome tour
  useEffect(() => {
    const checkNewUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        setCurrentUser({ id: user.id });

        const { data: userProjects, error } = await supabase
          .from('projects')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1);

        // Check if we have any projects and they were just created
        if (!error && userProjects && userProjects.length > 0) {
          const firstProject = userProjects[0];
          if (Date.now() - new Date(firstProject.created_at).getTime() < 5000) {
            setShowWelcomeTour(true);
          }
        }
      } catch (error) {
        console.error('Error checking new user status:', error);
      }
    };

    checkNewUser();
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchDeploymentCount();
  }, [sortBy]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      // Only fetch projects owned by the current user
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          deployments:deployments(count)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Transform the data to include deployment count
      const projectsWithCounts = (data || []).map(project => ({
        ...project,
        deployment_count: project.deployments?.[0]?.count || 0
      }));

      // Apply sorting
      const sortedProjects = projectsWithCounts.sort((a, b) => {
        switch (sortBy) {
          case 'created_desc':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'created_asc':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'updated_desc':
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          case 'updated_asc':
            return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          case 'name_asc':
            return a.name.localeCompare(b.name);
          case 'name_desc':
            return b.name.localeCompare(a.name);
          default:
            return 0;
        }
      });

      setProjects(sortedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDeploymentCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all user's projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id);
      
      if (projects && projects.length > 0) {
        // Count deployments for all user's projects
        const { count } = await supabase
          .from('deployments')
          .select('*', { count: 'exact', head: true })
          .in('project_id', projects.map(p => p.id));
        
        setDeploymentCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching deployment count:', error);
    }
  };

  const handleCreateProject = async (data: { 
    name: string; 
    description: string; 
    template?: typeof PROJECT_TEMPLATES[0];
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      // Create project in database first
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: data.name,
          description: data.description || '',
          code: data.template?.code || '', // Empty string if no template
          updated_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Initialize backend filesystem if template is provided
      if (data.template) {
        try {
          const { initializeProjectFilesystem } = await import('@/lib/api');
          
          await initializeProjectFilesystem(
            project.id,
            user.id,
            data.name,
            data.template.code,
            data.template.dependencies || []
          );
          
          toast({
            title: "Template Project Created",
            description: `${data.template.name} template has been set up successfully`,
          });
        } catch (backendError) {
          console.warn('Backend filesystem initialization failed:', backendError);
          // Continue anyway - the database project is created
          toast({
            title: "Project Created",
            description: "Project created successfully (filesystem setup pending)",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Project created successfully",
        });
      }

      // Refresh projects list
      await fetchProjects();

      // Navigate to the new project
      navigate(`/projects/${project.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create project",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProject = async (project: Project) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      setProjects(projects.filter(p => p.id !== project.id));
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    } finally {
      setProjectToDelete(null);
    }
  };

  const handleUpdateProject = async () => {
    if (!projectToEdit) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: editName,
          description: editDescription,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectToEdit.id);

      if (error) throw error;

      setProjects(projects.map(p => 
        p.id === projectToEdit.id 
          ? { ...p, name: editName, description: editDescription }
          : p
      ));

      toast({
        title: "Success",
        description: "Project updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    } finally {
      setProjectToEdit(null);
    }
  };

  const handleGitHubImportSuccess = (projectId: string) => {
    // Refresh projects to include the new imported project
    fetchProjects();
    // Navigate to the new project
    navigate(`/projects/${projectId}`);
  };

  const sections = [
    {
      id: 'projects' as const,
      label: 'Projects',
      icon: Code2Icon,
      count: projects.length,
    },
    {
      id: 'deployments' as const,
      label: 'Deployments',
      icon: Rocket,
      count: deploymentCount,
    },
    {
      id: 'templates' as const,
      label: 'Templates',
      icon: Sparkles,
      count: PROJECT_TEMPLATES.length,
    },
  ];

  const getActiveContent = () => {
    switch (activeSection) {
      case 'projects':
        return (
          <ProjectList
            projects={projects}
            searchQuery={searchQuery}
            onNavigate={(id) => navigate(`/projects/${id}`)}
            onEdit={(project) => {
              setProjectToEdit(project);
              setEditName(project.name);
              setEditDescription(project.description || '');
            }}
            onDelete={setProjectToDelete}
            isLoading={isLoading}
          />
        );
      case 'templates':
        return (
          <TemplateList
            searchQuery={searchQuery}
            onUseTemplate={handleCreateProject}
            isLoading={isLoading}
            sortBy={sortBy}
          />
        );
      case 'deployments':
        return (
          <DeploymentList
            searchQuery={searchQuery}
            isLoading={isLoading}
          />
        );
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <SEO 
        title="Projects"
        description="Manage your Stylus smart contract projects"
        type="app"
      />
      
      {/* Fixed Header */}
      <header className="flex-none h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wand2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-lg font-bold tracking-tight",
                  "bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent"
                )}>
                  WIZARD
                </span>
                <Badge 
                  variant="outline" 
                  className="px-1 h-4 text-[10px] bg-primary/10 text-primary hover:bg-primary/20"
                >
                  BETA
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => setShowWelcomeTour(true)}
            >
              <PlayCircle className="h-4 w-4" />
              Quick Tour
            </Button>
            <ThemeToggle />
            <UserNav />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 container mx-auto">
        <div className="h-full flex flex-col py-8">
          {/* Fixed Project Header */}
          <div className="flex-none mb-8">
            <ProjectHeader 
              onNewProject={() => setShowNewProjectDialog(true)}
              onImportFromGitHub={() => setShowGitHubImportDialog(true)}
            />
          </div>

          {/* Fixed Tabs */}
          <div className="flex-none mb-6">
            <ProjectTabs
              sections={sections}
              activeSection={activeSection}
              searchQuery={searchQuery}
              sortBy={sortBy}
              onSectionChange={setActiveSection}
              onSearchChange={setSearchQuery}
              onSortChange={setSortBy}
            />
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {getActiveContent()}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <NewProjectDialog
        open={showNewProjectDialog}
        onOpenChange={setShowNewProjectDialog}
        onCreateProject={handleCreateProject}
      />

      <ProjectDeleteDialog
        project={projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleDeleteProject}
      />

      <ProjectEditDialog
        project={projectToEdit}
        name={editName}
        description={editDescription}
        onNameChange={setEditName}
        onDescriptionChange={setEditDescription}
        onClose={() => setProjectToEdit(null)}
        onConfirm={handleUpdateProject}
      />

      <GitHubImportDialog
        open={showGitHubImportDialog}
        onClose={() => setShowGitHubImportDialog(false)}
        onSuccess={handleGitHubImportSuccess}
        userId={currentUser?.id || ''}
      />

      <WelcomeDialog
        open={showWelcomeTour}
        onOpenChange={setShowWelcomeTour}
      />
    </div>
  );
}