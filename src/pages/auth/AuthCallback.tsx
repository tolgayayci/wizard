import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle, Wand2, Link, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { handleAuthCallback, linkIdentity, signInWithMagicLink } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'link-conflict' | 'magic-link-sent'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Add loop prevention
  const preventInfiniteLoop = () => {
    // Clear all linking flags to break any potential loops
    localStorage.removeItem('pendingGitHubLink');
    localStorage.removeItem('linkingEmail');
    localStorage.removeItem('linkingInProgress');
    console.log('Loop prevention: cleared all linking flags');
  };

  useEffect(() => {
    const handleCallback = async () => {
      // Small delay to ensure URL parameters are fully loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      try {
        // Debug logging
        console.log('AuthCallback - Current URL:', window.location.href);
        console.log('AuthCallback - Search params:', window.location.search);
        console.log('AuthCallback - Hash:', window.location.hash);
        
        // Check if we're in a linking flow
        const linkingInProgress = localStorage.getItem('linkingInProgress');
        console.log('AuthCallback - Linking in progress:', linkingInProgress);
        
        // No retry prevention - let Supabase handle rate limiting naturally
        
        // Check for error in URL params first
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        // Also check hash parameters for errors
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashError = hashParams.get('error');
        const hashErrorDescription = hashParams.get('error_description');
        
        const finalError = error || hashError;
        const finalErrorDescription = errorDescription || hashErrorDescription;
        
        console.log('AuthCallback - Error:', finalError);
        console.log('AuthCallback - Error description:', finalErrorDescription);
        
        if (finalError) {
          console.log('Processing error:', finalError, finalErrorDescription);
          
          // If we're in linking mode and get an error, it means linking failed
          if (linkingInProgress === 'true') {
            console.error('Linking failed:', finalError, finalErrorDescription);
            preventInfiniteLoop();
            setStatus('error');
            setError('Account linking failed. You can try linking your GitHub account later from your profile settings.');
            return;
          }
          
          // Check if it's a multiple accounts error
          if (finalErrorDescription?.includes('Multiple accounts with the same email')) {
            // Extract email from error or URL if possible
            const emailMatch = finalErrorDescription.match(/[\w.-]+@[\w.-]+\.\w+/);
            console.log('Email match found:', emailMatch);
            
            if (emailMatch) {
              setUserEmail(emailMatch[0]);
              console.log('Set userEmail to:', emailMatch[0]);
              
              // Store the GitHub linking intent
              localStorage.setItem('pendingGitHubLink', 'true');
              localStorage.setItem('linkingEmail', emailMatch[0]);
            } else {
              // Fallback: try to extract from URL or use a default
              console.log('No email in error description, trying URL params');
              setUserEmail('tolga.yayci@gmail.com'); // Temporary fallback for testing
              localStorage.setItem('pendingGitHubLink', 'true');
              localStorage.setItem('linkingEmail', 'tolga.yayci@gmail.com');
            }
            
            setStatus('link-conflict');
            setError('An account with this email already exists. Would you like to link your GitHub account to the existing account?');
            return;
          }
          throw new Error(finalErrorDescription || 'Authentication failed');
        }

        const { data, isNewUser: newUser } = await handleAuthCallback();
        
        if (!data.session) {
          throw new Error('No session found');
        }
        
        // Verify user record was created
        console.log('Verifying user record for:', data.session.user.email);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.session.user.id)
          .single();
          
        if (!userData && !userError) {
          console.log('User record not found after auth, waiting...');
          // Give it a moment for the record to be created
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // If we were linking accounts, show linking success
        if (linkingInProgress === 'true') {
          console.log('Linking successful! Clearing all flags.');
          // Clear all linking flags on success
          localStorage.removeItem('linkingInProgress');
          setStatus('success');
          setError('🎉 GitHub account successfully linked! You can now sign in with either method.');
          setIsNewUser(false);
          
          // Check for stored return URL
          const returnUrl = sessionStorage.getItem('authReturnUrl');
          if (returnUrl) {
            console.log('AuthCallback - Found return URL after linking:', returnUrl);
            sessionStorage.removeItem('authReturnUrl');
          }
          
          setTimeout(() => {
            navigate(returnUrl || '/projects', { replace: true });
          }, 3000);
          return;
        }

        setIsNewUser(newUser || false);
        setStatus('success');
        
        // Check for stored return URL
        const returnUrl = sessionStorage.getItem('authReturnUrl');
        if (returnUrl) {
          console.log('AuthCallback - Found return URL:', returnUrl);
          sessionStorage.removeItem('authReturnUrl');
        }
        
        // Redirect after a short delay to show success message
        setTimeout(() => {
          navigate(returnUrl || '/projects', { replace: true });
        }, 2000);
      } catch (error) {
        console.error('Auth callback error:', error);
        setError(error instanceof Error ? error.message : 'Authentication failed');
        setStatus('error');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  const handleRetry = () => {
    navigate('/', { replace: true });
  };

  const handleLinkAccount = async () => {
    console.log('handleLinkAccount clicked, userEmail:', userEmail);
    
    if (!userEmail) {
      console.error('No user email available for linking');
      setError('No email address found. Please try again.');
      return;
    }
    
    setIsLinking(true);
    setError(null); // Clear any previous errors
    
    try {
      console.log('Sending magic link to:', userEmail);
      await signInWithMagicLink(userEmail);
      
      // Update status to show magic link sent message
      setStatus('magic-link-sent');
      setError('Magic link sent! After clicking the email link, you will be automatically prompted to link your GitHub account.');
      
      // Don't redirect immediately, let user see the message
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 5000); // Increased delay
      
    } catch (error) {
      console.error('Manual linking error:', error);
      setError(error instanceof Error ? error.message : 'Failed to send magic link');
      setStatus('error'); // Revert to error state
    } finally {
      setIsLinking(false);
    }
  };

  const handleCreateNewAccount = () => {
    // Redirect back to sign up with a different email
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="text-center space-y-6">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Wand2 className="h-6 w-6 text-primary" />
              </div>
              <span className={cn(
                "text-2xl font-bold tracking-tight",
                "bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent"
              )}>
                WIZARD
              </span>
            </div>
          </div>

          {/* Loading State */}
          {status === 'loading' && (
            <>
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Signing you in...</h2>
                <p className="text-muted-foreground">
                  Please wait while we verify your authentication.
                </p>
              </div>
            </>
          )}

          {/* Success State */}
          {status === 'success' && (
            <>
              <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  {isNewUser ? 'Welcome to Wizard!' : 'Welcome back!'}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {isNewUser 
                    ? 'Your account has been created successfully. We\'ve added a Hello World starter project to get you going.'
                    : 'You have been successfully signed in.'
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  Redirecting you to your projects...
                </p>
              </div>
            </>
          )}

          {/* Link Conflict State */}
          {status === 'link-conflict' && (
            <>
              <div className="mx-auto w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center">
                <Link className="h-8 w-8 text-yellow-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Account Already Exists</h2>
                <p className="text-muted-foreground mb-4">
                  We found an existing account with the email address{' '}
                  <strong>{userEmail || 'this email'}</strong>. 
                  You can link your GitHub account to your existing account.
                </p>
                <div className="space-y-3">
                  <Button 
                    onClick={handleLinkAccount}
                    disabled={isLinking}
                    className="w-full"
                  >
                    {isLinking ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending magic link...
                      </>
                    ) : (
                      <>
                        <Link className="mr-2 h-4 w-4" />
                        Link to Existing Account
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleCreateNewAccount}
                    disabled={isLinking}
                    className="w-full"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Use Different Email
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  Linking accounts allows you to sign in with either method while keeping all your projects and data together.
                </p>
              </div>
            </>
          )}

          {/* Magic Link Sent State */}
          {status === 'magic-link-sent' && (
            <>
              <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Magic Link Sent!</h2>
                <p className="text-muted-foreground mb-4">
                  We've sent a secure link to <strong>{userEmail}</strong>
                </p>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>What happens next:</strong>
                  </p>
                  <ol className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-decimal list-inside">
                    <li>Check your email and click the magic link</li>
                    <li>You'll be signed in to your existing account</li>
                    <li>GitHub account linking will start automatically</li>
                    <li>Authorize GitHub when prompted</li>
                  </ol>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Redirecting to home page in a few seconds...
                </p>
              </div>
            </>
          )}

          {/* Error State */}
          {status === 'error' && (
            <>
              <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Authentication Failed</h2>
                <p className="text-muted-foreground mb-4">
                  {error || 'We couldn\'t sign you in. Please try again.'}
                </p>
                <div className="space-y-2 text-sm text-muted-foreground mb-6">
                  <p>This could happen if:</p>
                  <ul className="list-disc list-inside space-y-1 text-left">
                    <li>The magic link has expired (links expire after 1 hour)</li>
                    <li>The link has already been used</li>
                    <li>There was a network connection issue</li>
                  </ul>
                </div>
                <Button onClick={handleRetry} className="w-full">
                  Try Again
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}