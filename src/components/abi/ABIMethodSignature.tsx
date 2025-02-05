import { ABIMethod } from '@/lib/types';
import { ABIParameterTooltip } from './ABIParameterTooltip';

interface ABIMethodSignatureProps {
  method: ABIMethod;
}

export function ABIMethodSignature({ method }: ABIMethodSignatureProps) {
  return (
    <div className="text-xs text-muted-foreground font-mono">
      {method.name || 'constructor'}(
      {method.inputs.map((input, i) => (
        <span key={i}>
          {i > 0 && ', '}
          <ABIParameterTooltip parameter={input}>
            <span className="text-foreground">{input.type}</span>
            {' '}
            <span className="text-muted-foreground">{input.name}</span>
          </ABIParameterTooltip>
        </span>
      ))}
      )
      {method.outputs && method.outputs.length > 0 && (
        <>
          {' → '}
          {method.outputs.map((output, i) => (
            <span key={i}>
              {i > 0 && ', '}
              <span className="text-foreground">{output.type}</span>
            </span>
          ))}
        </>
      )}
    </div>
  );
}