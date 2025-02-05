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
}: ProjectCardProps) {
  const isTemplate = variant === 'template';

  return (
    <div className={cn(
      "group relative bg-card rounded-lg border transition-all h-full flex flex-col",
      "hover:border-primary/50 hover:shadow-lg",
      "dark:hover:shadow-primary/5",
      isOpenZeppelin && "opacity-80"
    )}>
      <div className="flex items-start justify-between p-4 border-b bg-muted/10">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-md transition-colors",
            "bg-primary/5 group-hover:bg-primary/10"
          )}>
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={cn(
                "font-semibold text-lg transition-colors",
                "group-hover:text-primary"
              )}>
                {name}
              </h3>
              {isOpenZeppelin && (
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
            <p className={cn(
              "text-sm text-muted-foreground mt-1",
              isTemplate ? "line-clamp-2 min-h-[2.5rem]" : "line-clamp-1"
            )}>
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
                  "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
                  "focus:opacity-100"
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

      <div className="flex-1 p-4">
        {metadata && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className={cn(
              "flex items-center gap-2 p-2 rounded-lg",
              "bg-muted/20 hover:bg-muted/30 transition-colors"
            )}>
              <Network className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-xs text-muted-foreground">Deployments</span>
                <p className="text-sm font-medium">{metadata.deployments || 0}</p>
              </div>
            </div>
            <div className={cn(
              "flex items-center gap-2 p-2 rounded-lg",
              "bg-muted/20 hover:bg-muted/30 transition-colors"
            )}>
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-xs text-muted-foreground">Created</span>
                <p className="text-sm font-medium">
                  {metadata.createdAt && formatDistanceToNow(new Date(metadata.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            {metadata.lastActivity && (
              <div className={cn(
                "col-span-2 flex items-center gap-2 p-2 rounded-lg",
                "bg-muted/20 hover:bg-muted/30 transition-colors"
              )}>
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">Last Activity</span>
                  <p className="text-sm font-medium">
                    {formatDistanceToNow(new Date(metadata.lastActivity), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {isTemplate && features && features.length > 0 && (
          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li key={index} className={cn(
                "flex items-center gap-2 text-sm text-muted-foreground p-2 rounded-lg",
                "hover:bg-muted/20 transition-colors"
              )}>
                <span className="h-1.5 w-1.5 rounded-full bg-primary flex-none" />
                {feature}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={cn(
        "p-4 border-t mt-auto",
        "bg-muted/10 group-hover:bg-muted/20 transition-colors"
      )}>
        <Button 
          className={cn(
            "w-full gap-2 font-medium",
            isTemplate ? [
              // Template variant button styles - Light mode
              "bg-foreground text-background hover:bg-foreground hover:text-background",
              // Template variant button styles - Dark mode
              "dark:bg-primary/20 dark:text-primary dark:hover:bg-primary/30"
            ] : [
              // Project variant button styles
              "bg-primary/10 hover:bg-primary/20 text-primary",
              "dark:bg-primary/20 dark:hover:bg-primary/30"
            ]
          )}
          variant="ghost"
          onClick={onAction}
          disabled={isOpenZeppelin}
        >
          {actionLabel}
          {ActionIcon && (
            <ActionIcon className={cn(
              "h-4 w-4 transition-transform",
              "group-hover:translate-x-0.5"
            )} />
          )}
        </Button>
      </div>
    </div>
  );
}