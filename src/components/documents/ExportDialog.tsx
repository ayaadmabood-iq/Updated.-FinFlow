import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useExportDocument, useDownloadExport, useCopyExport } from '@/hooks/useExport';
import type { ExportFormat, ExportOptions, ExportResult } from '@/services/exportService';
import {
  Download,
  Copy,
  FileJson,
  FileText,
  FileSpreadsheet,
  FileCode,
  Loader2,
  Eye,
} from 'lucide-react';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
}

const formatIcons: Record<ExportFormat, React.ReactNode> = {
  json: <FileJson className="h-4 w-4" />,
  csv: <FileSpreadsheet className="h-4 w-4" />,
  txt: <FileText className="h-4 w-4" />,
  markdown: <FileCode className="h-4 w-4" />,
};

export function ExportDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
}: ExportDialogProps) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<ExportFormat>('json');
  const [options, setOptions] = useState<ExportOptions>({
    includeMetadata: true,
    includeChunks: true,
    includeSummary: true,
    includeExtractedText: false,
  });
  const [preview, setPreview] = useState<ExportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const exportMutation = useExportDocument();
  const { download } = useDownloadExport();
  const copyMutation = useCopyExport();

  const formatLabels: Record<ExportFormat, string> = {
    json: t('export.json'),
    csv: t('export.csv'),
    txt: t('export.txt'),
    markdown: t('export.markdown'),
  };

  // Generate preview when options change
  useEffect(() => {
    if (open && showPreview) {
      generatePreview();
    }
  }, [format, options, showPreview]);

  const generatePreview = async () => {
    try {
      const result = await exportMutation.mutateAsync({
        documentId,
        format,
        options,
      });
      setPreview(result);
    } catch {
      setPreview(null);
    }
  };

  const handleDownload = async () => {
    try {
      const result = preview || await exportMutation.mutateAsync({
        documentId,
        format,
        options,
      });
      download(result);
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleCopy = async () => {
    try {
      const result = preview || await exportMutation.mutateAsync({
        documentId,
        format,
        options,
      });
      await copyMutation.mutateAsync(result);
    } catch {
      // Error handled by mutation
    }
  };

  const toggleOption = (key: keyof ExportOptions) => {
    setOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setPreview(null);
  };

  const handleFormatChange = (value: ExportFormat) => {
    setFormat(value);
    setPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('export.title')}</DialogTitle>
          <DialogDescription>
            {t('export.description')} - "{documentName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label htmlFor="format">{t('export.format')}</Label>
            <Select value={format} onValueChange={handleFormatChange}>
              <SelectTrigger id="format" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(formatLabels) as ExportFormat[]).map((f) => (
                  <SelectItem key={f} value={f}>
                    <div className="flex items-center gap-2">
                      {formatIcons[f]}
                      <span>{formatLabels[f]}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>{t('export.options')}</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeMetadata"
                  checked={options.includeMetadata}
                  onCheckedChange={() => toggleOption('includeMetadata')}
                />
                <Label htmlFor="includeMetadata" className="font-normal cursor-pointer">
                  {t('export.metadata')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeSummary"
                  checked={options.includeSummary}
                  onCheckedChange={() => toggleOption('includeSummary')}
                />
                <Label htmlFor="includeSummary" className="font-normal cursor-pointer">
                  {t('export.summary')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeChunks"
                  checked={options.includeChunks}
                  onCheckedChange={() => toggleOption('includeChunks')}
                />
                <Label htmlFor="includeChunks" className="font-normal cursor-pointer">
                  {t('export.chunks')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeExtractedText"
                  checked={options.includeExtractedText}
                  onCheckedChange={() => toggleOption('includeExtractedText')}
                />
                <Label htmlFor="includeExtractedText" className="font-normal cursor-pointer">
                  {t('export.extractedText')}
                </Label>
              </div>
            </div>
          </div>

          {/* Preview Toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowPreview(!showPreview);
                if (!showPreview) generatePreview();
              }}
              disabled={exportMutation.isPending}
            >
              <Eye className="h-4 w-4 me-2" />
              {showPreview ? t('export.hidePreview') : t('export.showPreview')}
            </Button>
            {preview && (
              <span className="text-xs text-muted-foreground">
                {preview.content.length.toLocaleString()} {t('chunks.chars')}
              </span>
            )}
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="border rounded-lg">
              <div className="px-3 py-2 border-b bg-muted/50 flex items-center justify-between">
                <span className="text-sm font-medium">{t('export.preview')}</span>
                {preview && (
                  <span className="text-xs text-muted-foreground">{preview.filename}</span>
                )}
              </div>
              <ScrollArea className="h-[200px]">
                {exportMutation.isPending ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : preview ? (
                  <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all">
                    {preview.content.substring(0, 2000)}
                    {preview.content.length > 2000 && (
                      <span className="text-muted-foreground">
                        {'\n\n'}... ({(preview.content.length - 2000).toLocaleString()} {t('chunks.chars')})
                      </span>
                    )}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    {t('export.showPreview')}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={exportMutation.isPending || copyMutation.isPending}
          >
            {copyMutation.isPending ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <Copy className="h-4 w-4 me-2" />
            )}
            {t('export.copy')}
          </Button>
          <Button onClick={handleDownload} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 me-2" />
            )}
            {t('export.download')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}