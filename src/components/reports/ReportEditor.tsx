import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Download, Copy, Edit, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GeneratedReport, SectionData, reportService } from '@/services/reportService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface ReportEditorProps {
  report: GeneratedReport;
  onUpdate?: (report: GeneratedReport) => void;
  isRtl: boolean;
}

export function ReportEditor({ report, onUpdate, isRtl }: ReportEditorProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(report.content_markdown || '');
  const [showPreview, setShowPreview] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedContent);
    setIsCopied(true);
    toast.success(t('common.copied', 'Copied to clipboard'));
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const filename = report.name.replace(/[^a-zA-Z0-9-_]/g, '_');
    reportService.downloadMarkdown(editedContent, filename);
    toast.success(t('reports.downloaded', 'Report downloaded'));
  };

  const handleSaveEdits = () => {
    // In a real implementation, this would update the report in the database
    setIsEditing(false);
    toast.success(t('reports.saved', 'Changes saved'));
  };

  // Simple Markdown renderer - for a full implementation, use react-markdown
  const renderMarkdown = (markdown: string) => {
    // Basic markdown parsing for display
    const lines = markdown.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-2xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-xl font-semibold mt-4 mb-2">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-medium mt-3 mb-1">{line.slice(4)}</h3>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-semibold my-1">{line.slice(2, -2)}</p>;
      }
      if (line.startsWith('*') && line.endsWith('*')) {
        return <p key={i} className="italic text-muted-foreground my-1">{line.slice(1, -1)}</p>;
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="ms-4 my-0.5">{line.slice(2)}</li>;
      }
      if (line.startsWith('---')) {
        return <Separator key={i} className="my-4" />;
      }
      if (line.trim() === '') {
        return <br key={i} />;
      }
      return <p key={i} className="my-1">{line}</p>;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">{report.name}</h3>
          <Badge variant={report.status === 'ready' ? 'default' : 'secondary'}>
            {report.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <EyeOff className="h-4 w-4 me-1" /> : <Eye className="h-4 w-4 me-1" />}
            {showPreview ? t('reports.hidePreview', 'Source') : t('reports.showPreview', 'Preview')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit className="h-4 w-4 me-1" />
            {isEditing ? t('common.cancel', 'Cancel') : t('common.edit', 'Edit')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
          >
            {isCopied ? <Check className="h-4 w-4 me-1" /> : <Copy className="h-4 w-4 me-1" />}
            {t('common.copy', 'Copy')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadMarkdown}
          >
            <Download className="h-4 w-4 me-1" />
            {t('reports.download', 'Download')}
          </Button>
        </div>
      </div>

      <Card className={cn("overflow-hidden", isRtl && "text-right")}>
        {isEditing ? (
          <CardContent className="p-0">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[500px] rounded-none border-0 font-mono text-sm resize-none"
              dir={isRtl ? 'rtl' : 'ltr'}
            />
            <div className="p-4 border-t flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsEditing(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button onClick={handleSaveEdits}>
                {t('common.save', 'Save Changes')}
              </Button>
            </div>
          </CardContent>
        ) : showPreview ? (
          <ScrollArea className="h-[500px]">
            <CardContent className="p-6 prose prose-sm dark:prose-invert max-w-none" dir={isRtl ? 'rtl' : 'ltr'}>
              {renderMarkdown(editedContent)}
            </CardContent>
          </ScrollArea>
        ) : (
          <ScrollArea className="h-[500px]">
            <CardContent className="p-4">
              <pre className="text-sm font-mono whitespace-pre-wrap" dir={isRtl ? 'rtl' : 'ltr'}>
                {editedContent}
              </pre>
            </CardContent>
          </ScrollArea>
        )}
      </Card>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          {t('reports.tokensUsed', 'Tokens')}: {report.total_tokens_used?.toLocaleString() || 0}
        </span>
        <span>
          {t('reports.cost', 'Cost')}: ${report.generation_cost_usd?.toFixed(4) || '0.0000'}
        </span>
        {report.generation_time_ms && (
          <span>
            {t('reports.time', 'Time')}: {(report.generation_time_ms / 1000).toFixed(1)}s
          </span>
        )}
        <span>
          {t('reports.sources', 'Sources')}: {report.source_document_ids?.length || 0} {t('documents.title', 'documents')}
        </span>
      </div>
    </div>
  );
}
