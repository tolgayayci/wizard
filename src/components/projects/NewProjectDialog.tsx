import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { 
  AlertCircle,
  FileCode2,
  Plus,
  Loader2,
  Sparkles,
  Code2,
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
import { Template } from '@/lib/templates';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { API_URL } from '@/lib/config';
import { listTemplates } from '@/lib/api';

const createFormSchema = (projectType: 'blank' | 'template') => z.object({
  name: z.string()
    .min(1, "Project name is required")
    .max(50)
    .refine((val) => {
      // For blank projects, enforce strict naming rules
      if (projectType === 'blank') {
        return /^[a-z0-9-]+$/.test(val);
      }
      // For template projects, allow any non-empty string
      return val.trim().length > 0;
    }, (val) => ({
      message: projectType === 'blank' 
        ? "Only lowercase letters, numbers, and hyphens are allowed"
        : "Project name cannot be empty"
    })),
  description: z.string().max(200).optional(),
});

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (data: { name: string; description: string; template?: Template }) => Promise<void>;
}

export function NewProjectDialog({
  open,
  onOpenChange,
  onCreateProject,
}: NewProjectDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Creating...');
  const [projectType, setProjectType] = useState<'blank' | 'template'>('blank');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const { toast } = useToast();

  const formSchema = createFormSchema(projectType);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Fetch templates when dialog opens
  useEffect(() => {
    if (open) {
      const fetchTemplates = async () => {
        try {
          setTemplatesLoading(true);
          const fetchedTemplates = await listTemplates();
          setTemplates(fetchedTemplates);
        } catch (error) {
          console.error('Failed to fetch templates:', error);
        } finally {
          setTemplatesLoading(false);
        }
      };
      fetchTemplates();
    }
  }, [open]);

  // Generate clean project names from template IDs
  const getProjectName = (template: Template): string => {
    switch (template.id) {
      case 'hello-world':
        return 'Hello World';
      case 'erc20-openzeppelin':
        return 'ERC-20';
      case 'erc721-openzeppelin':
        return 'ERC-721';
      case 'erc1155-openzeppelin':
        return 'ERC-1155';
      case 'ownable-openzeppelin':
        return 'Ownable';
      case 'access-control-openzeppelin':
        return 'Access Control';
      case 'merkle-proofs-openzeppelin':
        return 'Merkle Tree';
      default:
        return template.id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Auto-populate name and description when template changes
  useEffect(() => {
    if (projectType === 'template' && selectedTemplate) {
      form.setValue('name', getProjectName(selectedTemplate));
      form.setValue('description', selectedTemplate.description);
    } else if (projectType === 'blank') {
      form.setValue('name', '');
      form.setValue('description', '');
    }
  }, [projectType, selectedTemplate, form]);

  // Reset form when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      form.reset();
      setError(null);
      setProjectType('blank');
      setSelectedTemplate(null);
    } else {
      form.reset();
      setError(null);
      setIsSubmitting(false);
      setProjectType('blank');
      setSelectedTemplate(null);
    }
    onOpenChange(open);
  };

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    setError(null);
    setIsSubmitting(true);
    setLoadingMessage('Checking server...');

    // Check backend connection first
    try {
      const healthCheck = await fetch(`${API_URL}/health`, { 
        method: 'GET'
      }).catch(() => null);
      
      if (!healthCheck || !healthCheck.ok) {
        setError('Unable to connect to the server. We apologize for the inconvenience. Please try again in a few moments.');
        setIsSubmitting(false);
        return;
      }
    } catch (error) {
      setError('Unable to connect to the server. We apologize for the inconvenience. Please try again in a few moments.');
      setIsSubmitting(false);
      return;
    }

    try {
      setLoadingMessage(projectType === 'template' ? 'Creating project from template...' : 'Creating blank project...');
      
      await onCreateProject({
        name: data.name.trim(),
        description: data.description?.trim() || '',
        template: projectType === 'template' ? selectedTemplate || undefined : undefined,
      });
      
      setLoadingMessage('Almost ready...');
      
      // Success - dialog will be closed by parent
      onOpenChange(false);
    } catch (error) {
      // Error is handled by parent component
      console.error('Project creation failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">Create New Project</DialogTitle>
                <DialogDescription className="text-sm">
                  Start with a blank project or use a template
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          <Tabs value={projectType} onValueChange={(value) => setProjectType(value as 'blank' | 'template')} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 flex-none">
              <TabsTrigger value="blank" className="flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Blank Project
              </TabsTrigger>
              <TabsTrigger value="template" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                From Template
              </TabsTrigger>
            </TabsList>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col space-y-4">
                <TabsContent value="blank" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Project Name</FormLabel>
                          <FormControl>
                        <Input 
                          placeholder="my-awesome-project" 
                          {...field}
                          className="font-mono h-9"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {projectType === 'blank' 
                          ? 'Lowercase letters, numbers, and hyphens only'
                          : 'You can edit the template name if needed'
                        }
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        Description <span className="text-muted-foreground">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="What does this project do?" 
                          {...field}
                          className="h-9"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  </div>

                  {/* Empty State Display */}
                  <div className="bg-card border border-dashed rounded-lg p-6 text-center space-y-3">
                    <div className="p-3 rounded-full bg-muted/50 w-12 h-12 flex items-center justify-center mx-auto">
                      <FileCode2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm mb-1">Empty Stylus Project</h3>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                        Start with a clean slate and build your smart contract from scratch. Perfect for experienced developers.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="template" className="space-y-4 mt-4">
                  {templatesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading templates...</span>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 flex-none">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">Project Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="my-awesome-project" 
                                  {...field}
                                  className="font-mono h-9"
                                  disabled={isSubmitting}
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                {projectType === 'blank' 
                                  ? 'Lowercase letters, numbers, and hyphens only'
                                  : 'You can edit the template name if needed'
                                }
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">
                                Description <span className="text-muted-foreground">(optional)</span>
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="What does this project do?" 
                                  {...field}
                                  className="h-9"
                                  disabled={isSubmitting}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Choose a Template</Label>
                        <div className="h-48 overflow-y-auto border rounded-md bg-muted/10">
                          <div className="space-y-2 p-2">
                            {templates.map((template) => (
                              <div
                                key={template.id}
                                className={`group relative rounded-md p-3 cursor-pointer transition-colors border ${
                                  selectedTemplate?.id === template.id 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-border/50 bg-muted/20 hover:bg-muted/40'
                                }`}
                                onClick={() => setSelectedTemplate(template)}
                              >
                                {/* Selection indicator */}
                                {selectedTemplate?.id === template.id && (
                                  <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full"></div>
                                  </div>
                                )}
                                
                                <div className="flex items-start gap-3 pr-6">
                                  <div className="p-1.5 rounded bg-muted/50 flex-shrink-0">
                                    <Code2 className="h-3 w-3 text-foreground" />
                                  </div>
                                  
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-medium text-foreground text-sm truncate">
                                        {template.name}
                                      </h4>
                                      {template.difficulty && (
                                        <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded border ${
                                          template.difficulty === 'Beginner' 
                                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800' 
                                            : template.difficulty === 'Intermediate'
                                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                            : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800'
                                        }`}>
                                          {template.difficulty}
                                        </span>
                                      )}
                                      {template.category && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded border bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-800">
                                          {template.category}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                      {template.description}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

              {/* Error Display */}
              {error && (
                <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex-none">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-none" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-destructive">Failed to create project</p>
                    <p className="text-xs text-destructive/80">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 flex-none">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={
                    isSubmitting || 
                    !form.watch('name') || 
                    (projectType === 'template' && !selectedTemplate)
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {loadingMessage}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      {projectType === 'template' ? 'Create from Template' : 'Create Project'}
                    </>
                  )}
                </Button>
              </div>
              </form>
            </Form>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}