import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { 
  Code2, 
  Sparkles, 
  ArrowRight, 
  AlertCircle,
  FileCode,
  Terminal,
  Braces,
  Plus,
  FileCode2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PROJECT_TEMPLATES } from '@/lib/templates';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { cn } from '@/lib/utils';
import { API_URL } from '@/lib/config';

const formSchema = z.object({
  name: z.string()
    .min(1, "Project name is required")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens are allowed"),
  description: z.string().max(200).optional(),
});

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (data: { name: string; description: string; template?: typeof PROJECT_TEMPLATES[0] }) => void;
}

export function NewProjectDialog({
  open,
  onOpenChange,
  onCreateProject,
}: NewProjectDialogProps) {
  const [activeTab, setActiveTab] = useState<'blank' | 'template'>('blank');
  const [selectedTemplate, setSelectedTemplate] = useState<typeof PROJECT_TEMPLATES[0] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setSelectedTemplate(null);
      setActiveTab('blank');
      setError(null);
      setIsSubmitting(false);
    }
  }, [open, form]);

  // Auto-fill form when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      form.setValue('name', selectedTemplate.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
      form.setValue('description', selectedTemplate.description);
    }
  }, [selectedTemplate, form]);

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    setError(null);
    setIsSubmitting(true);

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

    // Don't allow creating project from OpenZeppelin templates
    if (selectedTemplate?.isOpenZeppelin) {
      toast({
        title: "Coming Soon",
        description: "OpenZeppelin templates will be available soon!",
      });
      setIsSubmitting(false);
      return;
    }

    onCreateProject({
      name: data.name.trim(),
      description: data.description?.trim() || '',
      template: selectedTemplate,
    });
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                Start with a blank project or use a template
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'blank' | 'template')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="blank" className="gap-2">
              <FileCode className="h-4 w-4" />
              Blank Project
            </TabsTrigger>
            <TabsTrigger value="template" className="gap-2">
              <Braces className="h-4 w-4" />
              Use Template
            </TabsTrigger>
          </TabsList>

          <TabsContent value="blank" className="mt-4">
            <div className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                            Only lowercase letters, numbers, and hyphens
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
                          <FormLabel className="text-sm">Description (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="A brief description"
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

                  {/* Error display */}
                  {error && (
                    <div className="flex items-center gap-2 p-3 border rounded-lg bg-red-500/5 border-red-500/20">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
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
                      className="gap-2"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Create Project
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </TabsContent>

          <TabsContent value="template" className="mt-4">
            <div className="space-y-4">
              {/* Template Selection */}
              <div className="border rounded-lg overflow-hidden">
                <ScrollArea className="h-[280px]">
                  <div className="divide-y">
                    {PROJECT_TEMPLATES.map((template, index) => (
                      <div
                        key={index}
                        onClick={() => !template.isOpenZeppelin && setSelectedTemplate(template)}
                        className={cn(
                          "p-3 flex items-center gap-3 transition-colors",
                          !template.isOpenZeppelin && "cursor-pointer hover:bg-accent",
                          selectedTemplate?.name === template.name && "bg-accent",
                          template.isOpenZeppelin && "opacity-75"
                        )}
                      >
                        <div className="flex-none p-2 rounded-lg bg-primary/10">
                          <template.icon className="h-4 w-4 text-primary" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm">{template.name}</h3>
                            {template.isOpenZeppelin && (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                                  OpenZeppelin
                                </Badge>
                                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
                                  Coming Soon
                                </Badge>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {template.description}
                          </p>
                        </div>

                        <ArrowRight className={cn(
                          "flex-none h-3.5 w-3.5 text-muted-foreground transition-opacity",
                          selectedTemplate?.name === template.name ? "opacity-100" : "opacity-0",
                          template.isOpenZeppelin && "opacity-0"
                        )} />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Project Details */}
              {selectedTemplate && (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Project Name</FormLabel>
                            <FormControl>
                              <Input 
                                {...field}
                                className="font-mono h-9"
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Description (Optional)</FormLabel>
                            <FormControl>
                              <Input 
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

                    {/* Error display */}
                    {error && (
                      <div className="flex items-center gap-2 p-3 border rounded-lg bg-red-500/5 border-red-500/20">
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
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
                        className="gap-2"
                        disabled={selectedTemplate.isOpenZeppelin || isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Create from Template
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}

              {/* Template Selection Prompt */}
              {!selectedTemplate && (
                <div className="flex items-center gap-2 p-4 text-sm bg-muted/50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Select a template to continue</span>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}