import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Package,
  FilePlus,
  FolderPlus,
  FileText,
  Settings,
  GitBranch,
  FileCode,
  FileImage,
  Archive,
  WifiOff,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { API_URL } from '@/lib/config';

interface FileNode {
  name: string;
  path: string;
  is_directory: boolean;
  children?: FileNode[];
  size?: number;
  modified?: string;
}

interface FileExplorerProps {
  userId: string;
  projectId: string;
  projectName?: string;
  onFileSelect?: (path: string) => void;
  className?: string;
  selectedFile?: string | null;
  onManagePackages?: () => void;
}

export function FileExplorer({
  userId,
  projectId,
  projectName,
  onFileSelect,
  className,
  selectedFile,
  onManagePackages,
}: FileExplorerProps) {
  const [tree, setTree] = useState<FileNode | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(selectedFile || 'src/lib.rs');
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>(''); // For context-aware adding
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'file' | 'folder' | 'rename'>('file');
  const [dialogValue, setDialogValue] = useState('');
  const [dialogPath, setDialogPath] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ path: string; name: string; isDirectory: boolean } | null>(null);
  const [draggedItem, setDraggedItem] = useState<FileNode | null>(null);
  const [renamingNodePath, setRenamingNodePath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Sync selectedPath with selectedFile prop (convert relative to absolute)
  useEffect(() => {
    if (selectedFile && userId && projectId) {
      const absolutePath = getAbsolutePath(selectedFile, userId, projectId);
      setSelectedPath(absolutePath);
      console.log(`Selection sync: ${selectedFile} -> ${absolutePath}`);
    }
  }, [selectedFile, userId, projectId]);

  const fetchTree = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setIsRetrying(true);
    } else {
      setLoading(true);
      setConnectionError(null);
    }
    
    try {
      const response = await axios.get(`${API_URL}/api/filesystem/tree`, {
        params: { user_id: userId, project_id: projectId },
        timeout: 10000, // 10 second timeout
      });
      const treeData = response.data.data;
      // Override root node name with project name if provided
      if (treeData && projectName) {
        treeData.name = projectName;
      }
      setTree(treeData);
      setConnectionError(null); // Clear error on success
      setIsRetrying(false);
      
      // Auto-expand root and src folders after tree loads
      if (treeData) {
        setExpandedPaths(prev => {
          const newPaths = new Set(prev);
          newPaths.add(treeData.path); // Add root path
          // Find and add src folder path
          if (treeData.children) {
            const srcFolder = treeData.children.find((child: FileNode) => 
              child.name === 'src' && child.is_directory
            );
            if (srcFolder) {
              newPaths.add(srcFolder.path);
            }
          }
          return newPaths;
        });
      }
    } catch (error: any) {
      console.error('File tree fetch error:', error);
      
      // Set simple error message
      setConnectionError('Backend connection failed.');
      setIsRetrying(false);
      
      // Clear tree on error
      setTree(null);
    } finally {
      setLoading(false);
    }
  }, [userId, projectId, projectName]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleFileClick = (node: FileNode, depth: number = 0) => {
    if (node.is_directory) {
      // Set selected folder for context-aware adding
      setSelectedFolderPath(node.path);
      setSelectedPath(node.path);
      // Don't toggle root folder (depth 0)
      if (depth > 0) {
        toggleExpand(node.path);
      }
    } else {
      setSelectedPath(node.path);
      // Set parent directory as selected folder
      const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
      setSelectedFolderPath(parentPath);
      onFileSelect?.(node.path);
    }
  };

  // Utility function to find nodes in the tree
  const findNodeByPath = (node: FileNode | null, path: string): FileNode | null => {
    if (!node) return null;
    if (node.path === path) return node;
    
    if (node.children) {
      for (const child of node.children) {
        const found = findNodeByPath(child, path);
        if (found) return found;
      }
    }
    
    return null;
  };


  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle shortcuts when not renaming and file explorer is focused
    if (renamingNodePath || !selectedPath) return;

    const selectedNode = findNodeByPath(tree, selectedPath);
    if (!selectedNode) return;

    switch (e.key) {
      case 'F2':
        e.preventDefault();
        startInlineRename(selectedNode);
        break;
      case 'Delete':
        e.preventDefault();
        confirmDelete(selectedNode);
        break;
      case 'Enter':
        e.preventDefault();
        if (!selectedNode.is_directory) {
          onFileSelect?.(selectedNode.path);
        }
        break;
      case 'n':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (selectedNode.is_directory) {
            openDialog('file', selectedNode.path);
          } else {
            // Create in parent directory
            const parentPath = selectedNode.path.substring(0, selectedNode.path.lastIndexOf('/'));
            openDialog('file', parentPath);
          }
        }
        break;
    }
  }, [renamingNodePath, selectedPath, tree, onFileSelect]);

  // Add keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleCreateFile = async () => {
    try {
      const fullPath = dialogPath ? `${dialogPath}/${dialogValue}` : dialogValue;
      await axios.post(`${API_URL}/api/filesystem/create`, {
        user_id: userId,
        project_id: projectId,
        path: fullPath,
      });
      await fetchTree();
      setDialogOpen(false);
      setDialogValue('');
      toast({
        title: 'Success',
        description: 'File created successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create file',
        variant: 'destructive',
      });
    }
  };

  const handleCreateFolder = async () => {
    try {
      const fullPath = dialogPath ? `${dialogPath}/${dialogValue}` : dialogValue;
      await axios.post(`${API_URL}/api/filesystem/mkdir`, {
        user_id: userId,
        project_id: projectId,
        path: fullPath,
      });
      await fetchTree();
      setDialogOpen(false);
      setDialogValue('');
      toast({
        title: 'Success',
        description: 'Folder created successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create folder',
        variant: 'destructive',
      });
    }
  };

  // Start inline renaming
  const startInlineRename = (node: FileNode) => {
    setRenamingNodePath(node.path);
    setRenameValue(node.name);
  };

  // Cancel inline renaming
  const cancelInlineRename = () => {
    setRenamingNodePath(null);
    setRenameValue('');
  };

  // Confirm inline renaming
  const confirmInlineRename = async () => {
    if (!renamingNodePath || !renameValue.trim()) {
      cancelInlineRename();
      return;
    }

    try {
      // Convert absolute paths to relative paths
      const oldRelativePath = getRelativePath(renamingNodePath, userId, projectId);
      const newRelativePath = oldRelativePath.substring(0, oldRelativePath.lastIndexOf('/') + 1) + renameValue.trim();
      
      console.log('Inline rename operation:', {
        original: { old: renamingNodePath, new: renamingNodePath.substring(0, renamingNodePath.lastIndexOf('/') + 1) + renameValue.trim() },
        relative: { old: oldRelativePath, new: newRelativePath },
        userId,
        projectId
      });

      await axios.post(`${API_URL}/api/filesystem/rename`, {
        user_id: userId,
        project_id: projectId,
        old_path: oldRelativePath,
        new_path: newRelativePath,
      });
      await fetchTree();
      cancelInlineRename();
      toast({
        title: 'Success',
        description: 'Renamed successfully',
      });
    } catch (error) {
      console.error('Rename error:', error);
      toast({
        title: 'Error',
        description: `Failed to rename: ${error.response?.data?.error?.message || error.message}`,
        variant: 'destructive',
      });
      cancelInlineRename();
    }
  };

  const handleRename = async () => {
    try {
      // Convert absolute paths to relative paths
      const oldRelativePath = getRelativePath(dialogPath, userId, projectId);
      const newRelativePath = oldRelativePath.substring(0, oldRelativePath.lastIndexOf('/') + 1) + dialogValue;
      
      console.log('Rename operation:', {
        original: { old: dialogPath, new: dialogPath.substring(0, dialogPath.lastIndexOf('/') + 1) + dialogValue },
        relative: { old: oldRelativePath, new: newRelativePath },
        userId,
        projectId
      });

      await axios.post(`${API_URL}/api/filesystem/rename`, {
        user_id: userId,
        project_id: projectId,
        old_path: oldRelativePath,
        new_path: newRelativePath,
      });
      await fetchTree();
      setDialogOpen(false);
      setDialogValue('');
      toast({
        title: 'Success',
        description: 'Renamed successfully',
      });
    } catch (error) {
      console.error('Rename error:', error);
      toast({
        title: 'Error',
        description: `Failed to rename: ${error.response?.data?.error?.message || error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (path: string) => {
    try {
      // Convert absolute path to relative path
      const relativePath = getRelativePath(path, userId, projectId);
      
      console.log('Delete operation:', {
        original: path,
        relative: relativePath,
        userId,
        projectId
      });

      await axios.post(`${API_URL}/api/filesystem/delete`, {
        user_id: userId,
        project_id: projectId,
        path: relativePath,
      });
      await fetchTree();
      toast({
        title: 'Success',
        description: 'Deleted successfully',
      });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: `Failed to delete: ${error.response?.data?.error?.message || error.message}`,
        variant: 'destructive',
      });
    }
  };

  // Utility function to convert absolute paths to relative paths
  const getRelativePath = (absolutePath: string, userId: string, projectId: string): string => {
    // Path structure: /tmp/wizard-storage/{userId}/{projectId}/{relativePath}
    const prefix = `/tmp/wizard-storage/${userId}/${projectId}/`;
    if (absolutePath.startsWith(prefix)) {
      const relative = absolutePath.substring(prefix.length);
      console.log(`Path conversion: ${absolutePath} -> ${relative}`);
      return relative;
    }
    
    // Fallback: try to extract using pattern matching
    const match = absolutePath.match(/\/tmp\/wizard-storage\/[^/]+\/[^/]+\/(.+)$/);
    if (match) {
      console.log(`Path conversion (fallback): ${absolutePath} -> ${match[1]}`);
      return match[1];
    }
    
    // If no match, return the original path (might be already relative)
    console.log(`Path conversion (no match): returning original ${absolutePath}`);
    return absolutePath;
  };

  // Utility function to convert relative paths to absolute paths
  const getAbsolutePath = (relativePath: string, userId: string, projectId: string): string => {
    if (relativePath.startsWith('/tmp/wizard-storage/')) {
      // Already absolute
      return relativePath;
    }
    
    // Convert relative to absolute
    const absolutePath = `/tmp/wizard-storage/${userId}/${projectId}/${relativePath}`;
    console.log(`Relative to absolute: ${relativePath} -> ${absolutePath}`);
    return absolutePath;
  };

  const confirmDelete = (node: FileNode) => {
    setDeleteTarget({
      path: node.path,
      name: node.name,
      isDirectory: node.is_directory
    });
    setDeleteDialogOpen(true);
  };

  const handleMove = async (sourcePath: string, destinationPath: string) => {
    try {
      // Convert absolute paths to relative paths
      const sourceRelativePath = getRelativePath(sourcePath, userId, projectId);
      const destRelativePath = getRelativePath(destinationPath, userId, projectId);
      
      console.log('Move operation:', { 
        original: { sourcePath, destinationPath },
        relative: { sourceRelativePath, destRelativePath },
        userId,
        projectId
      });

      const response = await axios.post(`${API_URL}/api/filesystem/move`, {
        user_id: userId,
        project_id: projectId,
        source_path: sourceRelativePath,
        destination_path: destRelativePath,
      });
      
      console.log('Move response:', response.data);
      
      await fetchTree();
      toast({
        title: 'Success',
        description: 'File moved successfully',
      });
    } catch (error) {
      console.error('Move error details:', error.response?.data || error.message);
      toast({
        title: 'Error',
        description: `Failed to move file: ${error.response?.data?.error?.message || error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleMoveToRoot = async (sourcePath: string) => {
    try {
      // Convert source path to relative
      const sourceRelativePath = getRelativePath(sourcePath, userId, projectId);
      
      console.log('Move to root operation:', { 
        original: sourcePath,
        relative: sourceRelativePath,
        userId,
        projectId
      });

      const response = await axios.post(`${API_URL}/api/filesystem/move`, {
        user_id: userId,
        project_id: projectId,
        source_path: sourceRelativePath,
        destination_path: '', // Empty string means move to root
      });
      
      console.log('Move to root response:', response.data);
      
      await fetchTree();
      toast({
        title: 'Success',
        description: 'File moved to root successfully',
      });
    } catch (error) {
      console.error('Move to root error details:', error.response?.data || error.message);
      toast({
        title: 'Error',
        description: `Failed to move file to root: ${error.response?.data?.error?.message || error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const draggedNode = findNodeByPath(tree, active.id as string);
    if (draggedNode) {
      setDraggedItem(draggedNode);
      console.log('Drag started:', draggedNode);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);

    if (!over || active.id === over.id) {
      console.log('Drag ended - no valid drop target');
      return;
    }

    const sourcePath = active.id as string;
    const targetPath = over.id as string;
    
    console.log('Drag end paths:', { sourcePath, targetPath });
    
    // Check if dropping on the root area
    if (targetPath.endsWith('_ROOT_AREA')) {
      console.log('Dropping to root area');
      handleMoveToRoot(sourcePath);
      return;
    }
    
    // Check if dropping on the root folder itself
    if (tree && targetPath === tree.path) {
      console.log('Dropping to root folder');
      handleMoveToRoot(sourcePath);
      return;
    }
    
    // Don't allow dropping on files, only on folders
    const targetNode = findNodeByPath(tree, targetPath);
    console.log('Target node:', targetNode);
    
    if (targetNode && targetNode.is_directory) {
      handleMove(sourcePath, targetPath);
    } else {
      console.log('Invalid drop target - not a directory');
    }
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'rs':
        return FileCode;
      case 'toml':
      case 'json':
        return Settings;
      case 'md':
      case 'txt':
        return FileText;
      case 'git':
      case 'gitignore':
        return GitBranch;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return FileImage;
      case 'zip':
      case 'tar':
      case 'gz':
        return Archive;
      default:
        return File;
    }
  };

  const openDialog = (mode: 'file' | 'folder' | 'rename', path: string = '') => {
    setDialogMode(mode);
    // If no path provided, use selectedFolderPath for context-aware adding
    const targetPath = path || (mode !== 'rename' ? selectedFolderPath : '');
    setDialogPath(targetPath);
    setDialogValue(mode === 'rename' ? path.split('/').pop() || '' : '');
    setDialogOpen(true);
  };

  // Draggable wrapper component
  const DraggableNode: React.FC<{ node: FileNode; children: React.ReactNode }> = ({ node, children }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      isDragging,
    } = useDraggable({
      id: node.path,
      data: node,
    });

    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(isDragging && 'opacity-50')}
      >
        {children}
      </div>
    );
  };

  // Root drop area component for dropping to project root
  const RootDropArea: React.FC<{ tree: FileNode; children: React.ReactNode }> = ({ tree, children }) => {
    const {
      isOver,
      setNodeRef,
    } = useDroppable({
      id: tree.path + '_ROOT_AREA',
      data: { isRootArea: true, rootPath: tree.path }
    });

    return (
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-full',
          isOver && 'bg-primary/10 rounded'
        )}
      >
        {children}
      </div>
    );
  };

  // Droppable wrapper component for folders
  const DroppableFolder: React.FC<{ node: FileNode; children: React.ReactNode }> = ({ node, children }) => {
    const {
      isOver,
      setNodeRef,
    } = useDroppable({
      id: node.path,
      disabled: !node.is_directory,
    });

    return (
      <div
        ref={setNodeRef}
        className={cn(
          node.is_directory && isOver && 'bg-primary/10 rounded'
        )}
      >
        {children}
      </div>
    );
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    // Always expand root node (depth 0) or check expandedPaths for others
    const isExpanded = depth === 0 || expandedPaths.has(node.path);
    const isSelected = selectedPath === node.path;

    return (
      <div key={node.path}>
        <DroppableFolder node={node}>
          <DraggableNode node={node}>
            <ContextMenu>
              <ContextMenuTrigger>
                <div
                  className={cn(
                    'flex items-center gap-1 px-1 py-1 hover:bg-accent/80 rounded cursor-pointer transition-colors',
                    isSelected && 'bg-primary/10 font-medium'
                  )}
                  style={{ paddingLeft: `${depth * 12 + 4}px` }}
                  onClick={() => handleFileClick(node, depth)}
                >
              {node.is_directory ? (
                <>
                  {depth > 0 ? (
                    isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )
                  ) : (
                    <div className="w-4" />
                  )}
                  {isExpanded ? (
                    <FolderOpen className="h-4 w-4" />
                  ) : (
                    <Folder className="h-4 w-4" />
                  )}
                </>
              ) : (
                <>
                  <div className="w-4" />
                  {(() => {
                    const IconComponent = getFileIcon(node.name);
                    return <IconComponent className="h-4 w-4" />;
                  })()}
                </>
              )}
              {renamingNodePath === node.path ? (
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      confirmInlineRename();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelInlineRename();
                    }
                  }}
                  onBlur={() => confirmInlineRename()}
                  className="text-sm h-5 px-1 py-0 border-primary focus:ring-1 rounded-sm"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span 
                  className="text-sm truncate"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startInlineRename(node);
                  }}
                >
                  {node.name}
                </span>
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            {node.is_directory && (
              <>
                <ContextMenuItem onClick={() => openDialog('file', node.path)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New File
                </ContextMenuItem>
                <ContextMenuItem onClick={() => openDialog('folder', node.path)}>
                  <Folder className="mr-2 h-4 w-4" />
                  New Folder
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            <ContextMenuItem onClick={() => startInlineRename(node)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => confirmDelete(node)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </DraggableNode>
    </DroppableFolder>
        {node.is_directory && isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('flex flex-col h-full', className)}>
      {!connectionError && (
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1"
              onClick={() => openDialog('file')}
              disabled={loading}
              title={selectedFolderPath ? `New File in ${selectedFolderPath}` : 'New File in Root'}
            >
              <FilePlus className="h-3.5 w-3.5" />
              <span className="text-xs">File</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1"
              onClick={() => openDialog('folder')}
              disabled={loading}
              title={selectedFolderPath ? `New Folder in ${selectedFolderPath}` : 'New Folder in Root'}
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span className="text-xs">Folder</span>
            </Button>
            {onManagePackages && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1"
                onClick={onManagePackages}
                disabled={loading}
                title="Manage Packages"
              >
                <Package className="h-3.5 w-3.5" />
                <span className="text-xs">Packages</span>
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => fetchTree()}
            disabled={loading}
            title="Refresh File Tree"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
      )}
      
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading file tree...</p>
            </div>
          </div>
        ) : connectionError ? (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="text-center space-y-4">
              <div className="p-2.5 bg-destructive/10 rounded-md w-fit mx-auto">
                <WifiOff className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Connection Problem</h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
                  {connectionError}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTree(true)}
                className="gap-2"
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                {isRetrying ? 'Connecting...' : 'Try Again'}
              </Button>
            </div>
          </div>
        ) : tree ? (
          <ScrollArea className="h-full px-1">
            <RootDropArea tree={tree}>
              {renderNode(tree)}
            </RootDropArea>
          </ScrollArea>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Folder className="h-6 w-6 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No files found</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'file' && 'Create New File'}
              {dialogMode === 'folder' && 'Create New Folder'}
              {dialogMode === 'rename' && 'Rename'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'file' && (
                <>Enter the name for the new file{dialogPath && (
                  <span className="block mt-1 text-xs font-mono bg-muted px-2 py-1 rounded">
                    Location: {dialogPath}/
                  </span>
                )}</>
              )}
              {dialogMode === 'folder' && (
                <>Enter the name for the new folder{dialogPath && (
                  <span className="block mt-1 text-xs font-mono bg-muted px-2 py-1 rounded">
                    Location: {dialogPath}/
                  </span>
                )}</>
              )}
              {dialogMode === 'rename' && 'Enter the new name'}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={dialogValue}
            onChange={(e) => setDialogValue(e.target.value)}
            placeholder={dialogMode === 'folder' ? 'folder-name' : 'file-name.rs'}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (dialogMode === 'file') handleCreateFile();
                else if (dialogMode === 'folder') handleCreateFolder();
                else if (dialogMode === 'rename') handleRename();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (dialogMode === 'file') handleCreateFile();
                else if (dialogMode === 'folder') handleCreateFolder();
                else if (dialogMode === 'rename') handleRename();
              }}
            >
              {dialogMode === 'rename' ? 'Rename' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.isDirectory ? 'Folder' : 'File'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
              {deleteTarget?.isDirectory && (
                <span className="block mt-2 text-destructive">
                  This will permanently delete the folder and all its contents.
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget.path)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
      
      <DragOverlay>
        {draggedItem && (
          <div className="flex items-center gap-1 px-2 py-1 bg-background border rounded shadow-lg opacity-90">
            {draggedItem.is_directory ? (
              <Folder className="h-4 w-4" />
            ) : (
              (() => {
                const IconComponent = getFileIcon(draggedItem.name);
                return <IconComponent className="h-4 w-4" />;
              })()
            )}
            <span className="text-sm">{draggedItem.name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}