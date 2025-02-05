import { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ABIMethod } from '@/lib/types';

interface ABIMethodTooltipProps {
  method: ABIMethod;
  children: ReactNode;
}

export function ABIMethodTooltip({ method, children }: ABIMethodTooltipProps) {
  const getMethodDescription = () => {
    switch (method.type) {
      case 'function':
        return method.stateMutability === 'view' || method.stateMutability === 'pure'
          ? 'Read-only function that does not modify state'
          : 'Function that may modify contract state';
      case 'event':
        return 'Event emitted by the contract';
      case 'error':
        return 'Custom error that can be thrown';
      case 'constructor':
        return 'Contract initialization function';
      default:
        return '';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent>
          <p>{getMethodDescription()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}