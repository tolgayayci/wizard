import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Loader2,
  Wand2,
  AlertCircle,
  CheckCircle,
  Github,
  ArrowRight,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
      <DialogContent className="sm:max-w-[420px] p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Sign in to Wizard</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="flex items-center justify-center py-6 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wand2 className="h-5 w-5 text-primary" />
            </div>
            <span className={cn(
              "text-xl font-bold tracking-tight",
              "bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent"
            )}>
              WIZARD
            </span>
          </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="magic-link" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="magic-link" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Magic Link
              </TabsTrigger>
              <TabsTrigger value="github" className="flex items-center gap-2">
                <Github className="h-4 w-4" />
                GitHub
              </TabsTrigger>
            </TabsList>

            {/* Magic Link Tab */}
            <TabsContent value="magic-link" className="space-y-4">
              {!magicLinkSent ? (
                <>
                  <div className="text-center space-y-2 mb-6">
                    <h3 className="font-semibold">Sign in with Magic Link</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter your email and we'll send you a secure link to sign in
                    </p>
                  </div>

                  <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Email address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setError(null);
                          }}
                          className="pl-9 h-11"
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <Button 
                      type="submit"
                      className="w-full h-11"
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
                </>
              ) : (
                <div className="text-center space-y-4">
                  <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Check your email</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      We've sent a secure link to <strong>{email}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click the link in your email to sign in. The link will expire in 1 hour.
                    </p>
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMagicLinkSent(false);
                      setEmail('');
                    }}
                    className="w-full"
                  >
                    Try different email
                  </Button>

                  {cooldownTime === 0 && (
                    <Button
                      variant="ghost"
                      onClick={handleMagicLinkSubmit}
                      className="w-full"
                      disabled={isLoadingMagicLink}
                    >
                      Resend magic link
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            {/* GitHub Tab */}
            <TabsContent value="github" className="space-y-4">
              <div className="text-center space-y-4">
                <div className="space-y-2 mb-6">
                  <h3 className="font-semibold">Sign in with GitHub</h3>
                  <p className="text-sm text-muted-foreground">
                    Continue with your GitHub account for seamless integration
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  onClick={handleGitHubSignIn}
                  disabled={isLoadingGitHub}
                  className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white"
                  variant="default"
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

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Access your repositories and project data</p>
                  <p>• Sync with your GitHub profile</p>
                  <p>• Collaborate directly from your projects</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="px-6 py-4 border-t bg-muted/40">
          <p className="text-xs text-muted-foreground text-center">
            By continuing, you agree to our{' '}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}