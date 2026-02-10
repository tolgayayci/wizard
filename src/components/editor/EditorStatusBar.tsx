import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface EditorStatusBarProps {
  lintStatus: 'idle' | 'checking' | 'success' | 'error';
  lintIssueCount: number;
  currentFile?: string | null;
  isSharedView?: boolean;
}

export function EditorStatusBar({
  lintStatus,
  lintIssueCount,
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
    </div>
  );
}