import { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { LandingPage } from '@/pages/LandingPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { EditorPage } from '@/pages/EditorPage';
import { SharedProjectPage } from '@/pages/SharedProjectPage';
import { TryOnWizardPage } from '@/pages/TryOnWizardPage';
import { EmbedGeneratorPage } from '@/pages/EmbedGeneratorPage';
import { AuthCallback } from '@/pages/auth/AuthCallback';
import { GAPageView } from '@/components/analytics/GAPageView';
import { initGA } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';
import { wagmiConfig } from '@/lib/wallet/config';
import { WalletProvider } from '@/contexts/WalletContext';

// Import RainbowKit styles
import '@rainbow-me/rainbowkit/styles.css';

// Create a client for TanStack Query
const queryClient = new QueryClient();

// RainbowKit theme wrapper component
function RainbowKitThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  
  return (
    <RainbowKitProvider
      theme={resolvedTheme === 'dark' ? darkTheme() : lightTheme()}
      showRecentTransactions={true}
    >
      {children}
    </RainbowKitProvider>
  );
}

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

        // Try to get user data
        let { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        // If no user data exists, create it instead of signing out
        if (!userData) {
          console.log('User record not found, creating...');
          
          // Create user record
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              email: authUser.email,
            })
            .select()
            .single();

          if (insertError) {
            console.error('Failed to create user record:', insertError);
            // Only sign out if we can't create the user record
            // This might be due to RLS policies
            if (insertError.code === '42501') {
              console.error('RLS policy violation - user cannot create their own record');
            }
            // Don't sign out immediately, give it another try
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Try one more time to get the user data
            const { data: retryData } = await supabase
              .from('users')
              .select('*')
              .eq('id', authUser.id)
              .single();
              
            if (retryData) {
              userData = retryData;
            } else {
              // Only sign out if we really can't get or create user data
              await supabase.auth.signOut();
              navigate('/', { replace: true });
              return;
            }
          } else {
            userData = newUser;
            
            // Create initial projects for new user
            try {
              const { createInitialProjects } = await import('./lib/auth');
              await createInitialProjects(authUser.id);
            } catch (error) {
              console.error('Failed to create initial projects:', error);
            }
          }
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
  const isPublicRoute = location.pathname === '/' || 
                       (location.pathname.startsWith('/projects/') && location.pathname.endsWith('/shared')) ||
                       location.pathname.startsWith('/tryonwizard/') ||
                       location.pathname.startsWith('/auth/');

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isAuthed = !!session?.user;
      setIsAuthenticated(isAuthed);

      // Check for pending GitHub linking after successful sign-in
      if (event === 'SIGNED_IN' && isAuthed && session?.user) {
        const pendingGitHubLink = localStorage.getItem('pendingGitHubLink');
        const linkingEmail = localStorage.getItem('linkingEmail');
        
        if (pendingGitHubLink === 'true' && linkingEmail && session.user.email === linkingEmail) {
          console.log('Auto-linking GitHub account after magic link sign-in');
          
          // Clear the pending link flags immediately to prevent loops
          localStorage.removeItem('pendingGitHubLink');
          localStorage.removeItem('linkingEmail');
          
          // Add a small delay to ensure session is fully established
          setTimeout(async () => {
            try {
              // Set a flag to indicate we're in linking mode
              localStorage.setItem('linkingInProgress', 'true');
              const { linkIdentity } = await import('./lib/auth');
              await linkIdentity('github'); // Use linkIdentity instead of signInWithGitHub since user is already signed in
            } catch (error) {
              console.error('Auto GitHub linking failed:', error);
              localStorage.removeItem('linkingInProgress');
              // Navigate to projects on failure
              navigate('/projects', { replace: true });
            }
          }, 1000);
          return; // Don't do normal navigation
        }
      }

      // Only navigate on sign in/out if we're on the landing page, but not during auth callback processing
      // Also don't navigate if we're on the TryOnWizard page
      if (event === 'SIGNED_IN' && isAuthed && location.pathname === '/') {
        navigate('/projects', { replace: true });
      } else if (event === 'SIGNED_OUT' && !location.pathname.startsWith('/auth/') && !location.pathname.startsWith('/tryonwizard/')) {
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

  // Redirect authenticated users to projects page if they try to access landing page only
  // Don't redirect from tryonwizard or auth callback pages
  if (isAuthenticated && location.pathname === '/') {
    return <Navigate to="/projects" replace />;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <RainbowKitThemeProvider>
            <WalletProvider>
              {isPublicRoute && <GAPageView />}
              
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/projects/:id/shared" element={<SharedProjectPage />} />
                <Route path="/tryonwizard/:encodedData" element={<TryOnWizardPage />} />
                <Route path="/auth/callback" element={<AuthCallback />} />

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
                <Route path="/embed/generator" element={
                  <PrivateRoute>
                    <EmbedGeneratorPage />
                  </PrivateRoute>
                } />

                {/* Catch all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <Toaster />
            </WalletProvider>
          </RainbowKitThemeProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;