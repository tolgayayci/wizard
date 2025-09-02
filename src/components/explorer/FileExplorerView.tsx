import React, { forwardRef } from 'react';
import { FolderTree, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileExplorer, FileExplorerRef } from './FileExplorer';

interface FileExplorerViewProps {
  userId: string;
  projectId: string;
  projectName?: string;
  onFileSelect?: (path: string) => void;
  className?: string;
  selectedFile?: string | null;
  onManagePackages?: () => void;
}

export const FileExplorerView = forwardRef<FileExplorerRef, FileExplorerViewProps>(({
  userId,
  projectId,
  projectName,
  onFileSelect,
  className,
  selectedFile,
  onManagePackages,
}, ref) => {
  return (
    <div className="h-full flex flex-col bg-background border rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-md">
            <FolderTree className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">File Explorer</h3>
            <p className="text-xs text-muted-foreground">
              Navigate and manage project files
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <FileExplorer
          ref={ref}
          userId={userId}
          projectId={projectId}
          projectName={projectName}
          onFileSelect={onFileSelect}
          className="h-full"
          selectedFile={selectedFile}
          onManagePackages={onManagePackages}
        />
      </div>
    </div>
  );
});