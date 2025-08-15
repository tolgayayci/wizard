import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { CompilationResult } from '@/lib/types';
import { Terminal as TerminalIcon, RefreshCw, Trash2, Copy, Check, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WS_URL } from '@/lib/config';
import { useTheme } from 'next-themes';
import 'xterm/css/xterm.css';

interface TerminalProps {
  result?: CompilationResult | null;
  isCompiling?: boolean;
  projectId?: string;
  userId?: string;
  isSharedView?: boolean;
  onCommandComplete?: () => void;
}

export interface TerminalRef {
  executeCommand: (command: string) => boolean;
}

export const Terminal = forwardRef<TerminalRef, TerminalProps>((props, ref) => {
  const { 
    result, 
    isCompiling, 
    projectId,
    userId,
    isSharedView = false,
    onCommandComplete,
  } = props;
  // Terminal state
  const terminalRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const commandBufferRef = useRef<string>('');
  const sessionIdRef = useRef<string | null>(null);
  const terminalBufferRef = useRef<string[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const { theme, systemTheme } = useTheme();
  const [versions] = useState({
    rust: 'v1.75.0',
    rustup: 'v1.26.0',
    cargoStylus: 'v0.6.1',
  });
  
  // Get effective theme
  const effectiveTheme = theme === 'system' ? systemTheme : theme;
  const isDark = effectiveTheme === 'dark';


  // Focus terminal when clicking on container
  const focusTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.focus();
    }
  };

  // Clear terminal function
  const clearTerminal = () => {
    if (xtermRef.current && (sessionId || sessionIdRef.current)) {
      // Clear the terminal buffer completely
      xtermRef.current.clear();
      // Clear command buffer
      commandBufferRef.current = '';
      // Clear terminal buffer history
      terminalBufferRef.current = [];
      // Focus terminal
      xtermRef.current.focus();
      // Don't write prompt - let the normal flow handle it
    }
  };

  // Copy terminal content
  const copyTerminalContent = async () => {
    if (xtermRef.current) {
      try {
        const selection = xtermRef.current.getSelection();
        if (selection) {
          // Copy selected text
          await navigator.clipboard.writeText(selection);
        } else {
          // Copy all terminal content if nothing selected
          const buffer = [];
          const lineCount = xtermRef.current.buffer.active.length;
          for (let i = 0; i < lineCount; i++) {
            const line = xtermRef.current.buffer.active.getLine(i);
            if (line) {
              const lineText = line.translateToString(true);
              if (lineText.trim()) { // Only include non-empty lines
                buffer.push(lineText);
              }
            }
          }
          await navigator.clipboard.writeText(buffer.join('\n'));
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        // Fallback for older browsers
        try {
          const selection = xtermRef.current.getSelection();
          const textArea = document.createElement('textarea');
          textArea.value = selection || '';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (fallbackError) {
          console.error('Fallback copy failed:', fallbackError);
        }
      }
    }
  };

  // Refresh terminal function
  const refreshTerminal = async () => {
    if (isReconnecting) return;
    
    setIsReconnecting(true);
    
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Clear terminal
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
    
    // Reset state but keep refs for new connection
    setIsConnected(false);
    setSessionId(null);
    sessionIdRef.current = null;
    commandBufferRef.current = '';
    
    // Reconnect after a short delay
    setTimeout(() => {
      connectWebSocket();
      setIsReconnecting(false);
    }, 500);
  };

  // Initialize terminal on mount (without theme - will be set separately)
  useEffect(() => {
    if (terminalRef.current && !xtermRef.current && userId && projectId && !isSharedView) {
      // Initialize xterm.js without theme colors initially
      const term = new XTerm({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        scrollback: 5000,
        convertEol: true,
        allowTransparency: false,
        disableStdin: false,
        cursorStyle: 'block',
        rightClickSelectsWord: true,
        allowProposedApi: true,
        selectToCopy: false, // Keep manual copy control
        windowsMode: false, // Ensure proper selection behavior
        macOptionIsMeta: true, // Better Mac compatibility
        altClickMovesCursor: false, // Don't interfere with selection
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      term.open(terminalRef.current);
      
      // Apply initial theme
      applyTerminalTheme(term, isDark);
      
      // Initial fit with a small delay to ensure DOM is ready
      setTimeout(() => {
        try {
          fitAddon.fit();
          term.focus();
        } catch (e) {
          console.error('Error during initial fit:', e);
        }
      }, 100);

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;
      setIsInitialized(true);

      // Connect to WebSocket
      connectWebSocket();

      // Handle terminal input
      term.onData((data) => {
        // Don't interfere with Ctrl+C for copying when text is selected
        if (data === '\x03' && term.hasSelection()) {
          const selection = term.getSelection();
          if (selection) {
            navigator.clipboard.writeText(selection).catch(() => {
              // Fallback for older browsers
              document.execCommand('copy');
            });
          }
          return;
        }
        
        // Always use sessionIdRef.current which should be the most up-to-date
        const currentSessionId = sessionIdRef.current;
        
        if (!currentSessionId || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          // If not connected yet, show a message
          if (data === '\r') {
            term.write('\r\n\x1b[33mConnecting to terminal...\x1b[0m\r\n');
            console.log('No session available:', { currentSessionId, wsReady: wsRef.current?.readyState === WebSocket.OPEN });
          }
          return;
        }
        
        // Handle special keys
        if (data === '\r') { // Enter key
          // Send the complete command
          if (commandBufferRef.current.trim()) {
            const payload = {
              command: commandBufferRef.current,
              session_id: currentSessionId,
            };
            console.log('Sending command:', payload);
            wsRef.current.send(JSON.stringify(payload));
          }
          commandBufferRef.current = '';
        } else if (data === '\x7f') { // Backspace
          if (commandBufferRef.current.length > 0) {
            commandBufferRef.current = commandBufferRef.current.slice(0, -1);
            term.write('\b \b');
          }
        } else if (data === '\x03') { // Ctrl+C
          commandBufferRef.current = '';
          term.write('^C\r\n$ ');
        } else if (data.charCodeAt(0) >= 32 && data.charCodeAt(0) < 127) { // Printable characters
          commandBufferRef.current += data;
          // Write input in bold
          term.write(`\x1b[1m${data}\x1b[0m`);
        }
      });

      // Handle window resize with debounce
      let resizeTimeout: NodeJS.Timeout;
      const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          if (fitAddonRef.current && xtermRef.current) {
            try {
              fitAddonRef.current.fit();
            } catch (e) {
              console.error('Error fitting terminal:', e);
            }
          }
        }, 100);
      };
      
      window.addEventListener('resize', handleResize);
      
      // Observe container resize
      const resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        clearTimeout(resizeTimeout);
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
        
        // Clear reconnection timeout if exists
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        wsRef.current?.close();
        term.dispose();
        xtermRef.current = null;
        setIsInitialized(false);
        setIsConnected(false);
        setSessionId(null);
        sessionIdRef.current = null;
        terminalBufferRef.current = [];
        reconnectAttemptsRef.current = 0;
      };
    }
  }, [userId, projectId, isSharedView]); // Terminal only created once, theme updates handled separately

  // Helper function to apply theme to terminal
  const applyTerminalTheme = (term: XTerm, dark: boolean) => {
    term.options.theme = dark ? {
      background: '#09090b',
      foreground: '#fafafa',
      cursor: '#fafafa',
      selection: '#3b82f680', // Semi-transparent blue for dark theme
      black: '#09090b',
      red: '#ef4444',
      green: '#22c55e',
      yellow: '#eab308',
      blue: '#3b82f6',
      magenta: '#a855f7',
      cyan: '#06b6d4',
      white: '#fafafa',
      brightBlack: '#52525b',
      brightRed: '#f87171',
      brightGreen: '#4ade80',
      brightYellow: '#fde047',
      brightBlue: '#60a5fa',
      brightMagenta: '#c084fc',
      brightCyan: '#22d3ee',
      brightWhite: '#ffffff',
    } : {
      background: '#ffffff',
      foreground: '#09090b',
      cursor: '#09090b',
      selection: '#2563eb60', // Semi-transparent darker blue for light theme
      black: '#ffffff',
      red: '#dc2626',
      green: '#16a34a',
      yellow: '#ca8a04',
      blue: '#2563eb',
      magenta: '#9333ea',
      cyan: '#0891b2',
      white: '#09090b',
      brightBlack: '#a1a1aa',
      brightRed: '#ef4444',
      brightGreen: '#22c55e',
      brightYellow: '#eab308',
      brightBlue: '#3b82f6',
      brightMagenta: '#a855f7',
      brightCyan: '#06b6d4',
      brightWhite: '#18181b',
    };
  };

  // Handle theme changes separately - only update colors, don't recreate terminal
  useEffect(() => {
    if (xtermRef.current && isInitialized) {
      applyTerminalTheme(xtermRef.current, isDark);
    }
  }, [isDark, isInitialized]);

  // Track if we've shown the current compilation result
  const [lastShownResult, setLastShownResult] = useState<CompilationResult | null>(null);
  
  // Handle compilation results - only show when actually compiling
  useEffect(() => {
    // Only show compilation results when we have a new result after compiling
    if (xtermRef.current && result && isInitialized && sessionId && !isCompiling) {
      // Check if this is a new result we haven't shown yet
      if (lastShownResult === result) return; // Already shown this result
      
      // Check if this is a fresh compilation (within last 10 seconds)
      const isNewCompilation = result.details?.compilation_time && 
        (Date.now() / 1000 - result.details.compilation_time) < 10;
      
      if (!isNewCompilation) return; // Don't show old compilation results
      
      setLastShownResult(result); // Mark this result as shown
      
      xtermRef.current.writeln('');
      xtermRef.current.writeln('\x1b[1;36m> cargo stylus check\x1b[0m');
      
      if (result.stdout) {
        const lines = result.stdout.split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            // Add color to compilation output
            if (line.includes('Compiling')) {
              xtermRef.current?.writeln(`\x1b[1;32m${line}\x1b[0m`);
            } else if (line.includes('Finished')) {
              xtermRef.current?.writeln(`\x1b[1;34m${line}\x1b[0m`);
            } else if (line.includes('warning')) {
              xtermRef.current?.writeln(`\x1b[1;33m${line}\x1b[0m`);
            } else {
              xtermRef.current?.writeln(line);
            }
          }
        });
      }
      
      if (result.stderr) {
        const lines = result.stderr.split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            xtermRef.current?.writeln(`\x1b[1;31m${line}\x1b[0m`);
          }
        });
      }
      
      if (result.success) {
        xtermRef.current.writeln('\x1b[1;32m✓ Compilation successful\x1b[0m');
      } else {
        xtermRef.current.writeln('\x1b[1;31m✗ Compilation failed\x1b[0m');
      }
      
      xtermRef.current.write('$ ');
    }
  }, [result, isInitialized, sessionId, isCompiling, lastShownResult]);

  // Expose executeCommand method via ref
  useImperativeHandle(ref, () => ({
    executeCommand: (command: string) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && sessionId) {
        const message = JSON.stringify({
          type: 'command',
          session_id: sessionId,
          command: command
        });
        wsRef.current.send(message);
        return true;
      }
      return false;
    }
  }), [sessionId]);

  const connectWebSocket = () => {
    if (!userId || !projectId) return;
    
    // Check if we're already connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected, skipping reconnection');
      return;
    }
    
    const ws = new WebSocket(`${WS_URL}/ws/terminal?user_id=${userId}&project_id=${projectId}`);
    
    ws.onopen = () => {
      console.log('Terminal WebSocket connected');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
      // Don't clear or write anything here, wait for init message
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'init') {
          const newSessionId = data.session_id;
          setSessionId(newSessionId);
          sessionIdRef.current = newSessionId;
          console.log('Terminal session initialized:', newSessionId);
          if (xtermRef.current) {
            // Only clear if we have buffered content to restore
            if (terminalBufferRef.current.length > 0) {
              // Restore buffered content
              xtermRef.current.clear();
              terminalBufferRef.current.forEach(line => {
                xtermRef.current?.writeln(line);
              });
              xtermRef.current.write('$ ');
            } else {
              // Fresh session - clear and add prompt
              xtermRef.current.clear();
              xtermRef.current.write('$ ');
            }
            commandBufferRef.current = '';
            // Focus terminal after connection
            setTimeout(() => {
              xtermRef.current?.focus();
            }, 100);
            
          }
        } else if (data.type === 'error') {
          if (xtermRef.current) {
            xtermRef.current.writeln(`\r\n\x1b[1;31mError: ${data.message}\x1b[0m`);
            xtermRef.current.write('$ ');
          }
        } else if (data.output) {
          if (xtermRef.current) {
            // Check if this is a clear command output
            if (data.output.includes('\x1b[2J\x1b[H')) {
              // This is a clear command - just execute it and write a new prompt
              xtermRef.current.write(data.output);
              xtermRef.current.write('$ ');
              // Clear the buffer as well
              terminalBufferRef.current = [];
              
              // Notify that command completed
              if (onCommandComplete) {
                onCommandComplete();
              }
            } else {
              // Normal command output
              xtermRef.current.write('\r\n');
              
              // Check if output is empty
              if (data.output.trim()) {
                const lines = data.output.split('\n');
                lines.forEach((line: string, index: number) => {
                  if (index > 0) xtermRef.current?.write('\r\n');
                  // The output already contains ANSI color codes from the backend
                  // Just write it directly to preserve all colors
                  xtermRef.current?.write(line);
                  // Buffer the line for potential reconnection
                  terminalBufferRef.current.push(line);
                });
                if (!data.output.endsWith('\n')) {
                  xtermRef.current.write('\r\n');
                }
              }
              
              // Write prompt for next command
              xtermRef.current.write('$ ');
              
              // Notify that command completed
              if (onCommandComplete) {
                onCommandComplete();
              }
            }
            
            // Limit buffer size to prevent memory issues
            if (terminalBufferRef.current.length > 1000) {
              terminalBufferRef.current = terminalBufferRef.current.slice(-800);
            }
          }
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      if (xtermRef.current) {
        xtermRef.current.writeln('\r\n\x1b[1;31mConnection error. Click refresh to reconnect.\x1b[0m');
      }
    };

    ws.onclose = () => {
      console.log('Terminal WebSocket disconnected');
      setIsConnected(false);
      // Don't clear sessionId here - we might reconnect
      
      if (xtermRef.current && !isReconnecting) {
        // Auto-reconnect logic
        if (reconnectAttemptsRef.current < 3) {
          reconnectAttemptsRef.current++;
          xtermRef.current.writeln('\r\n\x1b[1;33mConnection lost. Attempting to reconnect...\x1b[0m');
          
          // Clear any existing timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          // Attempt reconnection after a delay
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isConnected && userId && projectId) {
              connectWebSocket();
            }
          }, 2000 * reconnectAttemptsRef.current); // Exponential backoff
        } else {
          xtermRef.current.writeln('\r\n\x1b[1;31mTerminal disconnected. Click refresh to reconnect.\x1b[0m');
          setSessionId(null);
          sessionIdRef.current = null;
        }
      }
    };

    wsRef.current = ws;
  };

  if (isSharedView) {
    return (
      <div className="h-full flex items-center justify-center bg-background border rounded-md">
        <div className="text-center">
          <div className="inline-flex p-3 bg-primary/10 rounded-lg mb-4">
            <TerminalIcon className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-medium mb-2">Terminal Not Available</h3>
          <p className="text-sm text-muted-foreground">
            Terminal is disabled in shared view mode
          </p>
        </div>
      </div>
    );
  }

  if (!userId || !projectId) {
    return (
      <div className="h-full flex items-center justify-center bg-background border rounded-md">
        <div className="text-center">
          <div className="inline-flex p-3 bg-primary/10 rounded-lg mb-4">
            <TerminalIcon className="h-6 w-6 text-primary animate-pulse" />
          </div>
          <h3 className="font-medium mb-2">Terminal</h3>
          <p className="text-sm text-muted-foreground">
            Terminal will be available when a project is loaded
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background border rounded-md overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/40">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Terminal</span>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 
            isReconnecting ? 'bg-yellow-500 animate-pulse' : 
            'bg-red-500'
          }`} />
          <span className="text-xs text-muted-foreground">
            {isConnected ? 'Connected' : isReconnecting ? 'Reconnecting...' : 'Disconnected'}
          </span>
          {isCompiling && (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-xs text-primary font-medium">Running...</span>
            </>
          )}
          
          {/* Version Information */}
          {isConnected && (
            <div className="flex items-center gap-1 ml-1">
              <div className="h-4 w-px bg-border" />
              <Info className="h-3 w-3 text-muted-foreground ml-2" />
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-5 font-mono">
                  rust {versions.rust}
                </Badge>
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-5 font-mono">
                  rustup {versions.rustup}
                </Badge>
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-5 font-mono">
                  cargo-stylus {versions.cargoStylus}
                </Badge>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyTerminalContent}
            disabled={!isConnected}
            className="h-7 px-2"
            title="Copy terminal content"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span className="ml-1 text-xs">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span className="ml-1 text-xs">Copy</span>
              </>
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={clearTerminal}
            disabled={!isConnected || isReconnecting}
            className="h-7 px-2"
            title="Clear terminal"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="ml-1 text-xs">Clear</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshTerminal}
            disabled={isReconnecting}
            className="h-7 px-2"
            title="Refresh connection"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
            <span className="ml-1 text-xs">Refresh</span>
          </Button>
          
        </div>
      </div>
      
      {/* Terminal Content - properly constrained */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-hidden ${isDark ? 'bg-zinc-950' : 'bg-white'}`}
        onClick={() => {
          // Only focus if no text is selected
          if (!xtermRef.current?.hasSelection()) {
            focusTerminal();
          }
        }}
        style={{ cursor: 'text', minHeight: 0 }}
      >
        <div 
          ref={terminalRef} 
          className="h-full w-full p-2"
          style={{ 
            overflow: 'hidden'
          }}
        />
      </div>
    </div>
  );
});