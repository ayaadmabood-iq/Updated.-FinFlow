import { supabase } from '@/integrations/supabase/client';

export type ExportFormat = 'json' | 'csv' | 'txt' | 'markdown';

export interface ExportOptions {
  includeMetadata: boolean;
  includeChunks: boolean;
  includeSummary: boolean;
  includeExtractedText: boolean;
}

export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
}

class ExportService {
  async exportDocument(
    documentId: string,
    format: ExportFormat,
    options: ExportOptions
  ): Promise<ExportResult> {
    const { data, error } = await supabase.functions.invoke('export-document', {
      body: {
        documentId,
        format,
        options,
      },
    });

    if (error) {
      console.error('Export invoke error:', error);
      throw new Error(error.message || 'Failed to export document');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data as ExportResult;
  }

  downloadExport(result: ExportResult): void {
    const blob = new Blob([result.content], { type: result.mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  async copyToClipboard(result: ExportResult): Promise<void> {
    await navigator.clipboard.writeText(result.content);
  }
}

export const exportService = new ExportService();
