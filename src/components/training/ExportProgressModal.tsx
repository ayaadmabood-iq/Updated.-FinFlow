import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ExportProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalRecords: number;
  datasetName: string;
  onExport: () => Promise<{ content: string; filename: string }>;
  onCancel?: () => void;
}

type ExportStatus = 'idle' | 'exporting' | 'completed' | 'error' | 'cancelled';

export function ExportProgressModal({
  open,
  onOpenChange,
  totalRecords,
  datasetName,
  onExport,
  onCancel,
}: ExportProgressModalProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [processedRecords, setProcessedRecords] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [exportResult, setExportResult] = useState<{ content: string; filename: string } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Simulate progress updates
  useEffect(() => {
    if (status !== 'exporting') return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const increment = Math.random() * 15 + 5;
        const newProgress = Math.min(prev + increment, 95);
        const records = Math.floor((newProgress / 100) * totalRecords);
        setProcessedRecords(records);

        // Calculate ETA
        if (startTime) {
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = newProgress / elapsed;
          const remaining = (100 - newProgress) / rate;
          if (remaining > 0 && remaining < 3600) {
            setEstimatedTimeRemaining(formatTime(remaining));
          }
        }

        return newProgress;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [status, totalRecords, startTime]);

  const handleStart = useCallback(async () => {
    setStatus('exporting');
    setProgress(0);
    setProcessedRecords(0);
    setStartTime(Date.now());
    setError(null);

    try {
      const result = await onExport();
      setExportResult(result);
      setProgress(100);
      setProcessedRecords(totalRecords);
      setStatus('completed');
      toast.success('Export completed successfully!');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Export failed');
      toast.error('Export failed');
    }
  }, [onExport, totalRecords]);

  const handleCancel = () => {
    setStatus('cancelled');
    onCancel?.();
    onOpenChange(false);
  };

  const handleDownload = () => {
    if (!exportResult) return;

    const blob = new Blob([exportResult.content], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportResult.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Downloaded ${exportResult.filename}`);
  };

  const handleClose = () => {
    if (status === 'exporting') {
      // Confirm before closing during export
      if (window.confirm('Cancel the export?')) {
        handleCancel();
      }
    } else {
      setStatus('idle');
      setProgress(0);
      onOpenChange(false);
    }
  };

  // Auto-start export when modal opens
  useEffect(() => {
    if (open && status === 'idle') {
      handleStart();
    }
  }, [open, status, handleStart]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStatus('idle');
      setProgress(0);
      setProcessedRecords(0);
      setExportResult(null);
      setError(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status === 'completed' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : status === 'error' ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : (
              <Download className="h-5 w-5" />
            )}
            {status === 'completed'
              ? 'Export Complete'
              : status === 'error'
              ? 'Export Failed'
              : 'Exporting Dataset'}
          </DialogTitle>
          <DialogDescription>{datasetName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Indicator */}
          <div className="flex justify-center">
            <div className="relative">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={351.86}
                  strokeDashoffset={351.86 - (progress / 100) * 351.86}
                  strokeLinecap="round"
                  className={
                    status === 'completed'
                      ? 'text-green-500'
                      : status === 'error'
                      ? 'text-destructive'
                      : 'text-primary'
                  }
                  style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {status === 'exporting' ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : status === 'completed' ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                ) : status === 'error' ? (
                  <XCircle className="h-8 w-8 text-destructive" />
                ) : null}
                <span className="text-2xl font-bold mt-1">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>

          {/* Progress Details */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {processedRecords.toLocaleString()} of {totalRecords.toLocaleString()} records
              </span>
              {estimatedTimeRemaining && status === 'exporting' && (
                <span>~{estimatedTimeRemaining} remaining</span>
              )}
            </div>
          </div>

          {/* Error Message */}
          {status === 'error' && error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {status === 'exporting' && (
              <Button variant="outline" onClick={handleCancel} className="flex-1">
                Cancel
              </Button>
            )}

            {status === 'completed' && exportResult && (
              <>
                <Button onClick={handleDownload} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Close
                </Button>
                <Button onClick={handleStart} className="flex-1">
                  Retry
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
}
