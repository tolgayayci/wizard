import { Button } from '@/components/ui/button';
import { PlayIcon, RocketIcon, Loader2, Save, Code2, Download, FileDown, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorHeaderProps {
  onCompile: () => void;
  onDeploy: () => void;
  onSave: () => void;
  onFormat?: () => void;
  onDownloadAbi?: () => void;
  onAnalyzeWasm?: () => void;
  isCompiling: boolean;
  isSaving: boolean;
  isFormatting?: boolean;
  isLoadingAbi?: boolean;
  hasSuccessfulCompilation?: boolean;
  isSharedView?: boolean;
  currentFile?: string | null;
  isDisabled?: boolean;
}

export function EditorHeader({ 
  onCompile, 
  onDeploy, 
  onSave,
  onFormat,
  onDownloadAbi,
  onAnalyzeWasm,
  isCompiling,
  isSaving,
  isFormatting = false,
  isLoadingAbi = false,
  hasSuccessfulCompilation = false,
  isSharedView = false,
  currentFile,
  isDisabled = false,
}: EditorHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
      {/* Left side - Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-md">
          <Code2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-medium">
            {isDisabled 
              ? 'Editor' 
              : currentFile 
                ? `Editing: ${currentFile.split('/').pop()}` 
                : 'Contract Editor'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isDisabled
              ? "Files will load once connection is restored"
              : isSharedView 
                ? "View-only contract code" 
                : currentFile 
                  ? currentFile.includes('/src/') ? 'Source file' : 'Project file'
                  : "Write your Stylus smart contract"}
          </p>
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onSave}
          disabled={isSaving || isSharedView || isDisabled}
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          title={isDisabled ? "Backend connection required" : isSaving ? "Saving..." : "Save"}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
        </Button>

        <Button
          onClick={onCompile}
          disabled={isCompiling || isSharedView || isDisabled}
          variant="default"
          size="sm"
          className="gap-2 min-w-[90px]"
          title={isDisabled ? "Backend connection required" : undefined}
        >
          {isCompiling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlayIcon className="h-4 w-4" />
          )}
          Compile
        </Button>

        {/* Analysis and Download Section - Only show when successfully compiled */}
        {hasSuccessfulCompilation && !isSharedView && (
          <>
            <Button
              onClick={onAnalyzeWasm}
              disabled={isDisabled}
              variant="outline"
              size="sm"
              className="gap-2 min-w-[110px]"
              title={isDisabled ? "Backend connection required" : "Analyze WASM binary size and optimization"}
            >
              <BarChart3 className="h-4 w-4" />
              WASM
            </Button>
            
            <Button
              onClick={onDownloadAbi}
              disabled={isLoadingAbi || isDisabled}
              variant="outline"
              size="sm"
              className="gap-2 min-w-[90px]"
              title={isDisabled ? "Backend connection required" : "View ABI interface"}
            >
              {isLoadingAbi ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {isLoadingAbi ? 'Loading...' : 'ABI'}
            </Button>
            
          </>
        )}

        <Button
          onClick={onDeploy}
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 min-w-[90px]",
            hasSuccessfulCompilation && "bg-primary/10 text-primary hover:bg-primary/20"
          )}
          disabled={!hasSuccessfulCompilation || isSharedView || isDisabled}
          title={isDisabled ? "Backend connection required" : !hasSuccessfulCompilation ? "Compile your contract successfully before deploying" : undefined}
        >
          <RocketIcon className="h-4 w-4" />
          Deploy
        </Button>
      </div>
    </div>
  );
}