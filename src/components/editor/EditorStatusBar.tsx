import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Clock, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorStatusBarProps {
  lintStatus: 'idle' | 'checking' | 'success' | 'error';
  lintIssueCount: number;
  isFormatting: boolean;
  onFormat: () => void;
  currentFile?: string | null;
  isSharedView?: boolean;
}

export function EditorStatusBar({
  lintStatus,
  lintIssueCount,
  isFormatting,
  onFormat,
  currentFile,
  isSharedView = false,
}: EditorStatusBarProps) {
  const isRustFile = currentFile?.endsWith('.rs');
  
  return (
    <div className="h-7 bg-muted/30 border-t border-border flex items-center justify-between px-3 py-1 text-xs">
      {/* Left side - Lint status */}
      <div className="flex items-center gap-2">
        {isRustFile && !isSharedView && (
          <div className="flex items-center gap-1">
            {lintStatus === 'checking' && (
              <>
                <Clock className="h-3 w-3 text-blue-500 animate-pulse" />
                <span className="text-blue-500">Checking...</span>
              </>
            )}
            {lintStatus === 'success' && (
              <>
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span className="text-green-500">No issues</span>
              </>
            )}
            {lintStatus === 'error' && lintIssueCount > 0 && (
              <>
                <AlertCircle className="h-3 w-3 text-orange-500" />
                <span className="text-orange-500">
                  {lintIssueCount} issue{lintIssueCount !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right side - Format button */}
      <div className="flex items-center gap-1">
        {isRustFile && !isSharedView && (
          <Button
            onClick={onFormat}
            disabled={isFormatting}
            variant="ghost"
            size="sm"
            className="h-5 px-2 text-xs hover:bg-muted/50"
            title="Format code with rustfmt"
          >
            {isFormatting ? (
              <Clock className="h-3 w-3 animate-spin" />
            ) : (
              <Wand2 className="h-3 w-3" />
            )}
            <span className="ml-1">{isFormatting ? 'Formatting...' : 'Format'}</span>
          </Button>
        )}
      </div>
    </div>
  );
}