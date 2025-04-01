import { Code2 } from 'lucide-react';

export function ABIHeader() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/40">
      <Code2 className="h-5 w-5 text-muted-foreground" />
      <div>
        <h3 className="font-medium">Contract Interface</h3>
        <p className="text-xs text-muted-foreground">
          Make calls to your deployed contract on Superposition Testnet
        </p>
      </div>
    </div>
  );
}