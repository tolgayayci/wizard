import * as monaco from 'monaco-editor';

// Language configuration for Rust
export const rustLanguageConfig: monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: '\'', close: '\'' },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: '\'', close: '\'' },
  ],
  indentationRules: {
    increaseIndentPattern: /^.*\{[^}"']*$|^.*\([^)"']*$|^\s*(pub\s+)?((if|while|for|match|impl|struct|enum|mod|unsafe)\b.*?)?\s*$/,
    decreaseIndentPattern: /^(.*\*\/)?\s*[})].*$/,
  },
};

// Initialize Monaco editor with Rust and Stylus SDK support
export function initializeMonaco(monaco: typeof import('monaco-editor')) {
  // Register Rust language if not already registered
  if (!monaco.languages.getLanguages().some(lang => lang.id === 'rust')) {
    monaco.languages.register({ id: 'rust' });
    monaco.languages.setLanguageConfiguration('rust', rustLanguageConfig);

    // Create completion items after Monaco is initialized
    const createCompletionItems = () => {
      // Stylus SDK types and completions
      const STYLUS_SDK_TYPES = [
        {
          label: 'U256',
          kind: monaco.languages.CompletionItemKind.Class,
          detail: 'stylus_sdk::alloy_primitives::U256',
          documentation: '256-bit unsigned integer type for Ethereum compatibility',
          insertText: 'U256',
        },
        {
          label: 'Address',
          kind: monaco.languages.CompletionItemKind.Class,
          detail: 'stylus_sdk::alloy_primitives::Address',
          documentation: 'Ethereum address type',
          insertText: 'Address',
        },
        {
          label: 'sol_storage',
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: 'stylus_sdk::sol_storage',
          documentation: 'Define contract storage layout',
          insertText: [
            'sol_storage! {',
            '    #[entrypoint]',
            '    pub struct ${1:Contract} {',
            '        ${2:// Storage variables}',
            '    }',
            '}',
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
        {
          label: 'public',
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: 'stylus_sdk::public',
          documentation: 'Define public contract interface',
          insertText: [
            '#[public]',
            'impl ${1:Contract} {',
            '    ${2:// Public methods}',
            '}',
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
      ];

      // Stylus SDK storage types
      const STORAGE_TYPES = [
        {
          label: 'uint256',
          kind: monaco.languages.CompletionItemKind.Field,
          detail: 'sol_storage field',
          documentation: '256-bit unsigned integer storage field',
          insertText: 'uint256 ${1:name};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
        {
          label: 'string',
          kind: monaco.languages.CompletionItemKind.Field,
          detail: 'sol_storage field',
          documentation: 'String storage field',
          insertText: 'string ${1:name};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
        {
          label: 'mapping',
          kind: monaco.languages.CompletionItemKind.Field,
          detail: 'sol_storage field',
          documentation: 'Key-value storage mapping',
          insertText: 'mapping(${1:key_type} => ${2:value_type}) ${3:name};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
        {
          label: 'bool',
          kind: monaco.languages.CompletionItemKind.Field,
          detail: 'sol_storage field',
          documentation: 'Boolean storage field',
          insertText: 'bool ${1:name};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
      ];

      // Stylus SDK method snippets
      const METHOD_SNIPPETS = [
        {
          label: 'view_method',
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: 'View method template',
          documentation: 'Create a read-only view method',
          insertText: [
            'pub fn ${1:method_name}(&self) -> ${2:U256} {',
            '    ${3:self.value.get()}',
            '}',
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
        {
          label: 'mut_method',
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: 'Mutable method template',
          documentation: 'Create a state-changing method',
          insertText: [
            'pub fn ${1:method_name}(&mut self, ${2:value: U256}) {',
            '    ${3:self.value.set(value);}',
            '}',
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
      ];

      // Register completion provider
      monaco.languages.registerCompletionItemProvider('rust', {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          // Get the current line content
          const lineContent = model.getLineContent(position.lineNumber);
          
          // Check context for appropriate suggestions
          const suggestions = [];

          // Inside sol_storage macro
          if (lineContent.includes('sol_storage!') || lineContent.includes('struct')) {
            suggestions.push(...STORAGE_TYPES);
          }

          // Inside impl block
          if (lineContent.includes('impl')) {
            suggestions.push(...METHOD_SNIPPETS);
          }

          // Always suggest Stylus SDK types
          suggestions.push(...STYLUS_SDK_TYPES);

          return {
            suggestions: suggestions.map(item => ({
              ...item,
              range,
            })),
          };
        },
      });

      // Add hover provider for documentation
      monaco.languages.registerHoverProvider('rust', {
        provideHover: (model, position) => {
          const word = model.getWordAtPosition(position);
          if (!word) return null;

          // Find matching type or snippet
          const item = [...STYLUS_SDK_TYPES, ...STORAGE_TYPES, ...METHOD_SNIPPETS]
            .find(item => item.label === word.word);

          if (item) {
            return {
              contents: [
                { value: '```rust\n' + item.detail + '\n```' },
                { value: item.documentation as string }
              ]
            };
          }

          return null;
        }
      });
    };

    // Create completion items
    createCompletionItems();
  }
}

// Editor theme configuration
export function defineEditorTheme(monaco: typeof import('monaco-editor'), isDark: boolean) {
  monaco.editor.defineTheme('custom-theme', {
    base: isDark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: isDark ? '78DCE8' : '0550AE', fontStyle: 'bold' },
      { token: 'type', foreground: isDark ? 'FF6188' : 'CD3131' },
      { token: 'string', foreground: isDark ? 'A9DC76' : '098658' },
      { token: 'number', foreground: isDark ? 'AB9DF2' : '098658' },
      { token: 'comment', foreground: isDark ? '727072' : '008000', fontStyle: 'italic' },
      { token: 'macro', foreground: isDark ? 'FC9867' : 'AF00DB' },
      { token: 'function', foreground: isDark ? 'A9DC76' : '795E26' },
      { token: 'variable', foreground: isDark ? 'F8F8F2' : '001080' },
      { token: 'operator', foreground: isDark ? 'FF6188' : '000000' },
    ],
    colors: {
      'editor.background': isDark ? '#18181B' : '#ffffff',
      'editor.foreground': isDark ? '#F8F8F2' : '#000000',
      'editorCursor.foreground': isDark ? '#F8F8F2' : '#000000',
      'editor.lineHighlightBackground': isDark ? '#27272A' : '#f8f9fa',
      'editor.selectionBackground': isDark ? '#3F3F46' : '#add6ff80',
      'editor.inactiveSelectionBackground': isDark ? '#3F3F46' : '#e5ebf1',
      'editorLineNumber.foreground': isDark ? '#52525B' : '#6e7681',
      'editorLineNumber.activeForeground': isDark ? '#E4E4E7' : '#24292f',
      'editorIndentGuide.background': isDark ? '#27272A' : '#f6f8fa',
      'editorIndentGuide.activeBackground': isDark ? '#3F3F46' : '#d0d7de',
      'editorWidget.background': isDark ? '#27272A' : '#f6f8fa',
      'editorWidget.border': isDark ? '#3F3F46' : '#d0d7de',
      'editorSuggestWidget.background': isDark ? '#27272A' : '#ffffff',
      'editorSuggestWidget.border': isDark ? '#3F3F46' : '#d0d7de',
      'editorSuggestWidget.selectedBackground': isDark ? '#3F3F46' : '#0969da1a',
      'editorSuggestWidget.highlightForeground': isDark ? '#A9DC76' : '#0969da',
      'list.hoverBackground': isDark ? '#3F3F46' : '#0969da1a',
      'list.activeSelectionBackground': isDark ? '#52525B' : '#0969da1a',
      'scrollbarSlider.background': isDark ? '#3F3F4680' : '#8c959f33',
      'scrollbarSlider.hoverBackground': isDark ? '#52525B80' : '#8c959f47',
      'scrollbarSlider.activeBackground': isDark ? '#71717A80' : '#8c959f66',
      'minimap.background': isDark ? '#18181B' : '#f6f8fa',
    }
  });
}

// Editor options
export const defaultEditorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 4,
  insertSpaces: true,
  formatOnPaste: true,
  formatOnType: true,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  renderLineHighlight: 'all',
  roundedSelection: true,
  smoothScrolling: true,
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  padding: { top: 16, bottom: 16 },
  folding: true,
  foldingHighlight: true,
  showFoldingControls: 'always',
  matchBrackets: 'always',
  renderWhitespace: 'selection',
  suggest: {
    snippetsPreventQuickSuggestions: false,
    showIcons: true,
    showStatusBar: true,
    preview: true,
  },
};