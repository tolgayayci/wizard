import { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ABIParameter } from '@/lib/types';

interface ABIParameterTooltipProps {
  parameter: ABIParameter;
  children: ReactNode;
}

export function ABIParameterTooltip({ parameter, children }: ABIParameterTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{children}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Internal type: {parameter.internalType || parameter.type}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}