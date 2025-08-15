import { useState, useEffect } from 'react';
import MonacoEditor from "@monaco-editor/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { FileJson, FileCode, Copy, Download, Maximize2, Minimize2 } from 'lucide-react';
import { useTheme } from 'next-themes';

interface AbiViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  abiJson?: any;
  abiSolidity?: string;
  compilationId?: string;
  projectName?: string;
}

export function AbiViewerModal({ 
  open, 
  onOpenChange, 
  abiJson, 
  abiSolidity,
  compilationId,
  projectName = "Contract"
}: AbiViewerModalProps) {
  const [activeTab, setActiveTab] = useState<'json' | 'solidity'>('json');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toast } = useToast();
  const { theme, systemTheme } = useTheme();
  
  const effectiveTheme = theme === 'system' ? systemTheme : theme;
  const monacoTheme = effectiveTheme === 'dark' ? 'vs-dark' : 'vs-light';

  // Format JSON for display
  const formattedJson = abiJson 
    ? JSON.stringify(abiJson, null, 2)
    : '// No ABI available';

  const solidityContent = abiSolidity || '// No Solidity interface available';

  const handleCopy = async () => {
    const content = activeTab === 'json' ? formattedJson : solidityContent;
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied to clipboard",
        description: `${activeTab === 'json' ? 'JSON' : 'Solidity'} ABI copied successfully`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const content = activeTab === 'json' ? formattedJson : solidityContent;
    const filename = activeTab === 'json' 
      ? `${projectName}_abi.json`
      : `${projectName}_interface.sol`;
    
    const blob = new Blob([content], { 
      type: activeTab === 'json' ? 'application/json' : 'text/plain' 
    });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: `${filename} is being downloaded`,
    });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const dialogClass = isFullscreen 
    ? "fixed inset-4 max-w-none h-[calc(100vh-2rem)]" 
    : "sm:max-w-4xl";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogClass}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              ABI Viewer
              {compilationId && (
                <span className="text-sm text-muted-foreground">
                  (Compilation {compilationId.slice(0, 8)})
                </span>
              )}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="h-8 w-8"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
          <DialogDescription>
            View and export your contract's Application Binary Interface
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'json' | 'solidity')}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid w-[400px] grid-cols-2">
              <TabsTrigger value="json" className="flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                JSON Format
              </TabsTrigger>
              <TabsTrigger value="solidity" className="flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                Solidity Interface
              </TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>

          <TabsContent value="json" className="mt-0">
            <div className={`border rounded-md overflow-hidden ${isFullscreen ? 'h-[calc(100vh-16rem)]' : 'h-[400px]'}`}>
              <MonacoEditor
                height="100%"
                language="json"
                theme={monacoTheme}
                value={formattedJson}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: 'on',
                  folding: true,
                  wordWrap: 'on',
                  automaticLayout: true,
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="solidity" className="mt-0">
            <div className={`border rounded-md overflow-hidden ${isFullscreen ? 'h-[calc(100vh-16rem)]' : 'h-[400px]'}`}>
              <MonacoEditor
                height="100%"
                language="sol"
                theme={monacoTheme}
                value={solidityContent}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: 'on',
                  folding: true,
                  wordWrap: 'on',
                  automaticLayout: true,
                }}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {abiJson && (
                <span>
                  {Array.isArray(abiJson) ? abiJson.length : 0} functions/events
                </span>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}