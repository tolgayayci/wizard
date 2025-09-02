import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Loader2,
  AlertCircle,
  CheckCircle,
  Github,
  ArrowRight,
  ArrowLeft,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { signInWithMagicLink, signInWithGitHub } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface AuthModalProps {
  children?: React.ReactNode;
}

export function AuthModal({ children }: AuthModalProps) {
  const [isLoadingMagicLink, setIsLoadingMagicLink] = useState(false);
  const [isLoadingGitHub, setIsLoadingGitHub] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [showEmailFlow, setShowEmailFlow] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Handle cooldown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldownTime > 0) {
      interval = setInterval(() => {
        setCooldownTime((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldownTime]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset state when modal closes
      setError(null);
      setMagicLinkSent(false);
      setEmail('');
      setCooldownTime(0);
      setShowEmailFlow(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (cooldownTime > 0) {
      setError(`Please wait ${cooldownTime} seconds before requesting another link`);
      return;
    }

    setError(null);
    setIsLoadingMagicLink(true);

    try {
      await signInWithMagicLink(email.trim().toLowerCase());
      setMagicLinkSent(true);
      setCooldownTime(60); // 60 second cooldown
      
      toast({
        title: "Magic link sent!",
        description: "Check your email and click the link to sign in.",
      });
    } catch (error) {
      console.error('Magic link error:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to send magic link. Please try again.');
      }
    } finally {
      setIsLoadingMagicLink(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setError(null);
    setIsLoadingGitHub(true);

    try {
      await signInWithGitHub();
      // The redirect will happen automatically
    } catch (error) {
      console.error('GitHub sign in error:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to sign in with GitHub. Please try again.');
      }
      setIsLoadingGitHub(false);
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[480px] p-0 bg-white dark:bg-gray-900">
        <DialogHeader className="sr-only">
          <DialogTitle>Sign in to Wizard</DialogTitle>
        </DialogHeader>

        <div className="px-8 pt-10 pb-6">
          {/* Main content based on state */}
          {!showEmailFlow && !magicLinkSent ? (
            // Initial state - show both options
            <div>
              <div className="text-center space-y-2 mb-6">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Wand2 className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    Welcome to Wizard
                  </h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Build and deploy smart contracts in seconds
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2 mb-4">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={handleGitHubSignIn}
                  disabled={isLoadingGitHub}
                  className="w-full h-12 bg-black hover:bg-gray-900 text-white font-medium"
                >
                  {isLoadingGitHub ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Github className="mr-2 h-5 w-5" />
                      Continue with GitHub
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">OR</span>
                  </div>
                </div>

                <Button
                  onClick={() => setShowEmailFlow(true)}
                  variant="outline"
                  className="w-full h-12 border-gray-300 hover:bg-gray-50 font-medium"
                >
                  <Mail className="mr-2 h-5 w-5" />
                  Continue with Email
                </Button>
              </div>
            </div>
          ) : showEmailFlow && !magicLinkSent ? (
            // Email flow
            <div className="space-y-6">
              <button
                onClick={() => {
                  setShowEmailFlow(false);
                  setError(null);
                }}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Back</span>
              </button>

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  Enter your email
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  We'll send you a secure link to sign in
                </p>
              </div>

              <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    className="h-12 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                    autoFocus
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button 
                  type="submit"
                  className="w-full h-12 bg-black hover:bg-gray-900 text-white font-medium"
                  disabled={isLoadingMagicLink || cooldownTime > 0}
                >
                  {isLoadingMagicLink ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending link...
                    </>
                  ) : cooldownTime > 0 ? (
                    `Wait ${cooldownTime}s`
                  ) : (
                    <>
                      Send Magic Link
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          ) : (
            // Success state
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    Check your email
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    We've sent a secure link to
                  </p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{email}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 pt-2">
                    Click the link in your email to sign in. The link expires in 1 hour.
                  </p>
                </div>
                
                <div className="space-y-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMagicLinkSent(false);
                      setShowEmailFlow(false);
                      setEmail('');
                    }}
                    className="w-full h-12 border-gray-300 hover:bg-gray-50"
                  >
                    Try different email
                  </Button>

                  {cooldownTime === 0 && (
                    <button
                      onClick={handleMagicLinkSubmit}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                      disabled={isLoadingMagicLink}
                    >
                      Didn't receive it? Resend
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            By continuing, you agree to our{' '}
            <a href="#" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 underline-offset-4 hover:underline">
              Terms
            </a>{' '}
            and{' '}
            <a href="#" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 underline-offset-4 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}