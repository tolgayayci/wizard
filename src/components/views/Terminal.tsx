import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { CompilationResult } from '@/lib/types';
import { Terminal as TerminalIcon, RefreshCw, Trash2, Copy, Check, Loader2, Info, WifiOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WS_URL, API_URL } from '@/lib/config';
import { useTheme } from 'next-themes';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import axios from 'axios';
import 'xterm/css/xterm.css';

interface TerminalProps {
  result?: CompilationResult | null;
  isCompiling?: boolean;
  projectId?: string;
  userId?: string;
  isSharedView?: boolean;
  onCommandComplete?: () => void;
  projectName?: string;
  isDeploying?: boolean;
  isGeneratingWasm?: boolean;
}

export interface TerminalRef {
  executeCommand: (command: string) => boolean;
  writeOutput: (output: string) => void;
}

export const Terminal = forwardRef<TerminalRef, TerminalProps>((props, ref) => {
  const { 
    result, 
    isCompiling, 
    projectId,
    userId,
    isSharedView = false,
    onCommandComplete,
    projectName = "Contract",
    isDeploying = false,
    isGeneratingWasm = false,
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
  const [backendConnectionError, setBackendConnectionError] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const commandBufferRef = useRef<string>('');
  const sessionIdRef = useRef<string | null>(null);
  const terminalBufferRef = useRef<string[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isTerminalDisabledRef = useRef(false);
  const { theme, systemTheme } = useTheme();
  const [versions, setVersions] = useState({
    rust: '...',
    rustup: '...',
    cargoStylus: '...',
  });
  
  const { toast } = useToast();
  
  // Get effective theme
  const effectiveTheme = theme === 'system' ? systemTheme : theme;
  const isDark = effectiveTheme === 'dark';
  
  // Check if terminal should be disabled - only during actual operations
  const isTerminalDisabled = isCompiling || isDeploying || isGeneratingWasm || isExecutingCommand;
  
  // Update the ref whenever the disabled state changes
  useEffect(() => {
    isTerminalDisabledRef.current = isTerminalDisabled;
  }, [isTerminalDisabled]);

  // Validate and transform user commands to ensure only cargo stylus commands are allowed
  const validateAndTransformCommand = (userCommand: string): string | null => {
    const cmd = userCommand.toLowerCase().trim();
    
    // Allowed cargo stylus subcommands (from cargo stylus help)
    const allowedCommands = [
      'new',
      'init', 
      'export-abi',
      'constructor',
      'activate', 'a', // a is alias for activate
      'cache',
      'check', 'c', // c is alias for check
      'get-initcode', 'e', // e is alias for get-initcode
      'deploy', 'd', // d is alias for deploy
      'verify', 'v', // v is alias for verify
      'cgen',
      'replay', 'r', // r is alias for replay
      'trace', 't', // t is alias for trace
      'simulate', 's', // s is alias for simulate
      'help'
    ];
    
    // If user just types a subcommand, prepend 'cargo stylus'
    if (allowedCommands.includes(cmd)) {
      return `cargo stylus ${cmd}`;
    }
    
    // If user types 'cargo stylus' + subcommand, validate the subcommand
    if (cmd.startsWith('cargo stylus ')) {
      const subcommand = cmd.substring('cargo stylus '.length).split(' ')[0];
      if (allowedCommands.includes(subcommand)) {
        return userCommand; // Return original with proper casing
      }
    }
    
    // Special case: allow clear command
    if (cmd === 'clear') {
      return 'clear';
    }
    
    // Reject everything else
    return null;
  };


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

  // Check backend health on mount (but don't show error immediately)
  useEffect(() => {
    if (userId && projectId && !isSharedView) {
      // Immediately check if backend is available but don't show error
      const checkBackend = async () => {
        try {
          const response = await axios.get(`${API_URL}/health`, { timeout: 5000 });
          if (response.status === 200) {
            setBackendConnectionError(false);
          }
          // Don't set error on health check failure - let WebSocket connection determine this
        } catch (error) {
          console.error('Backend health check failed:', error);
          // Don't immediately set error - let WebSocket connection attempt first
          // Only set error if WebSocket also fails
        }
      };
      checkBackend();
    }
  }, [userId, projectId, isSharedView]);

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
        
        // Check if terminal is disabled using ref (to get current value)
        if (isTerminalDisabledRef.current) {
          // Only allow Ctrl+C to cancel current operation
          if (data === '\x03') {
            commandBufferRef.current = '';
            term.write('^C\r\n$ ');
            setIsExecutingCommand(false);
          }
          // Ignore all other input when disabled
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
          // Prevent duplicate command execution using ref
          if (isTerminalDisabledRef.current) {
            return;
          }
          
          // Send the complete command with validation
          if (commandBufferRef.current.trim()) {
            const userCommand = commandBufferRef.current.trim();
            const validatedCommand = validateAndTransformCommand(userCommand);
            
            if (validatedCommand) {
              // Set executing flag before sending command
              setIsExecutingCommand(true);
              const payload = {
                command: validatedCommand,
                session_id: currentSessionId,
              };
              console.log('Sending validated command:', payload);
              wsRef.current.send(JSON.stringify(payload));
            } else {
              // Show available cargo stylus commands (matching cargo stylus help output)
              term.write('\r\n\x1b[1;33mAvailable commands:\x1b[0m\r\n');
              term.write('  \x1b[1;32mexport-abi\x1b[0m    Export a Solidity ABI\r\n');
              term.write('  \x1b[1;32mconstructor\x1b[0m   Print the signature of the constructor\r\n');
              term.write('  \x1b[1;32mactivate\x1b[0m      Activate an already deployed contract [aliases: a]\r\n');
              term.write('  \x1b[1;32mcache\x1b[0m         Cache a contract using the Stylus CacheManager for Arbitrum chains\r\n');
              term.write('  \x1b[1;32mcheck\x1b[0m         Check a contract [aliases: c]\r\n');
              term.write('  \x1b[1;32mget-initcode\x1b[0m  Generate and print initcode for the contract [aliases: e]\r\n');
              term.write('  \x1b[1;32mdeploy\x1b[0m        Deploy a contract [aliases: d]\r\n');
              term.write('  \x1b[1;32mverify\x1b[0m        Verify the deployment of a Stylus contract [aliases: v]\r\n');
              term.write('  \x1b[1;32mcgen\x1b[0m          Generate c code bindings for a Stylus contract\r\n');
              term.write('  \x1b[1;32mreplay\x1b[0m        Replay a transaction in gdb [aliases: r]\r\n');
              term.write('  \x1b[1;32mtrace\x1b[0m         Trace a transaction [aliases: t]\r\n');
              term.write('  \x1b[1;32msimulate\x1b[0m      Simulate a transaction [aliases: s]\r\n');
              term.write('  \x1b[1;32mhelp\x1b[0m          Print this message or the help of the given subcommand(s)\r\n');
              term.write('  \x1b[1;32mclear\x1b[0m         Clear terminal\r\n');
              term.write('\r\n\x1b[2mTip: Just type the command name (e.g., "check" runs "cargo stylus check")\x1b[0m\r\n$ ');
            }
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
  }, [userId, projectId, isSharedView, backendConnectionError]); // Terminal only created once, theme updates handled separately

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

  useEffect(() => {
    if (!isConnected || !userId || !projectId) return;
    let cancelled = false;
    axios
      .get(`${API_URL}/api/toolchain/versions`, { params: { user_id: userId, project_id: projectId } })
      .then((res) => {
        if (cancelled) return;
        const v = res.data ?? {};
        setVersions({
          rust: v.rust ? `v${v.rust}` : '?',
          rustup: v.rustup ? `v${v.rustup}` : '?',
          cargoStylus: v.cargo_stylus ? `v${v.cargo_stylus}` : '?',
        });
      })
      .catch(() => { /* leave loading state */ });
    return () => { cancelled = true; };
  }, [isConnected, userId, projectId]);
  
  // Control cursor visibility based on disabled state
  useEffect(() => {
    if (xtermRef.current) {
      // Hide cursor when terminal is disabled
      xtermRef.current.options.cursorBlink = !isTerminalDisabled;
      xtermRef.current.options.cursorStyle = isTerminalDisabled ? 'underline' : 'block';
      
      // If disabled, blur the terminal to remove focus
      if (isTerminalDisabled) {
        xtermRef.current.blur();
      } else {
        // Re-focus when enabled again
        setTimeout(() => {
          xtermRef.current?.focus();
        }, 100);
      }
    }
  }, [isTerminalDisabled]);


  // Expose executeCommand and writeOutput methods via ref
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
    },
    writeOutput: (output: string) => {
      if (xtermRef.current) {
        // Write output directly to the terminal
        xtermRef.current.writeln(''); // Add some spacing
        xtermRef.current.writeln('\x1b[1;36m> cargo stylus check\x1b[0m');
        
        // Filter to show only cargo stylus check output, not additional cargo check output
        let filteredOutput = output;
        
        // Look for common patterns that indicate additional cargo commands were run
        // and split at those points to show only the stylus check output
        const splitPatterns = [
          /error: expected `.`, `=`/,
          /error: could not compile/,
          /--> Cargo\.toml:/
        ];
        
        for (const pattern of splitPatterns) {
          const match = filteredOutput.search(pattern);
          if (match !== -1) {
            filteredOutput = filteredOutput.substring(0, match).trim();
            break;
          }
        }
        
        // Write the filtered output line by line to preserve formatting
        const lines = filteredOutput.split('\n');
        lines.forEach((line) => {
          xtermRef.current?.writeln(line);
        });
        
        // Add a new prompt after output
        xtermRef.current.write('\r\n$ ');
        
        // Clear any executing state since compilation is done
        setIsExecutingCommand(false);
      }
    }
  }), [sessionId, setIsExecutingCommand]);

  const connectWebSocket = () => {
    if (!userId || !projectId) return;
    
    // Check if we're already connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected, skipping reconnection');
      return;
    }
    
    setIsConnecting(true);
    // Don't show error immediately - only after multiple failed attempts
    
    // Set a longer timeout and only show error if this is not the first attempt
    const connectionTimeout = setTimeout(() => {
      if (!isConnected) {
        setIsConnecting(false);
        // Only show error after several failed attempts, not on first connection
        if (reconnectAttemptsRef.current > 2) {
          setBackendConnectionError(true);
        }
      }
    }, 15000); // 15 seconds timeout - give WebSocket more time
    
    const ws = new WebSocket(`${WS_URL}/ws/terminal?user_id=${userId}&project_id=${projectId}`);
    
    ws.onopen = () => {
      console.log('Terminal WebSocket connected');
      clearTimeout(connectionTimeout); // Clear the timeout on successful connection
      setIsConnected(true);
      setIsConnecting(false);
      setBackendConnectionError(false);
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
          // Clear executing flag on error
          setIsExecutingCommand(false);
        } else if (data.output) {
          if (xtermRef.current) {
            // Check if this is a clear command output
            if (data.output.includes('\x1b[2J\x1b[H')) {
              // This is a clear command - just execute it and write a new prompt
              xtermRef.current.write(data.output);
              xtermRef.current.write('$ ');
              // Clear the buffer as well
              terminalBufferRef.current = [];
              
              // Clear executing flag and notify completion
              setIsExecutingCommand(false);
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
              
              // Clear executing flag and notify completion
              setIsExecutingCommand(false);
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
      clearTimeout(connectionTimeout); // Clear the timeout on error
      setIsConnected(false);
      setIsConnecting(false);
      // Show error immediately on first connection attempt, or after 3 retries
      if (reconnectAttemptsRef.current === 0 || reconnectAttemptsRef.current >= 3) {
        setBackendConnectionError(true);
      }
      if (xtermRef.current && reconnectAttemptsRef.current >= 3) {
        xtermRef.current.writeln('\r\n\x1b[1;31mConnection error. Click refresh to reconnect.\x1b[0m');
      }
    };

    ws.onclose = () => {
      console.log('Terminal WebSocket disconnected');
      clearTimeout(connectionTimeout); // Clear the timeout on close
      setIsConnected(false);
      setIsConnecting(false);
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
          // Only show error UI after all reconnection attempts have failed
          setBackendConnectionError(true);
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
      {/* Terminal Header - Hide when backend is disconnected */}
      {!backendConnectionError && (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/40">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Cargo Stylus Terminal</span>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 
            isReconnecting ? 'bg-yellow-500 animate-pulse' : 
            'bg-red-500'
          }`} />
          <span className="text-xs text-muted-foreground">
            {isConnected ? 'Connected' : isReconnecting ? 'Reconnecting...' : 'Disconnected'}
          </span>
          {(isCompiling || isDeploying || isGeneratingWasm || isExecutingCommand) && (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-xs text-primary font-medium">
                {isCompiling ? 'Compiling...' : 
                 isDeploying ? 'Deploying...' : 
                 isGeneratingWasm ? 'Generating WASM...' : 
                 'Running...'}
              </span>
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
            disabled={!isConnected || isReconnecting || isTerminalDisabled}
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
            disabled={isReconnecting || isTerminalDisabled}
            className="h-7 px-2"
            title="Refresh connection"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
            <span className="ml-1 text-xs">Refresh</span>
          </Button>
          
        </div>
      </div>
      )}
      
      {/* Terminal Content or Error Display */}
      {backendConnectionError ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="p-2.5 bg-destructive/10 rounded-md w-fit mx-auto">
              <WifiOff className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Connection Problem</h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
                Backend connection failed.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Don't clear error here - let successful connection clear it
                reconnectAttemptsRef.current = 0; // Reset attempts for manual retry
                connectWebSocket();
              }}
              className="gap-2"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              {isConnecting ? 'Connecting...' : 'Try Again'}
            </Button>
          </div>
        </div>
      ) : (
        <div 
          ref={containerRef}
          className={`flex-1 overflow-hidden relative ${isDark ? 'bg-zinc-950' : 'bg-white'}`}
          onClick={() => {
            // Only focus if no text is selected and terminal is not disabled
            if (!xtermRef.current?.hasSelection() && !isTerminalDisabled) {
              focusTerminal();
            }
          }}
          style={{ cursor: isTerminalDisabled ? 'not-allowed' : 'text', minHeight: 0 }}
        >
          <div 
            ref={terminalRef} 
            className={`h-full w-full p-2 ${isTerminalDisabled ? 'opacity-60' : ''}`}
            style={{ 
              overflow: 'hidden'
            }}
          />
          {isTerminalDisabled && (
            <div className="absolute inset-0 flex items-end justify-start p-4 pointer-events-none">
              <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm border rounded-md px-3 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-xs font-medium">
                  {isCompiling ? 'Compiling contract...' : 
                   isDeploying ? 'Deploying contract...' : 
                   isGeneratingWasm ? 'Generating WASM...' : 
                   isExecutingCommand ? 'Running command...' : 
                   'Processing...'}
                </span>
                <span className="text-xs text-muted-foreground">(Terminal input disabled)</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});