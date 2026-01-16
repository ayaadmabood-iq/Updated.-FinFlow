import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDocuments } from '@/hooks/useDocuments';
import { exportService, type ExportFormat, type ExportOptions } from '@/services/exportService';
import { toast } from '@/hooks/use-toast';
import {
  Download,
  FileText,
  Loader2,
  CheckCircle2,
  Copy,
  File,
} from 'lucide-react';

interface DocumentExportPanelProps {
  projectId: string;
}

const formatInfo: Record<ExportFormat, { label: string; icon: string; description: string }> = {
  json: { label: 'JSON', icon: '{ }', description: 'Structured data format' },
  csv: { label: 'CSV', icon: '📊', description: 'Spreadsheet compatible' },
  txt: { label: 'Plain Text', icon: '📝', description: 'Simple text format' },
  markdown: { label: 'Markdown', icon: '📄', description: 'Rich text with formatting' },
};

export function DocumentExportPanel({ projectId }: DocumentExportPanelProps) {
  const { t } = useTranslation();
  const { data: documentsData, isLoading } = useDocuments(projectId);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<ExportFormat>('json');
  const [options, setOptions] = useState<ExportOptions>({
    includeMetadata: true,
    includeChunks: true,
    includeSummary: true,
    includeExtractedText: true,
  });
  const [isExporting, setIsExporting] = useState(false);

  const readyDocuments = documentsData?.data.filter(d => d.status === 'ready') || [];

  const toggleDocument = (docId: string) => {
    const newSet = new Set(selectedDocIds);
    if (newSet.has(docId)) {
      newSet.delete(docId);
    } else {
      newSet.add(docId);
    }
    setSelectedDocIds(newSet);
  };

  const selectAll = () => {
    if (selectedDocIds.size === readyDocuments.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(readyDocuments.map(d => d.id)));
    }
  };

  const handleExport = async () => {
    if (selectedDocIds.size === 0) return;

    setIsExporting(true);
    try {
      // Export each selected document
      for (const docId of selectedDocIds) {
        const result = await exportService.exportDocument(docId, format, options);
        exportService.downloadExport(result);
        
        // Small delay between downloads
        await new Promise(r => setTimeout(r, 300));
      }

      toast({
        title: t('export.exportSuccess', 'Export completed'),
        description: t('export.exportedDocs', '{{count}} documents exported', { count: selectedDocIds.size }),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('export.exportFailed', 'Export failed'),
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t('export.exportDocuments', 'Export Documents')}
        </CardTitle>
        <CardDescription>
          {t('export.exportDocsDesc', 'Export processed documents with extracted text and chunks')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {readyDocuments.length === 0 ? (
          <div className="text-center py-8">
            <File className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {t('export.noDocs', 'No Documents Available')}
            </h3>
            <p className="text-muted-foreground">
              {t('export.noDocsDesc', 'Upload and process documents first to export them.')}
            </p>
          </div>
        ) : (
          <>
            {/* Document Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t('export.selectDocs', 'Select Documents')}</Label>
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  {selectedDocIds.size === readyDocuments.length
                    ? t('export.deselectAll', 'Deselect All')
                    : t('export.selectAll', 'Select All')
                  }
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                {readyDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleDocument(doc.id)}
                  >
                    <Checkbox
                      checked={selectedDocIds.has(doc.id)}
                      onCheckedChange={() => toggleDocument(doc.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(doc.sizeBytes)} • {doc.wordCount?.toLocaleString() || 0} words
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Ready
                    </Badge>
                  </div>
                ))}
              </div>
              {selectedDocIds.size > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('export.selectedCount', '{{count}} documents selected', { count: selectedDocIds.size })}
                </p>
              )}
            </div>

            {/* Format Selection */}
            <div className="space-y-2">
              <Label>{t('export.format', 'Export Format')}</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(formatInfo).map(([f, info]) => (
                    <SelectItem key={f} value={f}>
                      <div className="flex items-center gap-2">
                        <span>{info.icon}</span>
                        <span>{info.label}</span>
                        <span className="text-xs text-muted-foreground">- {info.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Export Options */}
            <div className="space-y-3">
              <Label>{t('export.includeOptions', 'Include in Export')}</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="metadata"
                    checked={options.includeMetadata}
                    onCheckedChange={(c) => setOptions(prev => ({ ...prev, includeMetadata: !!c }))}
                  />
                  <Label htmlFor="metadata" className="font-normal text-sm">
                    {t('export.metadata', 'Metadata')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="chunks"
                    checked={options.includeChunks}
                    onCheckedChange={(c) => setOptions(prev => ({ ...prev, includeChunks: !!c }))}
                  />
                  <Label htmlFor="chunks" className="font-normal text-sm">
                    {t('export.chunks', 'Text Chunks')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="summary"
                    checked={options.includeSummary}
                    onCheckedChange={(c) => setOptions(prev => ({ ...prev, includeSummary: !!c }))}
                  />
                  <Label htmlFor="summary" className="font-normal text-sm">
                    {t('export.summary', 'Summary')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="text"
                    checked={options.includeExtractedText}
                    onCheckedChange={(c) => setOptions(prev => ({ ...prev, includeExtractedText: !!c }))}
                  />
                  <Label htmlFor="text" className="font-normal text-sm">
                    {t('export.extractedText', 'Full Text')}
                  </Label>
                </div>
              </div>
            </div>

            {/* Export Button */}
            <Button
              onClick={handleExport}
              disabled={selectedDocIds.size === 0 || isExporting}
              className="w-full"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {t('export.exportSelected', 'Export {{count}} Documents', { count: selectedDocIds.size })}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
