import { Download, FileText, Loader2 } from 'lucide-react';
import { useDocumentPreview } from '@/hooks/useDocuments';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Document } from '@/types';

interface FilePreviewProps {
  document: Document;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilePreview({ document, open, onOpenChange }: FilePreviewProps) {
  const { data: preview, isLoading } = useDocumentPreview(document.id);

  const handleDownload = async () => {
    try {
      const { documentService } = await import('@/services/documentService');
      const { url } = await documentService.getDownloadUrl(document.id);
      window.open(url, '_blank');
    } catch {
      // Error handled silently
    }
  };

  const isImage = document.mimeType.startsWith('image/');
  const isText = 
    document.mimeType.startsWith('text/') ||
    document.mimeType === 'application/json' ||
    document.mimeType === 'application/xml';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 truncate pr-8">
            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="truncate">{document.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : !preview ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">
                Preview not available for this file type
              </p>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            </div>
          ) : isImage ? (
            <div className="flex items-center justify-center bg-muted/30 rounded-lg p-4 min-h-[300px]">
              <img
                src={preview.content}
                alt={document.name}
                className="max-w-full max-h-[60vh] object-contain rounded"
              />
            </div>
          ) : isText ? (
            <ScrollArea className="h-[60vh] rounded-lg border bg-muted/20">
              <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
                {preview.content}
              </pre>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">
                Preview not available for this file type
              </p>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            </div>
          )}
        </div>

        {preview && (
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
