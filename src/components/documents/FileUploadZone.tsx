import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { useUploadDocument } from '@/hooks/useDocuments';
import { useQuotaCheck } from '@/hooks/useQuota';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { QuotaWarning } from '@/components/quota/QuotaWarning';
import { QuotaExceededDialog } from '@/components/quota/QuotaExceededDialog';
import { cn } from '@/lib/utils';
import type { SubscriptionTier } from '@/services/quotaService';

const MAX_FILE_SIZE = 52428800; // 50MB

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/html',
  'text/csv',
  'text/markdown',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
  'application/json',
  'application/xml',
];

const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.txt', '.html', '.csv', '.md',
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.mp3', '.wav', '.mp4', '.json', '.xml',
];

interface FileUploadZoneProps {
  projectId: string;
}

interface QuotaError {
  quotaType: 'documents' | 'storage';
  current: number;
  limit: number;
  tier: SubscriptionTier;
}

export function FileUploadZone({ projectId }: FileUploadZoneProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [quotaError, setQuotaError] = useState<QuotaError | null>(null);
  const uploadDocument = useUploadDocument(projectId);
  const { quotaStatus, checkDocumentsQuota, checkStorageQuota, refetch: refetchQuota } = useQuotaCheck();

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return t('upload.fileTooLarge', { name: file.name });
    }
    
    const isAllowedType = ALLOWED_TYPES.includes(file.type);
    const hasAllowedExtension = ALLOWED_EXTENSIONS.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!isAllowedType && !hasAllowedExtension) {
      return t('upload.unsupportedType', { name: file.name });
    }
    
    return null;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    setQuotaError(null);
    
    // Check quota before uploading
    const docsCheck = checkDocumentsQuota();
    if (!docsCheck.allowed) {
      if (quotaStatus) {
        setQuotaError({
          quotaType: 'documents',
          current: quotaStatus.documents.current,
          limit: quotaStatus.documents.limit!,
          tier: quotaStatus.tier,
        });
      }
      return;
    }

    // Check storage for total file size
    const totalSize = acceptedFiles.reduce((sum, f) => sum + f.size, 0);
    const storageCheck = checkStorageQuota(totalSize);
    if (!storageCheck.allowed) {
      if (quotaStatus) {
        setQuotaError({
          quotaType: 'storage',
          current: quotaStatus.storage.current,
          limit: quotaStatus.storage.limit!,
          tier: quotaStatus.tier,
        });
      }
      return;
    }
    
    for (const file of acceptedFiles) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // Upload files sequentially with progress
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      setUploadProgress(Math.round(((i) / acceptedFiles.length) * 100));
      
      try {
        await uploadDocument.mutateAsync({ file });
      } catch (err: any) {
        // Handle quota exceeded error from backend
        if (err.quotaExceeded) {
          setQuotaError({
            quotaType: err.quotaType,
            current: err.current,
            limit: err.limit,
            tier: err.tier,
          });
          break;
        }
        // Other errors handled by hook
      }
    }
    
    // Refetch quota after upload
    refetchQuota();
    
    setUploadProgress(100);
    setTimeout(() => setUploadProgress(0), 1000);
  }, [uploadDocument, t, checkDocumentsQuota, checkStorageQuota, quotaStatus, refetchQuota]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/html': ['.html'],
      'text/csv': ['.csv'],
      'text/markdown': ['.md'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'video/mp4': ['.mp4'],
      'application/json': ['.json'],
      'application/xml': ['.xml'],
    },
  });

  const isUploading = uploadDocument.isPending;

  // Check for near-limit warnings
  const docsCheck = checkDocumentsQuota();
  const storageCheck = checkStorageQuota(0);

  return (
    <div className="space-y-3">
      {/* Quota warnings */}
      {docsCheck.nearLimit && quotaStatus && quotaStatus.documents.limit && (
        <QuotaWarning
          quotaType="documents"
          current={quotaStatus.documents.current}
          limit={quotaStatus.documents.limit}
        />
      )}
      {storageCheck.nearLimit && quotaStatus && quotaStatus.storage.limit && (
        <QuotaWarning
          quotaType="storage"
          current={quotaStatus.storage.current}
          limit={quotaStatus.storage.limit}
        />
      )}

      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer',
          'flex flex-col items-center justify-center gap-3',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30',
          isUploading && 'pointer-events-none opacity-60'
        )}
        onClick={open}
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">{t('upload.uploading')}</p>
          </>
        ) : isDragActive ? (
          <>
            <Upload className="h-10 w-10 text-primary" />
            <p className="text-sm font-medium">{t('upload.dropHere')}</p>
          </>
        ) : (
          <>
            <div className="rounded-full bg-primary/10 p-3">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                {t('upload.dragAndDrop')}{' '}
                <span className="text-primary">{t('upload.browse')}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('upload.supportedFormats')}
              </p>
            </div>
          </>
        )}
      </div>

      {uploadProgress > 0 && uploadProgress < 100 && (
        <Progress value={uploadProgress} className="h-1" />
      )}

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-md px-3 py-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 ms-auto"
            onClick={() => setError(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Quota exceeded dialog */}
      {quotaError && (
        <QuotaExceededDialog
          open={!!quotaError}
          onOpenChange={(open) => !open && setQuotaError(null)}
          quotaType={quotaError.quotaType}
          current={quotaError.current}
          limit={quotaError.limit}
          tier={quotaError.tier}
        />
      )}
    </div>
  );
}