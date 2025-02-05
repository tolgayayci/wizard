import { Badge } from '@/components/ui/badge';
import { CompilationResult } from '@/lib/types';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface CompilationStatusProps {
  result?: CompilationResult;
  isCompiling: boolean;
}

export function CompilationStatus({ result, isCompiling }: CompilationStatusProps) {
  if (isCompiling) {
    return (
      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">
        <Clock className="w-3 h-3 mr-1 animate-spin" />
        Compiling...
      </Badge>
    );
  }

  if (!result) {
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground">
        Not compiled
      </Badge>
    );
  }

  return result.success ? (
    <Badge variant="outline" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
      <CheckCircle className="w-3 h-3 mr-1" />
      Compilation successful
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-red-500/10 text-red-500 hover:bg-red-500/20">
      <XCircle className="w-3 h-3 mr-1" />
      Compilation failed
    </Badge>
  );
}