import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle, Info } from 'lucide-react';
import { ABIMethod } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ABIMethodSignature } from './ABIMethodSignature';
import { ABIMethodTooltip } from './ABIMethodTooltip';

interface ABIMethodCardProps {
  method: ABIMethod;
  onExecute: (method: ABIMethod) => void;
  isContractVerified: boolean;
  isSharedView?: boolean;
}

export function ABIMethodCard({ 
  method, 
  onExecute, 
  isContractVerified,
  isSharedView = false,
}: ABIMethodCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getBadgeStyles = () => {
    if (method.type === 'event') return "bg-blue-500/10 text-blue-500";
    if (method.type === 'error') return "bg-red-500/10 text-red-500";
    if (method.type === 'constructor') return "bg-purple-500/10 text-purple-500";
    if (method.type === 'function') {
      if (method.stateMutability === 'view' || method.stateMutability === 'pure') {
        return "bg-green-500/10 text-green-500";
      }
      if (method.stateMutability === 'nonpayable') {
        return "bg-orange-500/10 text-orange-500";
      }
      if (method.stateMutability === 'payable') {
        return "bg-yellow-500/10 text-yellow-500";
      }
    }
    return "";
  };

  return (
    <div
      className={cn(
        "group relative border rounded-lg p-3 transition-colors",
        isContractVerified ? "hover:border-primary/50" : "opacity-50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">
              {method.name || 'constructor'}
            </span>
            <ABIMethodTooltip method={method}>
              <div className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                getBadgeStyles()
              )}>
                {method.type === 'function' ? method.stateMutability : method.type}
              </div>
            </ABIMethodTooltip>
            {isSharedView && (
              <Badge variant="outline" className="text-[10px]">
                <Info className="h-3 w-3 mr-1" />
                Read-only
              </Badge>
            )}
          </div>
          <ABIMethodSignature method={method} />
        </div>
        {method.type === 'function' && (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 gap-1.5",
              isHovered ? "opacity-100" : "opacity-0",
              "transition-opacity"
            )}
            disabled={!isContractVerified}
            onClick={() => onExecute(method)}
          >
            <PlayCircle className="h-3.5 w-3.5" />
            <span className="text-xs">View</span>
          </Button>
        )}
      </div>
    </div>
  );
}