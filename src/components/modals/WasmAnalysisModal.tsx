import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { BarChart3, Loader2, FileText, Zap, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '@/lib/config';
import AnsiToHtml from 'ansi-to-html';

interface WasmAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

interface WasmAnalysisResult {
  original_size: number;
  optimized_size?: number;
  size_analysis: string;
  optimization_info: string;
  arbitrum_compliance: string;
  suggestions: string[];
}

export function WasmAnalysisModal({ open, onOpenChange, projectId }: WasmAnalysisModalProps) {
  const [analysisResult, setAnalysisResult] = useState<WasmAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  // ANSI to HTML converter for terminal output
  const ansiConverter = new AnsiToHtml({
    fg: '#f8f8f2',
    bg: 'transparent',
    newline: true,
    escapeXML: true,
  });

  const handleAnalyze = async () => {
    if (!projectId) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      const response = await axios.post(`${API_URL}/api/download/analyze-wasm`, {
        user_id: user.id,
        project_id: projectId,
      });

      if (response.data.success) {
        setAnalysisResult(response.data.data);
        toast({
          title: "Analysis Complete",
          description: "WASM binary analysis completed successfully",
        });
      } else {
        throw new Error("Failed to analyze WASM binary");
      }
    } catch (error) {
      console.error('WASM analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze WASM binary",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSavingsPercentage = (): number | null => {
    if (!analysisResult?.optimized_size) return null;
    const savings = analysisResult.original_size - analysisResult.optimized_size;
    return (savings / analysisResult.original_size) * 100;
  };

  const handleDownloadWasm = async () => {
    if (!projectId) return;

    setIsDownloading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      const response = await axios.post(`${API_URL}/api/download/wasm`, {
        user_id: user.id,
        project_id: projectId,
      });

      if (response.data.success) {
        const { filename, content } = response.data.data;
        
        // Convert base64 to blob and download
        const binaryString = atob(content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/wasm' });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Download Complete",
          description: `Downloaded ${filename} successfully`,
        });
      } else {
        throw new Error(response.data.message || "Failed to download WASM");
      }
    } catch (error) {
      console.error('WASM download error:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download WASM binary",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            WASM Binary Analysis
          </DialogTitle>
          <DialogDescription>
            Analyze your compiled WASM binary for size optimization and performance insights.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {!analysisResult && !isAnalyzing && (
            <div className="text-center py-8">
              <div className="inline-flex p-4 bg-primary/10 rounded-lg mb-4">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Ready to Analyze</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Click "Analyze" to get insights about your WASM binary's size, optimization opportunities, and performance recommendations.
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="text-center py-8">
              <div className="inline-flex p-4 bg-primary/10 rounded-lg mb-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <h3 className="font-medium mb-2">Analyzing WASM Binary</h3>
              <p className="text-sm text-muted-foreground">
                Running size analysis and optimization checks...
              </p>
            </div>
          )}

          {analysisResult && (
            <div className="space-y-6">
              {/* Size Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg bg-muted/20">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Original Size</span>
                  </div>
                  <p className="text-2xl font-bold">{formatBytes(analysisResult.original_size)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Compiled WASM binary</p>
                </div>

                {analysisResult.optimized_size && (
                  <div className="p-4 border rounded-lg bg-green-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Optimized Size</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {formatBytes(analysisResult.optimized_size)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">After wasm-opt -Os</p>
                  </div>
                )}

                {getSavingsPercentage() && (
                  <div className="p-4 border rounded-lg bg-blue-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Potential Savings</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                      {getSavingsPercentage()!.toFixed(1)}%
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {formatBytes(analysisResult.original_size - analysisResult.optimized_size!)} smaller
                    </p>
                  </div>
                )}
              </div>

              {/* Optimization Suggestions */}
              <div>
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  {analysisResult.suggestions && analysisResult.suggestions.length > 0 ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Optimization Suggestions
                      <Badge variant="secondary" className="ml-2">
                        {analysisResult.suggestions.length} tips
                      </Badge>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Optimization Status
                      <Badge variant="default" className="ml-2 bg-green-500">
                        Well Optimized
                      </Badge>
                    </>
                  )}
                </h4>
                
                {analysisResult.suggestions && analysisResult.suggestions.length > 0 ? (
                  <div className="space-y-3">
                    {analysisResult.suggestions.map((suggestion, index) => (
                      <Alert key={index} className="border-2">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
                            <span className="text-xs font-semibold text-amber-700">{index + 1}</span>
                          </div>
                          <AlertDescription className="text-sm leading-relaxed">
                            {suggestion}
                          </AlertDescription>
                        </div>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <Alert className="border-2 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
                    <div className="flex gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <AlertDescription className="text-sm">
                        Your WASM binary is already well optimized! No specific recommendations at this time.
                        Consider using <code className="bg-muted px-1.5 py-0.5 rounded text-xs">wasm-opt -Os</code> for further size optimization.
                      </AlertDescription>
                    </div>
                  </Alert>
                )}
              </div>

              {/* Arbitrum Compliance Check */}
              {analysisResult.arbitrum_compliance && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    {analysisResult.arbitrum_compliance.includes('PASSED') ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : analysisResult.arbitrum_compliance.includes('FAILED') ? (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                    Arbitrum Deployment Check
                  </h4>
                  <div className={`rounded-lg p-4 border-2 ${
                    analysisResult.arbitrum_compliance.includes('PASSED') 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : analysisResult.arbitrum_compliance.includes('FAILED')
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                      : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                  }`}>
                    <div 
                      className={`text-xs font-mono whitespace-pre-wrap overflow-x-auto ${
                        analysisResult.arbitrum_compliance.includes('PASSED')
                          ? 'text-green-700 dark:text-green-300'
                          : analysisResult.arbitrum_compliance.includes('FAILED')
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-amber-700 dark:text-amber-300'
                      }`}
                      dangerouslySetInnerHTML={{ 
                        __html: ansiConverter.toHtml(analysisResult.arbitrum_compliance) 
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    cargo stylus check validates contract size and deployment gas requirements for Arbitrum.
                  </p>
                </div>
              )}

              {/* Size Analysis Details */}
              {analysisResult.size_analysis && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    Code Size Breakdown (Twiggy Analysis)
                  </h4>
                  <div className="bg-muted/30 rounded-lg p-4 border">
                    <div 
                      className="text-xs font-mono whitespace-pre-wrap overflow-x-auto text-muted-foreground"
                      dangerouslySetInnerHTML={{ 
                        __html: ansiConverter.toHtml(analysisResult.size_analysis) 
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This shows which functions and data contribute most to your binary size.
                  </p>
                </div>
              )}

              {/* Optimization Info */}
              {analysisResult.optimization_info && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-500" />
                    Optimization Results (wasm-opt)
                  </h4>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <div 
                      className="text-xs font-mono whitespace-pre-wrap overflow-x-auto text-green-700 dark:text-green-300"
                      dangerouslySetInnerHTML={{ 
                        __html: ansiConverter.toHtml(analysisResult.optimization_info) 
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Output from wasm-opt showing optimization passes and resulting size reduction.
                  </p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-col gap-3 sm:flex-row sm:gap-2">
          <div className="flex gap-2 flex-1">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {analysisResult && (
              <Button
                onClick={handleDownloadWasm}
                disabled={isDownloading}
                variant="default"
                className="gap-2"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download WASM
                  </>
                )}
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            {!analysisResult && (
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4" />
                    Analyze
                  </>
                )}
              </Button>
            )}
            {analysisResult && (
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                variant="outline"
                className="gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Re-analyzing...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4" />
                    Re-analyze
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}