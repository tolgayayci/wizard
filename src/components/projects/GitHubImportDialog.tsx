import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Github,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  Download,
  FileCode,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import {
  validateGitHubUrl,
  parseGitHubUrl,
  checkGitHubRepository,
  validateStylusProject,
  importGitHubRepository,
  suggestProjectName,
} from '@/lib/github';
import { cn } from '@/lib/utils';
import { API_URL } from '@/lib/config';

const formSchema = z.object({
  repoUrl: z.string()
    .min(1, "Repository URL is required")
    .refine((url) => validateGitHubUrl(url), {
      message: "Please enter a valid GitHub repository URL",
    }),
  projectName: z.string()
    .min(1, "Project name is required")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens are allowed"),
  projectDescription: z.string().max(200).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface GitHubImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (projectId: string) => void;
  userId: string;
}

type ImportState = 'initial' | 'validating' | 'validated' | 'importing' | 'success' | 'error';

export function GitHubImportDialog({
  open,
  onClose,
  onSuccess,
  userId,
}: GitHubImportDialogProps) {
  const [importState, setImportState] = useState<ImportState>('initial');
  const [repoInfo, setRepoInfo] = useState<{
    owner: string;
    repo: string;
    name: string;
    description?: string;
    url: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filesImported, setFilesImported] = useState<number>(0);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      repoUrl: '',
      projectName: '',
      projectDescription: '',
    },
  });

  const handleUrlChange = async (url: string) => {
    setError(null);
    setRepoInfo(null);
    form.setValue('projectName', '');
    form.setValue('projectDescription', '');

    if (!url.trim()) {
      setImportState('initial');
      return;
    }

    if (!validateGitHubUrl(url)) {
      setImportState('initial');
      return;
    }

    setImportState('validating');

    try {
      const parsedRepo = parseGitHubUrl(url);
      if (!parsedRepo) {
        throw new Error('Invalid GitHub URL format');
      }

      const repoCheck = await checkGitHubRepository(parsedRepo.owner, parsedRepo.repo);

      if (!repoCheck.exists) {
        throw new Error('Repository not found. Please check the URL.');
      }

      if (!repoCheck.isPublic) {
        throw new Error('Repository is private. Only public repositories can be imported.');
      }

      // Validate if it's a Stylus project
      const stylusCheck = await validateStylusProject(parsedRepo.owner, parsedRepo.repo);
      
      if (!stylusCheck.isValid) {
        throw new Error(stylusCheck.reason || 'Not a valid Stylus project');
      }

      const repoData = {
        ...parsedRepo,
        name: repoCheck.name,
        description: repoCheck.description,
      };

      setRepoInfo(repoData);
      
      // Auto-fill project details
      const suggestedName = suggestProjectName(repoData.name);
      form.setValue('projectName', suggestedName);
      form.setValue('projectDescription', repoData.description || `Imported from ${parsedRepo.owner}/${parsedRepo.repo}`);

      setImportState('validated');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to validate repository');
      setImportState('error');
    }
  };

  const handleImport = async (data: FormData) => {
    if (!repoInfo) return;

    setError(null);

    // Check backend connection first
    try {
      const healthCheck = await fetch(`${API_URL}/health`, { 
        method: 'GET'
      }).catch(() => null);
      
      if (!healthCheck || !healthCheck.ok) {
        setError('Unable to connect to the server. We apologize for the inconvenience. Please try again in a few moments.');
        return;
      }
    } catch (error) {
      setError('Unable to connect to the server. We apologize for the inconvenience. Please try again in a few moments.');
      return;
    }

    setImportState('importing');

    try {
      const result = await importGitHubRepository(
        data.repoUrl,
        data.projectName,
        data.projectDescription || '',
        userId
      );

      setFilesImported(result.filesCount);
      setImportState('success');

      toast({
        title: "Repository imported successfully!",
        description: `${result.filesCount} files imported from ${repoInfo.owner}/${repoInfo.repo}`,
      });

      // Small delay to show success state
      setTimeout(() => {
        onSuccess(result.projectId);
        handleClose();
      }, 500);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import repository');
      setImportState('error');
    }
  };

  const handleClose = () => {
    setImportState('initial');
    setRepoInfo(null);
    setError(null);
    setFilesImported(0);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Prevent closing while importing
      if (importState === 'importing') return;
      if (!newOpen) handleClose();
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Import from GitHub
          </DialogTitle>
          <DialogDescription>
            Import a public GitHub repository to create a new Stylus project
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleImport)} className="space-y-4">
            <FormField
              control={form.control}
              name="repoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repository URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://github.com/username/repository"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleUrlChange(e.target.value);
                      }}
                      disabled={importState === 'importing'}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the URL of a public GitHub repository containing a Stylus project
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Repository validation status */}
            {importState === 'validating' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Validating repository...
              </div>
            )}

            {/* Repository info */}
            {repoInfo && importState === 'validated' && (
              <div className="p-3 border rounded-lg bg-green-500/5 border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Valid Stylus project found
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{repoInfo.owner}/{repoInfo.name}</div>
                    {repoInfo.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {repoInfo.description}
                      </div>
                    )}
                  </div>
                  <a
                    href={repoInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Project details */}
            {(importState === 'validated' || importState === 'importing') && (
              <>
                <FormField
                  control={form.control}
                  name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="my-stylus-project"
                          {...field}
                          disabled={importState === 'importing'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="A brief description of your project"
                          {...field}
                          disabled={importState === 'importing'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Import progress */}
            {importState === 'importing' && (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-blue-500/5 border-blue-500/20">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Importing repository...</div>
                  <div className="text-xs text-muted-foreground">This may take a few moments</div>
                </div>
              </div>
            )}

            {/* Success state */}
            {importState === 'success' && (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-green-500/5 border-green-500/20">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-sm font-medium text-green-700 dark:text-green-400">
                    Import completed successfully!
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {filesImported} files imported
                  </div>
                </div>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-red-500/5 border-red-500/20">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={importState === 'importing'}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  importState !== 'validated' || 
                  importState === 'importing' || 
                  !form.formState.isValid
                }
                className="gap-2"
              >
                {importState === 'importing' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Import Repository
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}