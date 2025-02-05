import { useState } from 'react';
import { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ProjectListProps {
  projects: Project[];
  selectedProject?: Project;
  onSelect: (project: Project) => void;
  onDelete: (project: Project) => void;
  onNew: () => void;
}

export function ProjectList({
  projects,
  selectedProject,
  onSelect,
  onDelete,
  onNew,
}: ProjectListProps) {
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);

  return (
    <Card className="w-64 h-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Projects
          <Button variant="ghost" size="icon" onClick={onNew}>
            <PlusIcon className="h-4 w-4" />
          </Button>
        </CardTitle>
        <CardDescription>Your Stylus projects</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-accent ${
                  selectedProject?.id === project.id ? 'bg-accent' : ''
                }`}
                onClick={() => onSelect(project)}
              >
                <div className="flex items-center gap-2">
                  <FileIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">{project.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteProject(project);
                  }}
                >
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      <AlertDialog
        open={deleteProject !== null}
        onOpenChange={() => setDeleteProject(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteProject?.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteProject) {
                  onDelete(deleteProject);
                  setDeleteProject(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}