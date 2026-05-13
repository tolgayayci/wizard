import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Loader2, ExternalLink, Github } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Template, getTemplateIcon } from '@/lib/templates';
import { useState, useRef, useEffect } from 'react';

interface TemplateListRowProps {
  template: Template;
  onUseTemplate: (template: Template) => void;
  isCreating?: boolean;
}

export function TemplateListRow({ template, onUseTemplate, isCreating = false }: TemplateListRowProps) {
  const [isTextTruncated, setIsTextTruncated] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const checkTruncation = () => {
      if (descriptionRef.current) {
        const element = descriptionRef.current;
        setIsTextTruncated(element.scrollHeight > element.clientHeight);
      }
    };

    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [template.description]);
  // Category colors with improved palette
  const getCategoryColor = (cat?: string) => {
    switch (cat?.toLowerCase()) {
      case 'token':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800';
      case 'nft':
        return 'text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-300 dark:bg-violet-950/40 dark:border-violet-800';
      case 'security':
        return 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800';
      case 'cryptography':
        return 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-800';
      case 'tutorial':
        return 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-800';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-300 dark:bg-slate-950/40 dark:border-slate-800';
    }
  };

  // Difficulty colors with better contrast
  const getDifficultyColor = (diff?: string) => {
    switch (diff) {
      case 'Beginner':
        return 'text-green-800 bg-green-100 border-green-300 dark:text-green-200 dark:bg-green-950/60 dark:border-green-700';
      case 'Intermediate':
        return 'text-amber-800 bg-amber-100 border-amber-300 dark:text-amber-200 dark:bg-amber-950/60 dark:border-amber-700';
      case 'Advanced':
        return 'text-orange-800 bg-orange-100 border-orange-300 dark:text-orange-200 dark:bg-orange-950/60 dark:border-orange-700';
      case 'Expert':
        return 'text-red-800 bg-red-100 border-red-300 dark:text-red-200 dark:bg-red-950/60 dark:border-red-700';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-300 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-600';
    }
  };

  const Icon = getTemplateIcon(template.id);

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
                  className={cn("text-xs px-2 py-0.5 border", getDifficultyColor(template.difficulty))}
                >
                  {template.difficulty}
                </Badge>
              )}
              {template.id.includes('openzeppelin') && (
                <Badge 
                  variant="outline" 
                  className="text-xs px-2 py-0.5 border text-orange-800 bg-orange-50 border-orange-200 dark:text-orange-200 dark:bg-orange-950/60 dark:border-orange-700 font-medium"
                >
                  ⚡ OpenZeppelin
                </Badge>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Description */}
      <td className="py-4 px-6 w-[50%]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p 
                ref={descriptionRef}
                className="text-sm text-muted-foreground leading-relaxed line-clamp-2 cursor-default"
              >
                {template.description}
              </p>
            </TooltipTrigger>
            {isTextTruncated && (
              <TooltipContent 
                className="max-w-sm p-3 text-xs leading-relaxed bg-popover text-popover-foreground border shadow-md"
                side="top"
                align="start"
              >
                {template.description}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </td>

      {/* Action */}
      <td className="py-4 px-6 w-[20%]">
        <div className="flex justify-end gap-2">
          {template.githubUrl && (
            <Button 
              size="sm"
              variant="outline"
              onClick={() => window.open(template.githubUrl, '_blank')}
              className="flex items-center gap-1.5"
            >
              <Github className="h-3.5 w-3.5" />
              See Reference
            </Button>
          )}
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