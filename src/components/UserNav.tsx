import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Link,
  Github,
  Mail,
  Bug,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut, linkIdentity } from '@/lib/auth';
import { User } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';
import { ProfileDialog } from '@/components/ProfileDialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export function UserNav() {
  const [user, setUser] = useState<User | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const fetchLinkedAccounts = async () => {
    if (!user) return;
    
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.identities) {
        setLinkedAccounts(authUser.identities);
      }
    } catch (error) {
      console.error('Error fetching linked accounts:', error);
    }
  };

  const handleAccountDialogOpen = () => {
    setShowAccountDialog(true);
    fetchLinkedAccounts();
  };

  const handleLinkGitHub = async () => {
    try {
      setIsLoading(true);
      await linkIdentity('github');
      toast({
        title: "GitHub account linked!",
        description: "Your GitHub account has been successfully linked.",
      });
      // Refresh linked accounts
      fetchLinkedAccounts();
    } catch (error) {
      console.error('GitHub linking error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to link GitHub account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportIssue = () => {
    window.open('https://github.com/tolgayayci/wizard/issues/new?labels=bug&template=bug_report.md', '_blank');
  };

  if (!user) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="h-8 w-8 rounded-full"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} alt={user.email} />
              <AvatarFallback>{user.email.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name || user.email}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setShowProfileDialog(true)}>
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAccountDialogOpen}>
              <Link className="mr-2 h-4 w-4" />
              Linked Accounts
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleReportIssue}>
              <Bug className="mr-2 h-4 w-4" />
              Report Issue
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        user={user}
        onUserUpdate={setUser}
      />

      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Linked Accounts
            </DialogTitle>
            <DialogDescription>
              Manage the accounts you use to sign in to Wizard.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {linkedAccounts.length > 0 ? (
              <div className="space-y-3">
                {linkedAccounts.map((identity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {identity.provider === 'github' ? (
                        <Github className="h-5 w-5" />
                      ) : identity.provider === 'email' ? (
                        <Mail className="h-5 w-5" />
                      ) : (
                        <ShieldCheck className="h-5 w-5" />
                      )}
                      <div>
                        <div className="font-medium capitalize">
                          {identity.provider === 'email' ? 'Magic Link' : identity.provider}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {identity.identity_data?.email || user?.email}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">
                      Connected
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-muted-foreground mb-2">No linked accounts found</div>
                <div className="text-sm text-muted-foreground">
                  Your account information is being loaded...
                </div>
              </div>
            )}

            {/* Available accounts to link */}
            {linkedAccounts.length > 0 && !linkedAccounts.some(acc => acc.provider === 'github') && (
              <div className="pt-4 border-t">
                <div className="text-sm font-medium mb-3">Available to Link</div>
                <div className="p-3 border rounded-lg border-dashed">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Github className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">GitHub</div>
                        <div className="text-sm text-muted-foreground">
                          Link your GitHub account for easy access
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleLinkGitHub}
                      disabled={isLoading}
                      className="ml-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                          Linking...
                        </>
                      ) : (
                        <>
                          <Link className="w-3 h-3 mr-2" />
                          Link
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                <div className="font-medium mb-2">About Account Linking</div>
                <ul className="space-y-1 text-xs">
                  <li>• You can sign in using any of your linked accounts</li>
                  <li>• All linked accounts share the same projects and data</li>
                  <li>• Magic link authentication is passwordless and secure</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAccountDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}