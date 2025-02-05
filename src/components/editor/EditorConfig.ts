import * as monaco from 'monaco-editor';

// Language configuration for Rust
const languageConfig: monaco.languages.LanguageConfiguration = {
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
    increaseIndentPattern: /^.*\{[^}"']*$|^\s*(pub\s+)?(fn|mod|impl|struct|enum|match)\s*.*$/,
    decreaseIndentPattern: /^(.*\*\/)?\s*\}.*$/,
  },
  onEnterRules: [
    {
      beforeText: /^\s*\/\/.*$/,
      action: { indentAction: monaco.languages.IndentAction.None, appendText: '// ' }
    },
    {
      beforeText: /^.*\{[^}"']*$/,
      action: { indentAction: monaco.languages.IndentAction.Indent }
    },
    {
      beforeText: /^\s*(pub\s+)?(fn|mod|impl|struct|enum|match)\s*.*$/,
      action: { indentAction: monaco.languages.IndentAction.Indent }
    }
  ],
  folding: {
    markers: {
      start: new RegExp('^\\s*#\\s*region\\b'),
      end: new RegExp('^\\s*#\\s*endregion\\b')
    }
  },
  wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g
};

// Initialize Monaco with Rust support
export function initializeMonaco() {
  // Register Rust language if not already registered
  if (!monaco.languages.getLanguages().some(lang => lang.id === 'rust')) {
    monaco.languages.register({ id: 'rust' });
    monaco.languages.setLanguageConfiguration('rust', languageConfig);

    // Rust syntax highlighting
    monaco.languages.setMonarchTokensProvider('rust', {
      defaultToken: '',
      tokenPostfix: '.rust',

      keywords: [
        'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn',
        'else', 'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in',
        'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return',
        'self', 'Self', 'static', 'struct', 'super', 'trait', 'true', 'type',
        'unsafe', 'use', 'where', 'while', 'try', 'box', 'union',
      ],

      typeKeywords: [
        'bool', 'u8', 'u16', 'u32', 'u64', 'u128', 'i8', 'i16', 'i32', 'i64',
        'i128', 'f32', 'f64', 'usize', 'isize', 'str', 'char', 'Vec', 'String',
        'Option', 'Result', 'Box',
      ],

      operators: [
        '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
        '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
        '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
        '%=', '<<=', '>>=', '>>>=', '=>',
      ],

      symbols: /[=><!~?:&|+\-*\/\^%]+/,

      escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

      tokenizer: {
        root: [
          // Identifiers and keywords
          [/[a-z_$][\w$]*/, {
            cases: {
              '@typeKeywords': 'keyword.type',
              '@keywords': 'keyword',
              '@default': 'identifier',
            },
          }],

          // Whitespace
          { include: '@whitespace' },

          // Delimiters and operators
          [/[{}()\[\]]/, '@brackets'],
          [/[<>](?!@symbols)/, '@brackets'],
          [/@symbols/, {
            cases: {
              '@operators': 'operator',
              '@default': '',
            },
          }],

          // Numbers
          [/\d*\.\d+([eE][\-+]?\d+)?[fFdD]?/, 'number.float'],
          [/0[xX][0-9a-fA-F_]*[0-9a-fA-F][Ll]?/, 'number.hex'],
          [/0[oO][0-7_]*[0-7][Ll]?/, 'number.octal'],
          [/0[bB][0-1_]*[0-1][Ll]?/, 'number.binary'],
          [/\d+[lL]?/, 'number'],

          // Strings
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],

          // Characters
          [/'[^\\']'/, 'string'],
          [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
          [/'/, 'string.invalid'],

          // Lifetime annotations
          [/'[a-zA-Z_]\w*\b/, 'lifetime'],
        ],

        comment: [
          [/[^\/*]+/, 'comment'],
          [/\/\*/, 'comment', '@push'],
          ["\\*/", 'comment', '@pop'],
          [/[\/*]/, 'comment'],
        ],

        string: [
          [/[^\\"]+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
        ],

        whitespace: [
          [/[ \t\r\n]+/, 'white'],
          [/\/\*/, 'comment', '@comment'],
          [/\/\/.*$/, 'comment'],
        ],
      },
    });
  }
}