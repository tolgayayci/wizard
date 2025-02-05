import { useState, useRef, useEffect } from 'react';
import MonacoEditor from "@monaco-editor/react";
import { EditorHeader } from './editor/EditorHeader';
import { DeployDialog } from './editor/DeployDialog';
import { useTheme } from 'next-themes';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { FileCode2 } from 'lucide-react';
import { CompilationResult } from '@/lib/types';
import { 
  initializeMonaco, 
  defineEditorTheme, 
  defaultEditorOptions 
} from '@/lib/editor';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onCompile?: () => Promise<void>;
  isCompiling?: boolean;
  readOnly?: boolean;
  projectId?: string;
  lastCompilation?: CompilationResult | null;
  onDeploySuccess?: () => void;
  onSave?: () => void;
  isSharedView?: boolean;
}

export function Editor({ 
  value, 
  onChange, 
  onCompile, 
  isCompiling,
  readOnly = false,
  projectId,
  lastCompilation,
  onDeploySuccess,
  onSave,
  isSharedView = false,
}: EditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [showABIError, setShowABIError] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const { theme } = useTheme();
  const { toast } = useToast();

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    initializeMonaco(monaco);
    defineEditorTheme(monaco, theme === 'dark');

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, handleSave);
  };

  const handleSave = async () => {
    if (!projectId || !editorRef.current || isSaving || isSharedView) return;
    
    setIsSaving(true);
    try {
      const currentValue = editorRef.current.getValue();
      
      const { error } = await supabase
        .from('projects')
        .update({ 
          code: currentValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: "Changes saved",
        description: "Your code has been saved successfully",
      });

      // Call onSave callback to update parent component
      onSave?.();
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: "Save failed",
        description: "Failed to save your changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeployClick = () => {
    // Check if we have a valid ABI from the last compilation
    if (!lastCompilation?.abi || !Array.isArray(lastCompilation.abi) || lastCompilation.abi.length === 0) {
      setShowABIError(true);
      setShowDeployDialog(true);
      return;
    }

    setShowABIError(false);
    setShowDeployDialog(true);
  };

  const handleDeploySuccess = () => {
    // Close the deploy dialog
    setShowDeployDialog(false);
    setShowABIError(false);
    
    // Show success message
    toast({
      title: "Success",
      description: "Contract deployed successfully. ABI view will refresh.",
    });

    // Call the onDeploySuccess callback if provided
    if (onDeploySuccess) {
      onDeploySuccess();
    }
  };

  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      defineEditorTheme(monacoRef.current, theme === 'dark');
      monacoRef.current.editor.setTheme('custom-theme');
    }
  }, [theme]);

  return (
    <div className="h-full flex flex-col bg-background border rounded-md overflow-hidden">
      <EditorHeader
        onCompile={onCompile || (() => {})}
        onDeploy={handleDeployClick}
        onSave={handleSave}
        isCompiling={isCompiling || false}
        isSaving={isSaving}
        hasSuccessfulCompilation={lastCompilation?.success}
        isSharedView={isSharedView}
      />
      <div className="flex-1 min-h-0 relative">
        <MonacoEditor
          height="100%"
          defaultLanguage="rust"
          value={value}
          onChange={(value) => onChange(value || '')}
          options={{
            ...defaultEditorOptions,
            readOnly: readOnly || isCompiling || isSharedView,
          }}
          onMount={handleEditorDidMount}
          theme="custom-theme"
          loading={
            <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
              <div className="text-center">
                <div className="inline-flex p-3 bg-primary/10 rounded-lg mb-6">
                  <FileCode2 className="h-6 w-6 text-primary animate-pulse" />
                </div>
                <h3 className="font-medium mb-3">Loading Editor</h3>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Initializing development environment
                  </p>
                  <p className="text-sm text-muted-foreground">
                    with Rust language support
                  </p>
                </div>
              </div>
            </div>
          }
        />
      </div>
      {projectId && !isSharedView && (
        <DeployDialog
          open={showDeployDialog}
          onOpenChange={setShowDeployDialog}
          projectId={projectId}
          lastCompilation={lastCompilation}
          onDeploySuccess={handleDeploySuccess}
          showABIError={showABIError}
        />
      )}
    </div>
  );
}