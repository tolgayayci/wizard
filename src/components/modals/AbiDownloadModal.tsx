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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { FileDown, Loader2 } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '@/lib/config';

interface AbiDownloadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function AbiDownloadModal({ open, onOpenChange, projectId }: AbiDownloadModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'solidity' | 'json'>('solidity');
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    if (!projectId) return;

    setIsDownloading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      const response = await axios.post(`${API_URL}/api/download/abi`, {
        user_id: user.id,
        project_id: projectId,
        format: selectedFormat,
      });

      if (response.data.success) {
        const { filename, content } = response.data.data;
        
        // Create and download file
        const blob = new Blob([content], { 
          type: selectedFormat === 'json' ? 'application/json' : 'text/plain' 
        });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Download Complete",
          description: `${filename} has been downloaded successfully`,
        });

        onOpenChange(false);
      } else {
        throw new Error("Failed to download ABI");
      }
    } catch (error) {
      console.error('ABI download error:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download ABI",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Download ABI
          </DialogTitle>
          <DialogDescription>
            Choose the format for your Application Binary Interface (ABI) file.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup value={selectedFormat} onValueChange={(value: 'solidity' | 'json') => setSelectedFormat(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="solidity" id="solidity" />
              <Label htmlFor="solidity" className="flex-1">
                <div>
                  <div className="font-medium">Solidity Interface (.sol)</div>
                  <div className="text-sm text-muted-foreground">
                    Human-readable Solidity interface definition
                  </div>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="json" id="json" />
              <Label htmlFor="json" className="flex-1">
                <div>
                  <div className="font-medium">JSON ABI (.json)</div>
                  <div className="text-sm text-muted-foreground">
                    Machine-readable JSON format for tools and frameworks
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDownloading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="gap-2"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Download
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}