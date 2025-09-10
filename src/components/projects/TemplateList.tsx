import { useState, useEffect } from 'react';
import { Template, listTemplates, initializeProjectFromTemplate } from '@/lib/api';
import { TemplateListRow } from './TemplateListRow';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Sparkles, Code2 } from 'lucide-react';
import { SortOption } from './ProjectTabs';
import { useToast } from '@/hooks/use-toast';

interface TemplateListProps {
  searchQuery: string;
  onUseTemplate: (data: { name: string; description: string; template: Template }) => void;
  isLoading?: boolean;
  sortBy?: SortOption['value'];
}

export function TemplateList({ 
  searchQuery, 
  onUseTemplate, 
  isLoading,
  sortBy = 'name_asc'
}: TemplateListProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [creatingTemplate, setCreatingTemplate] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setTemplatesLoading(true);
        const fetchedTemplates = await listTemplates();
        setTemplates(fetchedTemplates);
      } catch (error) {
        console.error('Failed to fetch templates:', error);
        toast({
          title: "Error",
          description: "Failed to load templates",
          variant: "destructive",
        });
      } finally {
        setTemplatesLoading(false);
      }
    };

    fetchTemplates();
  }, [toast]);

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

  const handleUseTemplate = async (template: Template) => {
    // Prevent multiple clicks on same template
    if (creatingTemplate === template.id) return;

    // Set loading state for this specific template
    setCreatingTemplate(template.id);

    try {
      // Create project with template data
      const projectData = {
        name: getProjectName(template),
        description: template.description,
        template: template,
      };

      await onUseTemplate(projectData);
    } finally {
      // Clear loading state regardless of success/failure
      setCreatingTemplate(null);
    }
  };

  if (isLoading || templatesLoading) {
    return <LoadingSkeleton />;
  }

  let filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Templates are already sorted by backend in desired order
  // Only apply additional sorting if explicitly requested
  if (sortBy === 'name_desc') {
    filteredTemplates = [...filteredTemplates].sort((a, b) => b.name.localeCompare(a.name));
  } else if (sortBy === 'name_asc') {
    filteredTemplates = [...filteredTemplates].sort((a, b) => a.name.localeCompare(b.name));
  }
  // For default sorting, keep backend order

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
            {filteredTemplates.map((template) => (
              <TemplateListRow
                key={template.id}
                template={template}
                onUseTemplate={handleUseTemplate}
                isCreating={creatingTemplate === template.id}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}