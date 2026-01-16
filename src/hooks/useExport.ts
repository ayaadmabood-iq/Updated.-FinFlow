import { useMutation } from '@tanstack/react-query';
import { exportService, ExportFormat, ExportOptions, ExportResult } from '@/services/exportService';
import { toast } from 'sonner';

interface ExportParams {
  documentId: string;
  format: ExportFormat;
  options: ExportOptions;
}

export function useExportDocument() {
  return useMutation({
    mutationFn: ({ documentId, format, options }: ExportParams) =>
      exportService.exportDocument(documentId, format, options),
    onError: (error: Error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });
}

export function useDownloadExport() {
  return {
    download: (result: ExportResult) => {
      exportService.downloadExport(result);
      toast.success(`Downloaded ${result.filename}`);
    },
  };
}

export function useCopyExport() {
  return useMutation({
    mutationFn: (result: ExportResult) => exportService.copyToClipboard(result),
    onSuccess: () => {
      toast.success('Copied to clipboard');
    },
    onError: () => {
      toast.error('Failed to copy to clipboard');
    },
  });
}
