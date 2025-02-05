import { Button } from '@/components/ui/button';
import { PlayIcon, RocketIcon, Loader2, Save, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorHeaderProps {
  onCompile: () => void;
  onDeploy: () => void;
  onSave: () => void;
  isCompiling: boolean;
  isSaving: boolean;
  hasSuccessfulCompilation?: boolean;
  isSharedView?: boolean;
}

export function EditorHeader({ 
  onCompile, 
  onDeploy, 
  onSave,
  isCompiling,
  isSaving,
  hasSuccessfulCompilation = false,
  isSharedView = false,
}: EditorHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
      {/* Left side - Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-md">
          <Code2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-medium">Contract Editor</h3>
          <p className="text-xs text-muted-foreground">
            {isSharedView ? "View-only contract code" : "Write your Stylus smart contract"}
          </p>
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onSave}
          disabled={isSaving || isSharedView}
          variant="outline"
          size="sm"
          className="gap-2 min-w-[90px]"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? "Saving..." : "Save"}
        </Button>

        <Button
          onClick={onCompile}
          disabled={isCompiling || isSharedView}
          variant="default"
          size="sm"
          className="gap-2 min-w-[90px]"
        >
          {isCompiling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlayIcon className="h-4 w-4" />
          )}
          {isCompiling ? "Compiling..." : "Compile"}
        </Button>

        <Button
          onClick={onDeploy}
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 min-w-[90px]",
            hasSuccessfulCompilation && "bg-primary/10 text-primary hover:bg-primary/20"
          )}
          disabled={!hasSuccessfulCompilation || isSharedView}
          title={!hasSuccessfulCompilation ? "Compile your contract successfully before deploying" : undefined}
        >
          <RocketIcon className="h-4 w-4" />
          Deploy
        </Button>
      </div>
    </div>
  );
}