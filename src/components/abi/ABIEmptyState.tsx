import { Code2 } from 'lucide-react';

export function ABIEmptyState() {
  return (
    <div className="h-full flex items-center justify-center bg-muted/40">
      <div className="text-center">
        <div className="inline-flex p-3 bg-primary/10 rounded-lg mb-6">
          <Code2 className="h-6 w-6 text-primary animate-pulse" />
        </div>
        <h3 className="font-medium mb-3">No Contract Deployments</h3>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Deploy your contract to Superposition Testnet
          </p>
          <p className="text-sm text-muted-foreground">
            to start interacting with its methods
          </p>
        </div>
      </div>
    </div>
  );
}