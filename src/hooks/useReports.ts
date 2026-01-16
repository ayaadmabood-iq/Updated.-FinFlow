import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportService, ExtractionField } from '@/services/reportService';
import { toast } from 'sonner';

export function useReportTemplates() {
  return useQuery({
    queryKey: ['report-templates'],
    queryFn: () => reportService.getTemplates(),
  });
}

export function useReportTemplate(templateId: string | null) {
  return useQuery({
    queryKey: ['report-template', templateId],
    queryFn: () => templateId ? reportService.getTemplate(templateId) : null,
    enabled: !!templateId,
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      templateId,
      documentIds,
      reportName,
      language = 'auto',
    }: {
      projectId: string;
      templateId: string;
      documentIds: string[];
      reportName: string;
      language?: 'auto' | 'en' | 'ar';
    }) => reportService.generateReport(projectId, templateId, documentIds, reportName, language),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports', variables.projectId] });
      toast.success('Report generated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate report: ${error.message}`);
    },
  });
}

export function useReports(projectId: string) {
  return useQuery({
    queryKey: ['reports', projectId],
    queryFn: () => reportService.getReports(projectId),
    enabled: !!projectId,
  });
}

export function useReport(reportId: string | null) {
  return useQuery({
    queryKey: ['report', reportId],
    queryFn: () => reportId ? reportService.getReport(reportId) : null,
    enabled: !!reportId,
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => reportService.deleteReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete report: ${error.message}`);
    },
  });
}

export function useExtractData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      documentIds,
      extractionName,
      fields,
    }: {
      projectId: string;
      documentIds: string[];
      extractionName: string;
      fields: ExtractionField[];
    }) => reportService.extractData(projectId, documentIds, extractionName, fields),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['extractions', variables.projectId] });
      toast.success('Data extraction completed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to extract data: ${error.message}`);
    },
  });
}

export function useExtractions(projectId: string) {
  return useQuery({
    queryKey: ['extractions', projectId],
    queryFn: () => reportService.getExtractions(projectId),
    enabled: !!projectId,
  });
}
