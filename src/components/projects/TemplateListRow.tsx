import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROJECT_TEMPLATES } from '@/lib/templates';

interface TemplateListRowProps {
  template: typeof PROJECT_TEMPLATES[0];
  onUseTemplate: (template: typeof PROJECT_TEMPLATES[0]) => void;
  isCreating?: boolean;
}

export function TemplateListRow({ template, onUseTemplate, isCreating = false }: TemplateListRowProps) {
  // Category colors (subtle, GitHub-like)
  const getCategoryColor = (cat?: string) => {
    switch (cat?.toLowerCase()) {
      case 'defi':
        return 'text-green-700 bg-green-100 border-green-200 dark:text-green-300 dark:bg-green-900/30 dark:border-green-800';
      case 'nft':
        return 'text-purple-700 bg-purple-100 border-purple-200 dark:text-purple-300 dark:bg-purple-900/30 dark:border-purple-800';
      case 'governance':
        return 'text-blue-700 bg-blue-100 border-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-800';
      case 'utility':
        return 'text-orange-700 bg-orange-100 border-orange-200 dark:text-orange-300 dark:bg-orange-900/30 dark:border-orange-800';
      case 'beginner':
        return 'text-gray-700 bg-gray-100 border-gray-200 dark:text-gray-300 dark:bg-gray-900/30 dark:border-gray-800';
      default:
        return 'text-primary bg-primary/10 border-primary/20';
    }
  };

  // Difficulty colors (GitHub-like labels)
  const getDifficultyColor = (diff?: string) => {
    switch (diff) {
      case 'Beginner':
        return 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30';
      case 'Intermediate':
        return 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30';
      case 'Advanced':
        return 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30';
      default:
        return 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800';
    }
  };

  const Icon = template.icon;

  return (
    <tr className="group hover:bg-muted/30 border-b border-border transition-colors">
      {/* Icon & Name */}
      <td className="py-4 px-6 w-[30%]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-muted/50">
            <Icon className="h-4 w-4 text-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
              {template.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {template.category && (
                <Badge 
                  variant="outline" 
                  className={cn("text-xs px-2 py-0.5 border", getCategoryColor(template.category))}
                >
                  {template.category}
                </Badge>
              )}
              {template.difficulty && (
                <Badge 
                  variant="outline" 
                  className={cn("text-xs px-2 py-0.5 border-0", getDifficultyColor(template.difficulty))}
                >
                  {template.difficulty}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Description */}
      <td className="py-4 px-6 w-[50%]">
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {template.description}
        </p>
      </td>

      {/* Action */}
      <td className="py-4 px-6 w-[20%]">
        <div className="flex justify-end">
          <Button 
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => onUseTemplate(template)}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              "Use Template"
            )}
          </Button>
        </div>
      </td>
    </tr>
  );
}