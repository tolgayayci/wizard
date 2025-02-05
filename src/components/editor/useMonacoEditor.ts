import { useEffect, useRef, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { initializeMonaco } from './EditorConfig';
import debounce from 'lodash/debounce';

interface UseMonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  projectId?: string;
  readOnly?: boolean;
  onSaveStart?: () => void;
  onSaveEnd?: () => void;
}

export function useMonacoEditor({ 
  value, 
  onChange, 
  projectId,
  readOnly = false,
  onSaveStart,
  onSaveEnd,
}: UseMonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);
  const valueRef = useRef(value);
  const isUpdatingRef = useRef(false);
  const isSavingRef = useRef(false);
  const { toast } = useToast();

  // Save to Supabase
  const saveToSupabase = useCallback(async (content: string, showToast = true) => {
    if (!projectId || isSavingRef.current) return;

    try {
      isSavingRef.current = true;
      onSaveStart?.();

      const { error } = await supabase
        .from('projects')
        .update({ 
          code: content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (error) throw error;

      if (showToast) {
        toast({
          title: "Changes saved",
          description: "Your code has been saved successfully",
        });
      }
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      toast({
        title: "Save failed",
        description: "Failed to save your changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      isSavingRef.current = false;
      onSaveEnd?.();
    }
  }, [projectId, toast, onSaveStart, onSaveEnd]);

  // Debounced auto-save
  const debouncedSave = useCallback(
    debounce((content: string) => saveToSupabase(content, false), 1000),
    [saveToSupabase]
  );

  // Manual save function
  const saveContent = useCallback(() => {
    if (!modelRef.current || !projectId) return;
    
    const content = modelRef.current.getValue();
    debouncedSave.cancel(); // Cancel any pending auto-saves
    saveToSupabase(content, true); // Show toast for manual saves
  }, [projectId, debouncedSave, saveToSupabase]);

  // Initialize Monaco editor
  const initializeEditor = useCallback(() => {
    if (!containerRef.current || editorRef.current) return;

    // Initialize Rust language support
    initializeMonaco();

    // Create or get the model
    const modelUri = monaco.Uri.parse('file:///main.rs');
    modelRef.current = monaco.editor.getModel(modelUri) || 
                      monaco.editor.createModel(value, 'rust', modelUri);

    // Create editor
    editorRef.current = monaco.editor.create(containerRef.current, {
      model: modelRef.current,
      language: 'rust',
      theme: 'vs-dark',
      readOnly,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      tabSize: 4,
      insertSpaces: true,
      quickSuggestions: true,
      formatOnPaste: true,
      formatOnType: true,
    });

    // Handle content changes
    const changeDisposable = modelRef.current.onDidChangeContent(() => {
      if (isUpdatingRef.current) return;
      
      const newValue = modelRef.current?.getValue();
      if (newValue !== undefined && newValue !== valueRef.current) {
        valueRef.current = newValue;
        onChange(newValue);
        
        // Auto-save changes
        if (projectId) {
          debouncedSave(newValue);
        }
      }
    });

    // Add save command (Ctrl+S / Cmd+S)
    editorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveContent();
    });

    // Focus handling
    let lastFocusPosition: monaco.Position | null = null;
    editorRef.current.onDidFocusEditorText(() => {
      if (lastFocusPosition) {
        editorRef.current?.setPosition(lastFocusPosition);
        editorRef.current?.revealPositionInCenter(lastFocusPosition);
      }
    });

    // Cursor position tracking
    editorRef.current.onDidChangeCursorPosition(e => {
      if (!isUpdatingRef.current) {
        lastFocusPosition = e.position;
      }
    });

    return () => {
      changeDisposable.dispose();
      debouncedSave.cancel(); // Cancel any pending saves
    };
  }, [value, readOnly, onChange, projectId, debouncedSave, saveContent]);

  // Handle theme changes
  const updateTheme = useCallback(() => {
    const isDark = document.documentElement.classList.contains('dark');
    monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs-light');
  }, []);

  // Initialize editor
  useEffect(() => {
    const cleanup = initializeEditor();
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      cleanup?.();
      observer.disconnect();
      if (modelRef.current) {
        modelRef.current.dispose();
        modelRef.current = null;
      }
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, [initializeEditor, updateTheme]);

  // Update model value when prop changes
  useEffect(() => {
    if (value !== valueRef.current && modelRef.current && !modelRef.current.isDisposed()) {
      const editor = editorRef.current;
      if (!editor) return;

      // Save cursor and selections
      const position = editor.getPosition();
      const selections = editor.getSelections();
      const scrollPosition = editor.getScrollPosition();

      // Update value
      isUpdatingRef.current = true;
      modelRef.current.pushEditOperations(
        [],
        [{
          range: modelRef.current.getFullModelRange(),
          text: value,
        }],
        () => null
      );
      valueRef.current = value;
      isUpdatingRef.current = false;

      // Restore editor state
      requestAnimationFrame(() => {
        if (position) {
          editor.setPosition(position);
        }
        if (selections) {
          editor.setSelections(selections);
        }
        editor.setScrollPosition(scrollPosition);
      });
    }
  }, [value]);

  // Handle container resizes
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        editorRef.current?.layout();
      });
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return { containerRef, saveContent };
}