import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVerticalIcon,
  Clock,
  Network,
  GitBranch,
  Code2,
  Zap,
  Star,
  Check,
  BookOpen,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  name: string;
  description: string;
  icon: any;
  actionLabel: string;
  actionIcon?: any;
  onAction: () => void;
  menuItems?: React.ReactNode;
  features?: string[];
  isOpenZeppelin?: boolean;
  metadata?: {
    deployments?: number;
    createdAt?: string;
    lastActivity?: string;
  };
  variant?: 'project' | 'template';
  // Template-specific props
  category?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  linesOfCode?: number;
  gasEfficiency?: number;
}

export function ProjectCard({ 
  name, 
  description, 
  icon: Icon, 
  actionLabel, 
  actionIcon: ActionIcon, 
  onAction,
  menuItems,
  features,
  isOpenZeppelin,
  metadata,
  variant = 'project',
  category,
  difficulty,
  linesOfCode,
  gasEfficiency,
}: ProjectCardProps) {
  const isTemplate = variant === 'template';

  // Category colors (subtle, GitHub-like)
  const getCategoryColor = (cat?: string) => {
    switch (cat?.toLowerCase()) {
      case 'defi':
        return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800';
      case 'nft':
        return 'text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950 dark:border-purple-800';
      case 'governance':
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800';
      case 'utility':
        return 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950 dark:border-orange-800';
      case 'beginner':
        return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-950 dark:border-gray-800';
      default:
        return 'text-primary bg-primary/5 border-primary/20';
    }
  };

  // Difficulty colors (GitHub-like labels)
  const getDifficultyColor = (diff?: string) => {
    switch (diff) {
      case 'Beginner':
        return 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/50';
      case 'Intermediate':
        return 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/50';
      case 'Advanced':
        return 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/50';
      default:
        return 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800';
    }
  };

  return (
    <div className={cn(
      "group relative bg-card rounded-lg border transition-all h-full flex flex-col",
      "hover:border-border hover:shadow-md",
      "dark:hover:shadow-lg dark:hover:shadow-black/20",
      isOpenZeppelin && "opacity-80"
    )}>
      <div className="p-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 rounded-md bg-muted/50">
            <Icon className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg text-foreground truncate">
                {name}
              </h3>
              {isTemplate && category && (
                <Badge 
                  variant="outline" 
                  className={cn("text-xs font-medium px-2 py-0.5", getCategoryColor(category))}
                >
                  {category}
                </Badge>
              )}
              {isTemplate && difficulty && (
                <Badge 
                  variant="outline" 
                  className={cn("text-xs font-medium px-2 py-0.5", getDifficultyColor(difficulty))}
                >
                  {difficulty}
                </Badge>
              )}
            </div>
            {isOpenZeppelin && (
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                  OpenZeppelin
                </Badge>
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                  Coming Soon
                </Badge>
              </div>
            )}
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
          {menuItems && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0",
                    "focus:opacity-100 hover:bg-muted"
                  )}
                >
                  <MoreVerticalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {menuItems}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
      </div>

        {/* GitHub-like stats bar for templates */}
        {isTemplate && (linesOfCode || gasEfficiency) && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 pb-4 border-b">
            {linesOfCode && (
              <div className="flex items-center gap-1.5">
                <Code2 className="h-4 w-4" />
                <span className="font-medium text-foreground">{linesOfCode.toLocaleString()}</span>
                <span>lines</span>
              </div>
            )}
            {gasEfficiency && (
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4" />
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn(
                      "h-3 w-3",
                      i < gasEfficiency 
                        ? "text-yellow-500 fill-yellow-500" 
                        : "text-muted-foreground/30"
                    )} />
                  ))}
                </div>
                <span>gas efficiency</span>
              </div>
            )}
          </div>
        )}

        {/* GitHub-like feature list for templates */}
        {isTemplate && features && features.length > 0 && (
          <div className="space-y-0">
            {features.slice(0, 5).map((feature, index) => (
              <div key={index} className="flex items-start gap-2.5 py-1.5 text-sm leading-relaxed">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-foreground">{feature}</span>
              </div>
            ))}
            {features.length > 5 && (
              <div className="flex items-center gap-2.5 py-1.5 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>+{features.length - 5} more features</span>
              </div>
            )}
          </div>
        )}

        {/* Project metadata for regular projects */}
        {!isTemplate && metadata && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Network className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Deployments:</span>
              <span className="font-medium text-foreground">{metadata.deployments || 0}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium text-foreground">
                {metadata.createdAt && formatDistanceToNow(new Date(metadata.createdAt), { addSuffix: true })}
              </span>
            </div>
            {metadata.lastActivity && (
              <div className="col-span-2 flex items-center gap-2 text-sm pt-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Last Activity:</span>
                <span className="font-medium text-foreground">
                  {formatDistanceToNow(new Date(metadata.lastActivity), { addSuffix: true })}
                </span>
              </div>
            )}
          </div>
        )}

      <div className="p-6 pt-0 mt-auto">
        <Button 
          className={cn(
            "w-full gap-2 font-medium transition-all",
            isTemplate 
              ? "bg-primary text-primary-foreground hover:bg-primary/90" 
              : "bg-muted hover:bg-muted/80 text-foreground"
          )}
          onClick={onAction}
          disabled={isOpenZeppelin}
        >
          {actionLabel}
          {ActionIcon && (
            <ActionIcon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}