import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDocumentWithProcessing } from '@/hooks/useProcessing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Languages,
  Clock,
  AlertCircle,
  BookOpen,
  FileOutput,
} from 'lucide-react';
import { format } from 'date-fns';
import { ExportDialog } from './ExportDialog';

interface DocumentSummaryProps {
  documentId: string;
  documentName?: string;
}

const languageNames: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ru: 'Russian',
  ar: 'Arabic',
  nl: 'Dutch',
  pl: 'Polish',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  fi: 'Finnish',
  hi: 'Hindi',
};

export function DocumentSummary({ documentId, documentName }: DocumentSummaryProps) {
  const { t } = useTranslation();
  const { data: document, isLoading, error } = useDocumentWithProcessing(documentId);
  const [showExport, setShowExport] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex items-center gap-2 pt-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-destructive">{t('common.error')}: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!document) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">{t('common.noResults')}</p>
        </CardContent>
      </Card>
    );
  }

  const hasProcessingData = document.summary || document.extractedText;

  return (
    <div className="space-y-6">
      {/* Metadata Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            {t('summary.documentInfo')}
          </CardTitle>
          {document.status === 'ready' && (
            <Button variant="outline" size="sm" onClick={() => setShowExport(true)}>
              <FileOutput className="h-4 w-4 me-2" />
              {t('documents.export')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('documents.status')}</p>
              <Badge
                variant={
                  document.status === 'ready'
                    ? 'default'
                    : document.status === 'processing'
                    ? 'secondary'
                    : document.status === 'error'
                    ? 'destructive'
                    : 'outline'
                }
                className="mt-1"
              >
                {document.status}
              </Badge>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">{t('summary.language')}</p>
              <div className="flex items-center gap-1 mt-1">
                <Languages className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {document.language
                    ? languageNames[document.language] || document.language.toUpperCase()
                    : t('summary.notDetected')}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">{t('summary.processed')}</p>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {document.processedAt
                    ? format(new Date(document.processedAt), 'MMM d, yyyy HH:mm')
                    : t('summary.notProcessed')}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">{t('summary.textLength')}</p>
              <span className="text-sm font-medium">
                {document.extractedText
                  ? `${document.extractedText.length.toLocaleString()} ${t('chunks.chars')}`
                  : 'N/A'}
              </span>
            </div>
          </div>

          {document.errorMessage && (
            <div className="mt-4 p-3 bg-destructive/10 rounded-md border border-destructive/20">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">{t('summary.processingError')}</span>
              </div>
              <p className="text-sm text-destructive/80 mt-1">{document.errorMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Card */}
      {hasProcessingData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5" />
              {t('export.summary')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {document.summary ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {document.summary}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {t('summary.noSummary')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Extracted Text Preview */}
      {document.extractedText && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              {t('summary.extractedTextPreview')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">
                {document.extractedText.substring(0, 2000)}
                {document.extractedText.length > 2000 && (
                  <span className="text-primary">
                    ... ({(document.extractedText.length - 2000).toLocaleString()} {t('chunks.chars')})
                  </span>
                )}
              </p>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      {/* Export Dialog */}
      <ExportDialog
        open={showExport}
        onOpenChange={setShowExport}
        documentId={documentId}
        documentName={documentName || document.name}
      />
    </div>
  );
}