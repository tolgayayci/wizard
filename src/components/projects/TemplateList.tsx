import { useState } from 'react';
import { PROJECT_TEMPLATES } from '@/lib/templates';
import { TemplateListRow } from './TemplateListRow';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Sparkles, Code2 } from 'lucide-react';
import { SortOption } from './ProjectTabs';
import { useToast } from '@/hooks/use-toast';

interface TemplateListProps {
  searchQuery: string;
  onUseTemplate: (template: typeof PROJECT_TEMPLATES[0]) => void;
  isLoading?: boolean;
  sortBy?: SortOption['value'];
}

export function TemplateList({ 
  searchQuery, 
  onUseTemplate, 
  isLoading,
  sortBy = 'name_asc'
}: TemplateListProps) {
  const [creatingTemplate, setCreatingTemplate] = useState<string | null>(null);
  const { toast } = useToast();

  const handleUseTemplate = async (template: typeof PROJECT_TEMPLATES[0]) => {
    // Prevent multiple clicks on same template
    if (creatingTemplate === template.name) return;

    // Ensure template code exists
    if (!template.code) {
      toast({
        title: "Error",
        description: "Template code is missing",
        variant: "destructive",
      });
      return;
    }

    // Set loading state for this specific template
    setCreatingTemplate(template.name);

    try {
      // Create project with template name and data
      const projectData = {
        name: template.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
        description: template.description,
        template: template,
      };

      await onUseTemplate(projectData);
    } finally {
      // Clear loading state regardless of success/failure
      setCreatingTemplate(null);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  let filteredTemplates = PROJECT_TEMPLATES.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Apply sorting
  filteredTemplates = [...filteredTemplates].sort((a, b) => {
    switch (sortBy) {
      case 'name_asc':
        return a.name.localeCompare(b.name);
      case 'name_desc':
        return b.name.localeCompare(a.name);
      default:
        return 0;
    }
  });

  if (filteredTemplates.length === 0) {
    return (
      <div className="min-h-[calc(100vh-16rem)] rounded-lg border bg-card flex items-center justify-center p-8">
        <div className="text-center max-w-sm mx-auto">
          <div className="relative mx-auto w-24 h-24">
            {/* Background glow effect */}
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            
            {/* Icon container */}
            <div className="relative bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
          </div>
          
          <h3 className="text-2xl font-semibold mt-6">
            No Templates Found
          </h3>
          
          <p className="text-muted-foreground mt-2">
            Try adjusting your search terms or clear the filter to see all available templates
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-11 px-6 text-left text-xs font-medium text-muted-foreground w-[30%]">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  Template
                </div>
              </th>
              <th className="h-11 px-6 text-left text-xs font-medium text-muted-foreground w-[50%]">
                Description
              </th>
              <th className="h-11 px-6 text-right text-xs font-medium text-muted-foreground w-[20%]">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredTemplates.map((template, index) => (
              <TemplateListRow
                key={index}
                template={template}
                onUseTemplate={handleUseTemplate}
                isCreating={creatingTemplate === template.name}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}