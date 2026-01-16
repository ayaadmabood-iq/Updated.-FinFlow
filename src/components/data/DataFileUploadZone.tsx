import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { CloudUpload, FileText, Loader2, File, Image, Music, Video } from 'lucide-react';
import { useAddFile } from '@/hooks/useDataSources';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/html',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'video/mp4',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.html', '.png', '.jpg', '.jpeg', '.mp3', '.mp4', '.wav'];

interface DataFileUploadZoneProps {
  projectId: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="h-5 w-5 text-success" />;
  if (mimeType.startsWith('audio/')) return <Music className="h-5 w-5 text-purple-500" />;
  if (mimeType.startsWith('video/')) return <Video className="h-5 w-5 text-orange-500" />;
  if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-destructive" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

export function DataFileUploadZone({ projectId }: DataFileUploadZoneProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);

  const { mutateAsync: uploadFile, isPending: isUploading } = useAddFile(projectId);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return t('documents.fileTooLarge');
    }

    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(extension);

    if (!isValidType) {
      return t('documents.invalidType');
    }

    return null;
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null);
      setUploadProgress(0);

      const validFiles: File[] = [];
      for (const file of acceptedFiles) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      setUploadingFiles(validFiles);
      
      try {
        for (let i = 0; i < validFiles.length; i++) {
          await uploadFile(validFiles[i]);
          setUploadProgress(((i + 1) / validFiles.length) * 100);
        }
      } catch (err) {
        console.error('Upload error:', err);
      } finally {
        setUploadingFiles([]);
        setUploadProgress(0);
      }
    },
    [uploadFile, t]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    multiple: true,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/html': ['.html'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'video/mp4': ['.mp4'],
    },
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-primary bg-primary/5 border-solid'
            : 'border-border bg-card hover:border-primary/50',
          isUploading && 'pointer-events-none opacity-60'
        )}
        onClick={open}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-3">
          {isUploading ? (
            <>
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                {t('documents.uploading')}...
              </p>
            </>
          ) : isDragActive ? (
            <>
              <CloudUpload className="h-12 w-12 text-primary" />
              <p className="text-sm text-primary font-medium">
                {t('documents.dropHere')}
              </p>
            </>
          ) : (
            <>
              <div className="relative">
                <CloudUpload className="h-12 w-12 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t('documents.dragDrop', 'Drag & drop files here or')}{' '}
                <button
                  type="button"
                  className="text-primary font-medium hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    open();
                  }}
                >
                  {t('documents.browseFiles', 'Browse files')}
                </button>
              </p>
            </>
          )}
        </div>

        {isUploading && uploadProgress > 0 && (
          <div className="mt-6">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round(uploadProgress)}%
            </p>
          </div>
        )}
      </div>

      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
              {getFileIcon(file.type)}
              <span className="truncate">{file.name}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
