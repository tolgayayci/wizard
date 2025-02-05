import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Code2, 
  ExternalLink, 
  BookOpen,
  GitBranch,
  Lightbulb,
  ArrowRight,
  Copy,
  CheckCircle,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: {
    name: string;
    description: string;
    features: string[];
    code: string;
    isOpenZeppelin?: boolean;
    documentation?: string;
    references?: Array<{ title: string; url: string; }>;
  } | null;
  onUseTemplate: () => void;
}

export function TemplateDialog({ 
  open, 
  onOpenChange, 
  template,
  onUseTemplate,
}: TemplateDialogProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!template) return null;

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(template.code);
    setCopied(true);
    toast({
      title: "Code copied",
      description: "Contract code copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-2xl">{template.name}</DialogTitle>
            {template.isOpenZeppelin && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                OpenZeppelin
              </Badge>
            )}
          </div>
          <DialogDescription className="text-base">
            {template.description}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left Column - Info & Resources */}
          <div className="w-[350px] flex-none">
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {/* Learning Outcomes */}
                <div>
                  <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Learning Outcomes
                  </h4>
                  <div className="space-y-2">
                    {template.features.map((feature, index) => (
                      <div 
                        key={index} 
                        className="flex items-start gap-2 p-3 rounded-lg border bg-muted/40"
                      >
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-none" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Resources */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Resources
                  </h4>

                  <div className="space-y-3">
                    {template.documentation && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-between h-auto py-3 px-4"
                        onClick={() => window.open(template.documentation, '_blank')}
                      >
                        <div className="flex flex-col items-start text-left">
                          <span className="font-medium">Documentation</span>
                          <span className="text-xs text-muted-foreground">
                            Implementation details & best practices
                          </span>
                        </div>
                        <ExternalLink className="h-4 w-4 flex-none" />
                      </Button>
                    )}

                    {template.references?.map((ref, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full justify-between h-auto py-3 px-4"
                        onClick={() => window.open(ref.url, '_blank')}
                      >
                        <div className="flex flex-col items-start text-left">
                          <span className="font-medium">{ref.title}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {ref.url}
                          </span>
                        </div>
                        <ExternalLink className="h-4 w-4 flex-none" />
                      </Button>
                    ))}
                  </div>

                  {template.isOpenZeppelin && (
                    <div className="p-3 rounded-lg border bg-blue-500/5">
                      <div className="flex items-start gap-3">
                        <BookOpen className="h-4 w-4 text-blue-500 flex-none mt-0.5" />
                        <div>
                          <h5 className="text-sm font-medium text-blue-500">About OpenZeppelin</h5>
                          <p className="text-xs text-muted-foreground mt-1">
                            This template uses OpenZeppelin's battle-tested smart contract implementations, 
                            considered the gold standard for secure and reliable smart contracts.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Right Column - Code */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                Contract Implementation
              </h4>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={handleCopyCode}
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy Code"}
              </Button>
            </div>
            <div className="flex-1 relative min-h-0">
              <div className="absolute inset-0">
                <ScrollArea className="h-full">
                  <pre className="p-4 rounded-lg border bg-muted font-mono text-sm">
                    <code>{template.code}</code>
                  </pre>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onUseTemplate} className="gap-2">
            Use Template
            <GitBranch className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}