import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Terminal as TerminalIcon, X, Maximize2, Minimize2 } from 'lucide-react';
import { WS_URL } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';
import 'xterm/css/xterm.css';

interface TerminalProps {
  userId: string;
  projectId: string;
  className?: string;
  onClose?: () => void;
}

export function Terminal({ userId, projectId, className, onClose }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Connect to WebSocket
    connectWebSocket();

    // Handle terminal input
    term.onData((data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && sessionId) {
        wsRef.current.send(
          JSON.stringify({
            command: data,
            session_id: sessionId,
          })
        );
      }
    });

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      wsRef.current?.close();
      term.dispose();
    };
  }, [userId, projectId]);

  const connectWebSocket = () => {
    const ws = new WebSocket(`${WS_URL}/ws/terminal?user_id=${userId}&project_id=${projectId}`);
    
    ws.onopen = () => {
      setIsConnected(true);
      if (xtermRef.current) {
        xtermRef.current.writeln('Connecting to terminal...');
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'init') {
          setSessionId(data.session_id);
          if (xtermRef.current) {
            xtermRef.current.clear();
            xtermRef.current.writeln('Terminal connected. Type your commands below:');
            xtermRef.current.writeln('');
            xtermRef.current.write('$ ');
          }
        } else if (data.type === 'error') {
          if (xtermRef.current) {
            xtermRef.current.writeln(`\r\nError: ${data.message}`);
            xtermRef.current.write('$ ');
          }
        } else if (data.output) {
          if (xtermRef.current) {
            // Process the output to handle special characters
            const lines = data.output.split('\n');
            lines.forEach((line: string, index: number) => {
              if (index > 0) xtermRef.current?.write('\r\n');
              xtermRef.current?.write(line);
            });
            xtermRef.current.write('\r\n$ ');
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
        xtermRef.current.writeln('\r\nConnection error. Please try again.');
      }
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to terminal server',
        variant: 'destructive',
      });
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (xtermRef.current) {
        xtermRef.current.writeln('\r\nTerminal disconnected.');
      }
    };

    wsRef.current = ws;
  };

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.write('$ ');
    }
  };

  const handleReconnect = () => {
    wsRef.current?.close();
    connectWebSocket();
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
    setTimeout(() => {
      fitAddonRef.current?.fit();
    }, 100);
  };

  return (
    <div
      className={cn(
        'flex flex-col bg-background border rounded-lg overflow-hidden',
        isMaximized ? 'fixed inset-4 z-50' : 'relative',
        className
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-muted border-b">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Terminal</span>
          {isConnected ? (
            <span className="text-xs text-green-500">● Connected</span>
          ) : (
            <span className="text-xs text-red-500">● Disconnected</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isConnected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReconnect}
              className="h-7 px-2 text-xs"
            >
              Reconnect
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 px-2 text-xs"
          >
            Clear
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleMaximize}
          >
            {isMaximized ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      <div
        ref={terminalRef}
        className="flex-1 p-2"
        style={{ minHeight: isMaximized ? 'calc(100vh - 8rem)' : '400px' }}
      />
    </div>
  );
}