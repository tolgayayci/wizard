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
import { BarChart3, Loader2, FileText, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '@/lib/config';

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
  suggestions: string[];
}

export function WasmAnalysisModal({ open, onOpenChange, projectId }: WasmAnalysisModalProps) {
  const [analysisResult, setAnalysisResult] = useState<WasmAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

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
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Original Size</span>
                  </div>
                  <p className="text-2xl font-bold">{formatBytes(analysisResult.original_size)}</p>
                </div>

                {analysisResult.optimized_size && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Optimized Size</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {formatBytes(analysisResult.optimized_size)}
                    </p>
                  </div>
                )}

                {getSavingsPercentage() && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Potential Savings</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                      {getSavingsPercentage()!.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>

              {/* Optimization Suggestions */}
              {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Optimization Suggestions
                  </h4>
                  <div className="space-y-2">
                    {analysisResult.suggestions.map((suggestion, index) => (
                      <Alert key={index}>
                        <AlertDescription className="text-sm">
                          {suggestion}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Analysis Details */}
              {analysisResult.size_analysis && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Code Size Breakdown
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                      {analysisResult.size_analysis}
                    </pre>
                  </div>
                </div>
              )}

              {/* Optimization Info */}
              {analysisResult.optimization_info && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Optimization Details
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                      {analysisResult.optimization_info}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}