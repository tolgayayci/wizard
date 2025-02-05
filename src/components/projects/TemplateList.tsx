import { useState } from 'react';
import { PROJECT_TEMPLATES } from '@/lib/templates';
import { ProjectCard } from './ProjectCard';
import { TemplateDialog } from './TemplateDialog';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ArrowUpRight, Sparkles } from 'lucide-react';
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
  const [selectedTemplate, setSelectedTemplate] = useState<typeof PROJECT_TEMPLATES[0] | null>(null);
  const { toast } = useToast();

  const handleUseTemplate = (template: typeof PROJECT_TEMPLATES[0]) => {
    // Don't allow using OpenZeppelin templates yet
    if (template.isOpenZeppelin) {
      toast({
        title: "Coming Soon",
        description: "OpenZeppelin templates will be available soon!",
      });
      return;
    }

    // Ensure template code exists
    if (!template.code) {
      toast({
        title: "Error",
        description: "Template code is missing",
        variant: "destructive",
      });
      return;
    }

    onUseTemplate({
      name: template.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      description: template.description,
      template: template,
    });
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template, index) => (
          <ProjectCard
            key={index}
            name={template.name}
            description={template.description}
            icon={template.icon}
            actionLabel={template.isOpenZeppelin ? "Coming Soon" : "Use Template"}
            actionIcon={ArrowUpRight}
            onAction={() => template.isOpenZeppelin ? null : setSelectedTemplate(template)}
            features={template.features}
            isOpenZeppelin={template.isOpenZeppelin}
            variant="template"
          />
        ))}
      </div>

      <TemplateDialog
        open={selectedTemplate !== null}
        onOpenChange={(open) => !open && setSelectedTemplate(null)}
        template={selectedTemplate}
        onUseTemplate={() => {
          if (selectedTemplate) {
            handleUseTemplate(selectedTemplate);
            setSelectedTemplate(null);
          }
        }}
      />
    </div>
  );
}