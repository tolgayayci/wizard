import { Button } from '@/components/ui/button';
import { PlayIcon, RocketIcon, Loader2, Save, Code2, Wand2, Bug, Download, FileDown, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorHeaderProps {
  onCompile: () => void;
  onDeploy: () => void;
  onSave: () => void;
  onFormat?: () => void;
  onLint?: () => void;
  onDownloadWasm?: () => void;
  onDownloadAbi?: () => void;
  onAnalyzeWasm?: () => void;
  isCompiling: boolean;
  isSaving: boolean;
  isFormatting?: boolean;
  isLinting?: boolean;
  hasSuccessfulCompilation?: boolean;
  isSharedView?: boolean;
  currentFile?: string | null;
}

export function EditorHeader({ 
  onCompile, 
  onDeploy, 
  onSave,
  onFormat,
  onLint,
  onDownloadWasm,
  onDownloadAbi,
  onAnalyzeWasm,
  isCompiling,
  isSaving,
  isFormatting = false,
  isLinting = false,
  hasSuccessfulCompilation = false,
  isSharedView = false,
  currentFile,
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
            {currentFile ? `Editing: ${currentFile}` : 'Contract Editor'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isSharedView 
              ? "View-only contract code" 
              : currentFile 
                ? "Editing project file" 
                : "Write your Stylus smart contract"}
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

        {onFormat && currentFile?.endsWith('.rs') && (
          <Button
            onClick={onFormat}
            disabled={isFormatting || isSaving || isSharedView}
            variant="outline"
            size="sm"
            className="gap-2 min-w-[90px]"
            title="Format code with rustfmt"
          >
            {isFormatting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {isFormatting ? "Formatting..." : "Format"}
          </Button>
        )}

        {onLint && currentFile?.endsWith('.rs') && (
          <Button
            onClick={onLint}
            disabled={isLinting || isSaving || isSharedView}
            variant="outline"
            size="sm"
            className="gap-2 min-w-[90px]"
            title="Lint code with clippy"
          >
            {isLinting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bug className="h-4 w-4" />
            )}
            {isLinting ? "Linting..." : "Lint"}
          </Button>
        )}

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
          Compile
        </Button>

        {/* Download Section - Only show when successfully compiled */}
        {hasSuccessfulCompilation && !isSharedView && (
          <>
            <Button
              onClick={onDownloadWasm}
              variant="outline"
              size="sm"
              className="gap-2 min-w-[110px]"
              title="Download compiled WASM binary"
            >
              <Download className="h-4 w-4" />
              WASM
            </Button>
            
            <Button
              onClick={onDownloadAbi}
              variant="outline"
              size="sm"
              className="gap-2 min-w-[90px]"
              title="Download ABI files"
            >
              <FileDown className="h-4 w-4" />
              ABI
            </Button>
            
            <Button
              onClick={onAnalyzeWasm}
              variant="outline"
              size="sm"
              className="gap-2 min-w-[110px]"
              title="Analyze WASM binary for optimization suggestions"
            >
              <BarChart3 className="h-4 w-4" />
              Analyze
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