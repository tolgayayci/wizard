import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Code2, AlertCircle, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { SEO } from '@/components/seo/SEO';
import { initializeProjectFilesystem } from '@/lib/api';

console.log('[TryOnWizardPage FILE] Module loaded');

interface EmbedData {
  code: string;
  projectName: string;
  description?: string;
  dependencies?: string[];
  sourceUrl?: string;
}

export function TryOnWizardPage() {
  console.log('[TryOnWizardPage] ====== COMPONENT RENDERING ======');
  
  const { encodedData } = useParams<{ encodedData: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  console.log('[TryOnWizardPage] Got params - encodedData:', encodedData?.substring(0, 50) + '...');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [embedData, setEmbedData] = useState<EmbedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [hasAttemptedCreation, setHasAttemptedCreation] = useState(false);

  console.log('[TryOnWizardPage] Component mounted with encodedData:', encodedData?.substring(0, 50) + '...');

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      console.log('[TryOnWizardPage] Checking authentication...');
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        console.log('[TryOnWizardPage] Auth check result:', authUser ? `User: ${authUser.id}` : 'Not authenticated');
        setUser(authUser);
        
        if (!authUser) {
          console.log('[TryOnWizardPage] User not authenticated, showing auth prompt');
          setShowAuthPrompt(true);
        } else {
          console.log('[TryOnWizardPage] User is authenticated, will auto-create project when embed data is ready');
        }
      } catch (error) {
        console.error('[TryOnWizardPage] Auth check failed:', error);
        setShowAuthPrompt(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Decode and validate embed data
  useEffect(() => {
    console.log('[TryOnWizardPage] Decoding embed data...');
    if (!encodedData) {
      console.error('[TryOnWizardPage] No embed data provided!');
      setError('No embed data provided');
      setIsLoading(false);
      return;
    }

    try {
      // Decode base64 data
      const decodedJson = atob(encodedData);
      console.log('[TryOnWizardPage] Decoded JSON:', decodedJson.substring(0, 100) + '...');
      const data: EmbedData = JSON.parse(decodedJson);
      
      // Basic validation
      if (!data.code || !data.projectName) {
        throw new Error('Invalid embed data: missing code or project name');
      }

      console.log('[TryOnWizardPage] Embed data parsed successfully:', {
        projectName: data.projectName,
        codeLength: data.code.length,
        dependencies: data.dependencies,
      });
      setEmbedData(data);
    } catch (err) {
      console.error('[TryOnWizardPage] Failed to decode embed data:', err);
      setError('Invalid embed data format');
    }
  }, [encodedData]);

  // Auto-create project when user is authenticated and data is ready
  useEffect(() => {
    console.log('[TryOnWizardPage] Auto-create check:', {
      hasUser: !!user,
      hasEmbedData: !!embedData,
      isCreatingProject,
      hasError: !!error,
      hasAttemptedCreation
    });
    
    if (user && embedData && !isCreatingProject && !error && !hasAttemptedCreation) {
      console.log('[TryOnWizardPage] All conditions met, starting project creation...');
      createProject();
    }
  }, [user, embedData, isCreatingProject, error, hasAttemptedCreation]);

  const handleLogin = async () => {
    try {
      // Store the current URL to return to after auth
      const returnUrl = window.location.pathname;
      console.log('[TryOnWizardPage] Storing return URL for after auth:', returnUrl);
      sessionStorage.setItem('authReturnUrl', returnUrl);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('[TryOnWizardPage] Login failed:', error);
      toast({
        title: 'Login Failed',
        description: 'Failed to authenticate with GitHub',
        variant: 'destructive',
      });
    }
  };

  const createProject = async () => {
    if (!user || !embedData) {
      console.error('[TryOnWizardPage] Cannot create project - missing user or embedData');
      return;
    }

    console.log('[TryOnWizardPage] Starting project creation...');
    setIsCreatingProject(true);
    setHasAttemptedCreation(true);
    
    try {
      // Step 1: Create project in Supabase database
      const projectName = embedData.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      console.log('[TryOnWizardPage] Creating project in Supabase with name:', projectName);
      
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: projectName,
          description: embedData.description || 'Imported from embed',
          code: embedData.code,
          source_url: embedData.sourceUrl || window.document.referrer,
          import_type: 'embed',
          import_metadata: {
            import_date: new Date().toISOString(),
            embed_source: embedData.sourceUrl || window.document.referrer,
            dependencies: embedData.dependencies || [],
          },
          updated_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('[TryOnWizardPage] Supabase insert failed:', error);
        throw error;
      }

      console.log('[TryOnWizardPage] Project created in Supabase:', project);

      if (!project || !project.id) {
        console.error('[TryOnWizardPage] Project created but no ID returned!', project);
        throw new Error('Project created but no ID returned');
      }

      // Step 2: Initialize project filesystem on backend
      console.log('[TryOnWizardPage] Initializing filesystem for project:', project.id);
      const filesystemResult = await initializeProjectFilesystem(
        project.id,
        user.id,
        projectName,
        embedData.code,
        embedData.dependencies
      );

      console.log('[TryOnWizardPage] Filesystem initialization result:', filesystemResult);

      if (!filesystemResult.success) {
        console.error('[TryOnWizardPage] Filesystem initialization failed, rolling back...');
        // If filesystem initialization fails, delete the database entry
        await supabase
          .from('projects')
          .delete()
          .eq('id', project.id);
        
        throw new Error(filesystemResult.message);
      }

      console.log('[TryOnWizardPage] Project created successfully! Navigating to:', `/projects/${project.id}`);
      
      // Double-check project.id before navigation
      if (!project.id) {
        console.error('[TryOnWizardPage] CRITICAL: Project ID is undefined after successful creation!');
        throw new Error('Project was created but no ID was returned');
      }
      
      const projectUrl = `/projects/${project.id}`;
      console.log('[TryOnWizardPage] Final navigation URL:', projectUrl);
      
      toast({
        title: 'Project Created!',
        description: `Successfully created "${embedData.projectName}"`,
      });

      // Redirect to editor
      navigate(projectUrl);
    } catch (error) {
      console.error('[TryOnWizardPage] Project creation failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to create project');
      toast({
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create project from embed data',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingProject(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg text-muted-foreground">Loading embed data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <SEO 
          title="Error - Try on Wizard"
          description="Failed to load embedded code"
        />
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error Loading Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showAuthPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <SEO 
          title="Login Required - Try on Wizard"
          description="Sign in to try this Stylus smart contract"
        />
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Wand2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Try on Wizard</CardTitle>
            <p className="text-muted-foreground">
              Sign in to create and edit this Stylus smart contract
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {embedData && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Code2 className="h-4 w-4 text-primary" />
                    <span className="font-medium">{embedData.projectName}</span>
                  </div>
                  {embedData.description && (
                    <p className="text-sm text-muted-foreground">
                      {embedData.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Code size: {embedData.code.length} characters</span>
                    {embedData.dependencies && embedData.dependencies.length > 0 && (
                      <span>• {embedData.dependencies.length} dependencies</span>
                    )}
                  </div>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    After signing in, we'll automatically create a new project with this code and open it in the editor.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            <div className="space-y-3">
              <Button 
                onClick={handleLogin} 
                className="w-full" 
                size="lg"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Sign in with GitHub
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/')} 
                className="w-full"
              >
                Go to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is authenticated and project is being created
  console.log('[TryOnWizardPage] Rendering create project view for authenticated user');
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SEO 
        title="Creating Project - Try on Wizard"
        description="Setting up your Stylus smart contract project"
      />
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Creating Your Project</h1>
        <p className="text-muted-foreground mb-6">
          Setting up "{embedData?.projectName}" with your code...
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span>This will only take a moment</span>
        </div>
      </div>
    </div>
  );
}