import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { 
  Download, Eye, Trash2, FileText, Image, Music, Video, 
  FileCode, File, ChevronLeft, ChevronRight, Sparkles, Loader2, FileOutput,
  RotateCcw, AlertCircle
} from 'lucide-react';
import { useDocuments, useDeleteDocument } from '@/hooks/useDocuments';
import { useProcessDocument, useResumeDocument } from '@/hooks/useProcessing';
import { useQuotaCheck } from '@/hooks/useQuota';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FilePreview } from './FilePreview';
import { ExportDialog } from './ExportDialog';
import { ProcessingTimelineCompact, ProcessingTimeline } from './ProcessingTimeline';
import { QuotaWarning } from '@/components/quota/QuotaWarning';
import { QuotaExceededDialog } from '@/components/quota/QuotaExceededDialog';
import type { Document, PipelineStage, ProcessingStep } from '@/types';

interface FileListProps {
  projectId: string;
}

const PAGE_SIZE = 10;

// MIME types that support processing
const PROCESSABLE_MIME_TYPES = [
  'text/plain',
  'text/html',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/xml',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
  'audio/m4a',
  'audio/webm',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  // Image types (OCR extraction)
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
];

function isProcessable(mimeType: string): boolean {
  return PROCESSABLE_MIME_TYPES.includes(mimeType);
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml')) return FileCode;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(mimeType: string): string {
  const parts = mimeType.split('/');
  if (parts[1]) {
    const subtype = parts[1].replace('vnd.openxmlformats-officedocument.wordprocessingml.', '');
    return subtype.toUpperCase();
  }
  return parts[0].toUpperCase();
}

function isPreviewSupported(mimeType: string): boolean {
  return (
    mimeType.startsWith('image/') ||
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml'
  );
}

const statusColors: Record<string, string> = {
  uploaded: 'bg-warning/10 text-warning border-warning/20',
  ready: 'bg-success/10 text-success border-success/20',
  processing: 'bg-primary/10 text-primary border-primary/20',
  error: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function FileList({ projectId }: FileListProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);
  const [exportDoc, setExportDoc] = useState<Document | null>(null);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [showQuotaExceeded, setShowQuotaExceeded] = useState(false);
  
  const { data, isLoading } = useDocuments(projectId, page, PAGE_SIZE);
  const deleteDocument = useDeleteDocument();
  const { processDocument, isProcessing, isLocked } = useProcessDocument();
  const { resumeFromStage, isResuming } = useResumeDocument();
  const { quotaStatus, checkProcessingQuota, refetch: refetchQuota } = useQuotaCheck();

  // Helper to get the failed stage from processing steps
  const getFailedStage = (doc: Document): PipelineStage | undefined => {
    if (!doc.processingSteps) return undefined;
    const failedStep = doc.processingSteps.find(step => step.status === 'failed');
    return failedStep?.stage;
  };

  // Handle retry from a specific failed stage
  const handleRetry = async (doc: Document, stage: PipelineStage) => {
    const { allowed } = checkProcessingQuota();
    if (!allowed) {
      setShowQuotaExceeded(true);
      return;
    }

    setProcessingDocId(doc.id);
    try {
      await resumeFromStage(doc.id, stage);
      refetchQuota();
    } finally {
      setProcessingDocId(null);
    }
  };

  // Check processing quota
  const processingQuotaCheck = checkProcessingQuota();

  const handleDownload = async (doc: Document) => {
    try {
      const { documentService } = await import('@/services/documentService');
      const { url } = await documentService.getDownloadUrl(doc.id);
      window.open(url, '_blank');
    } catch {
      // Error handled silently
    }
  };

  const handleProcess = async (doc: Document) => {
    // Check quota before processing
    const { allowed } = checkProcessingQuota();
    if (!allowed) {
      setShowQuotaExceeded(true);
      return;
    }

    setProcessingDocId(doc.id);
    try {
      await processDocument(doc.id);
      // Refetch quota after successful processing
      refetchQuota();
    } finally {
      setProcessingDocId(null);
    }
  };

  const handleDelete = async () => {
    if (deleteDoc) {
      await deleteDocument.mutateAsync(deleteDoc.id);
      setDeleteDoc(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!data?.data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">{t('documents.empty')}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {t('documents.emptyDescription')}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Processing Quota Warning */}
      {processingQuotaCheck.nearLimit && quotaStatus?.processing && (
        <QuotaWarning 
          quotaType="processing" 
          current={quotaStatus.processing.current}
          limit={quotaStatus.processing.limit ?? 0}
        />
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">{t('documents.name')}</TableHead>
              <TableHead>{t('documents.type')}</TableHead>
              <TableHead>{t('documents.size')}</TableHead>
              <TableHead>{t('documents.status')}</TableHead>
              <TableHead>{t('documents.uploaded')}</TableHead>
              <TableHead className="text-end">{t('documents.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((doc) => {
              const Icon = getFileIcon(doc.mimeType);
              return (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate max-w-[200px]">{doc.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {getFileType(doc.mimeType)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(doc.sizeBytes)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={statusColors[doc.status]}>
                          {doc.status}
                        </Badge>
                        {/* Show pipeline progress indicator */}
                        {doc.processingSteps && doc.processingSteps.length > 0 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="cursor-pointer">
                                <ProcessingTimelineCompact steps={doc.processingSteps} />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="start">
                              <ProcessingTimeline steps={doc.processingSteps} showDetails />
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                      {doc.status === 'error' && doc.errorMessage && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-destructive text-xs truncate max-w-[150px] cursor-help flex items-center gap-1">
                                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                {doc.errorMessage}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p className="text-xs">{doc.errorMessage}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                    </span>
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-1">
                      <TooltipProvider>
                        {/* Retry button for failed documents */}
                        {doc.status === 'error' && getFailedStage(doc) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleRetry(doc, getFailedStage(doc)!)}
                                disabled={
                                  processingDocId === doc.id || 
                                  isLocked(doc.id) ||
                                  !processingQuotaCheck.allowed
                                }
                              >
                                {processingDocId === doc.id || isLocked(doc.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4 text-warning" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {t('documents.retryFrom', 'Retry from')} {getFailedStage(doc)?.replace('_', ' ')}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {isProcessable(doc.mimeType) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleProcess(doc)}
                                disabled={
                                  processingDocId === doc.id || 
                                  doc.status === 'processing' || 
                                  isLocked(doc.id) ||
                                  !processingQuotaCheck.allowed
                                }
                                title={
                                  !processingQuotaCheck.allowed 
                                    ? t('quota.exceeded') 
                                    : t('documents.process')
                                }
                              >
                                {processingDocId === doc.id || doc.status === 'processing' || isLocked(doc.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Sparkles className={`h-4 w-4 ${!processingQuotaCheck.allowed ? 'text-muted-foreground' : 'text-primary'}`} />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {!processingQuotaCheck.allowed 
                                  ? t('quota.exceeded') 
                                  : t('documents.processTooltip')}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {doc.status === 'ready' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setExportDoc(doc)}
                                title={t('documents.export')}
                              >
                                <FileOutput className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('documents.exportTooltip')}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDownload(doc)}
                              title={t('documents.download')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('documents.download')}</p>
                          </TooltipContent>
                        </Tooltip>
                        {isPreviewSupported(doc.mimeType) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setPreviewDoc(doc)}
                                title={t('documents.preview')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('documents.preview')}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteDoc(doc)}
                              title={t('documents.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('documents.delete')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            {t('common.page')} {page} {t('common.of')} {data.totalPages} ({data.total} {t('documents.title').toLowerCase()})
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 me-1" />
              {t('common.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
            >
              {t('common.next')}
              <ChevronRight className="h-4 w-4 ms-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <FilePreview
          document={previewDoc}
          open={!!previewDoc}
          onOpenChange={(open) => !open && setPreviewDoc(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={(open) => !open && setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('documents.delete')}?</AlertDialogTitle>
            <AlertDialogDescription>
              {t('documents.deleteConfirm')} "{deleteDoc?.name}"
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Dialog */}
      {exportDoc && (
        <ExportDialog
          open={!!exportDoc}
          onOpenChange={(open) => !open && setExportDoc(null)}
          documentId={exportDoc.id}
          documentName={exportDoc.name}
        />
      )}

      {/* Quota Exceeded Dialog */}
      <QuotaExceededDialog
        open={showQuotaExceeded}
        onOpenChange={setShowQuotaExceeded}
        quotaType="processing"
        current={quotaStatus?.processing.current ?? 0}
        limit={quotaStatus?.processing.limit ?? null}
        tier={quotaStatus?.tier ?? 'free'}
      />
    </>
  );
}