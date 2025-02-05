import { ArrowUpRight, Blocks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProjectHeaderProps {
  onNewProject: () => void;
}

export function ProjectHeader({ onNewProject }: ProjectHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-3 rounded-lg",
            "bg-gradient-to-br from-primary/10 via-blue-500/10 to-purple-500/10"
          )}>
            <Blocks className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Smart Contracts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Build and deploy your Stylus contracts with confidence
            </p>
          </div>
        </div>
      </div>
      <Button onClick={onNewProject} className="gap-2">
        <ArrowUpRight className="h-4 w-4" />
        New Project
      </Button>
    </div>
  );
}