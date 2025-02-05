import { useState } from 'react';
import { Project } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { 
  Code2Icon, 
  MoreVerticalIcon,
  ExternalLinkIcon,
  Pencil,
  Trash2Icon,
  Clock,
  Network,
  GitBranch,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ProjectListProps {
  projects: Project[];
  searchQuery: string;
  onNavigate: (id: string) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  isLoading?: boolean;
}

export function ProjectList({
  projects,
  searchQuery,
  onNavigate,
  onEdit,
  onDelete,
  isLoading,
}: ProjectListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
            <div className="w-10 h-10 rounded-md bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredProjects.length === 0) {
    return (
      <div className="h-[calc(100vh-20rem)] rounded-lg border bg-card flex items-center justify-center p-8">
        <div className="text-center max-w-sm mx-auto">
          <div className="relative mx-auto w-24 h-24 mb-6">
            {/* Background glow effect */}
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            
            {/* Icon container */}
            <div className="relative bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center">
              <Code2Icon className="h-12 w-12 text-primary" />
            </div>
          </div>
          
          <h3 className="text-2xl font-semibold mb-3">
            {searchQuery ? "No matching projects found" : "No projects yet"}
          </h3>
          
          <p className="text-muted-foreground">
            {searchQuery 
              ? "Try adjusting your search terms or clear the filter to see all projects"
              : "Create your first project to get started with Stylus development"
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-11 px-6 text-left text-xs font-medium text-muted-foreground w-[30%]">
                <div className="flex items-center gap-2">
                  Name
                </div>
              </th>
              <th className="h-11 px-6 text-left text-xs font-medium text-muted-foreground w-[20%]">Description</th>
              <th className="h-11 px-6 text-left text-xs font-medium text-muted-foreground w-[15%]">
                <div className="flex items-center gap-2">
                  Created
                </div>
              </th>
              <th className="h-11 px-6 text-left text-xs font-medium text-muted-foreground w-[15%]">
                <div className="flex items-center gap-2">
                  Last Activity
                </div>
              </th>
              <th className="h-11 px-6 text-left text-xs font-medium text-muted-foreground w-[10%]">
                <div className="flex items-center gap-2">
                  Deployments
                </div>
              </th>
              <th className="h-11 px-6 text-left text-xs font-medium text-muted-foreground w-[10%]">
                <div className="flex items-center gap-2">
                  <Share2 className="h-3.5 w-3.5" />
                  Sharing
                </div>
              </th>
              <th className="w-[46px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedProjects.map((project) => (
              <tr 
                key={project.id}
                className={cn(
                  "group hover:bg-muted/50 cursor-pointer",
                  "transition-colors duration-100"
                )}
                onClick={() => onNavigate(project.id)}
              >
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/5 group-hover:bg-primary/10">
                      <Code2Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium group-hover:text-primary truncate">
                      {project.name}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-muted-foreground truncate block max-w-[250px]">
                    {project.description || 'No description'}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GitBranch className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {formatDistanceToNow(new Date(project.last_activity_at || project.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Network className="h-4 w-4 flex-shrink-0" />
                    <span>{(project as any).deployment_count || 0}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      project.is_public ? "bg-green-500" : "bg-red-500"
                    )} />
                    <span className="text-sm text-muted-foreground">
                      {project.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                </td>
                <td className="pr-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      >
                        <MoreVerticalIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(project.id);
                      }}>
                        <ExternalLinkIcon className="mr-2 h-4 w-4" />
                        Open in New Tab
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onEdit(project);
                      }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(project);
                        }}
                        className="text-red-600 hover:!text-red-600 hover:!bg-red-100 dark:hover:!bg-red-900"
                      >
                        <Trash2Icon className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <div>
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredProjects.length)} of{' '}
            {filteredProjects.length} projects
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="w-8"
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}