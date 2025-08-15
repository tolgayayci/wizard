import { Github, FileCode, Sparkles, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Project } from '@/lib/types';

interface ProjectBadgeProps {
  project: Project;
  variant?: 'default' | 'compact' | 'detailed';
  showLink?: boolean;
  className?: string;
}

export function ProjectBadge({ 
  project, 
  variant = 'default',
  showLink = false,
  className 
}: ProjectBadgeProps) {
  if (!project.import_type || project.import_type === 'manual') {
    return null;
  }

  const getBadgeContent = () => {
    switch (project.import_type) {
      case 'github':
        return {
          icon: Github,
          label: variant === 'compact' ? 'GitHub' : 'Imported from GitHub',
          color: 'bg-gray-900 hover:bg-gray-800 text-white',
          url: project.source_url,
        };
      case 'template':
        return {
          icon: Sparkles,
          label: variant === 'compact' ? 'Template' : 'Created from Template',
          color: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 border-purple-200',
          url: null,
        };
      default:
        return null;
    }
  };

  const badgeContent = getBadgeContent();
  if (!badgeContent) return null;

  const { icon: Icon, label, color, url } = badgeContent;

  if (variant === 'detailed' && project.import_type === 'github') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Badge 
          variant="secondary" 
          className={cn('gap-1.5 px-2 py-1', color)}
        >
          <Icon className="h-3 w-3" />
          {project.import_metadata?.repository_owner}/{project.import_metadata?.repository_name}
        </Badge>
        {showLink && url && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-6 w-6 p-0 hover:bg-muted"
          >
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title="View original repository"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        )}
      </div>
    );
  }

  const badgeElement = (
    <Badge 
      variant="secondary" 
      className={cn('gap-1.5', color, className)}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );

  if (showLink && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block hover:opacity-80 transition-opacity"
        title="View original repository"
      >
        {badgeElement}
      </a>
    );
  }

  return badgeElement;
}

interface ProjectImportInfoProps {
  project: Project;
  className?: string;
}

export function ProjectImportInfo({ project, className }: ProjectImportInfoProps) {
  if (!project.import_metadata || project.import_type !== 'github') {
    return null;
  }

  const { files_count, import_date, repository_owner, repository_name } = project.import_metadata;

  return (
    <div className={cn('text-xs text-muted-foreground space-y-1', className)}>
      {files_count && (
        <div>Imported {files_count} files</div>
      )}
      {import_date && (
        <div>
          Imported on {new Date(import_date).toLocaleDateString()}
        </div>
      )}
      {repository_owner && repository_name && (
        <div>
          Source: {repository_owner}/{repository_name}
        </div>
      )}
    </div>
  );
}