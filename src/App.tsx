import { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { LandingPage } from '@/pages/LandingPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { EditorPage } from '@/pages/EditorPage';
import { SharedProjectPage } from '@/pages/SharedProjectPage';
import { GAPageView } from '@/components/analytics/GAPageView';
import { initGA } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';

// Auth guard component
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          navigate('/', { replace: true });
          return;
        }

        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (!userData) {
          // If no user data, sign out
          await supabase.auth.signOut();
          navigate('/', { replace: true });
          return;
        }

        setUser(userData);
      } catch (error) {
        console.error('Auth error:', error);
        navigate('/', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : null;
}

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isPublicRoute = location.pathname === '/';

  useEffect(() => {
    // Initialize GA on public routes
    if (isPublicRoute) {
      initGA();
    }

    // Check initial auth state
    const checkInitialAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } catch (error) {
        console.error('Initial auth check error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkInitialAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const isAuthed = !!session?.user;
      setIsAuthenticated(isAuthed);

      // Only navigate on sign in/out if we're on the landing page
      if (event === 'SIGNED_IN' && isAuthed && location.pathname === '/') {
        navigate('/projects', { replace: true });
      } else if (event === 'SIGNED_OUT') {
        navigate('/', { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, isPublicRoute, location.pathname]);

  // Show loading state while checking initial auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect authenticated users to projects page if they try to access public routes
  if (isAuthenticated && isPublicRoute) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {isPublicRoute && <GAPageView />}
      
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/projects/:id/shared" element={<SharedProjectPage />} />

        {/* Protected routes */}
        <Route path="/projects" element={
          <PrivateRoute>
            <ProjectsPage />
          </PrivateRoute>
        } />
        <Route path="/projects/:id" element={
          <PrivateRoute>
            <EditorPage />
          </PrivateRoute>
        } />

        {/* Catch all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;