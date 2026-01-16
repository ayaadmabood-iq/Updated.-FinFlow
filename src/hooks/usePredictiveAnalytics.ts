import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsService, DocumentTrend, DocumentScore, ExecutiveBriefing, DocumentAnomaly, AnalyticsQuery, AnalyticsSummary } from '@/services/analyticsService';
import { toast } from 'sonner';

// Document Trends
export function useDocumentTrends(projectId: string) {
  return useQuery<DocumentTrend[]>({
    queryKey: ['document-trends', projectId],
    queryFn: () => analyticsService.getTrends(projectId),
    enabled: !!projectId,
  });
}

export function useDetectTrends() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => analyticsService.detectTrends(projectId),
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['document-trends', projectId] });
      toast.success('Trend detection completed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to detect trends: ${error.message}`);
    },
  });
}

// Document Scores
export function useDocumentScores(projectId: string) {
  return useQuery<DocumentScore[]>({
    queryKey: ['document-scores', projectId],
    queryFn: () => analyticsService.getDocumentScores(projectId),
    enabled: !!projectId,
  });
}

export function useDocumentScore(documentId: string | null) {
  return useQuery<DocumentScore | null>({
    queryKey: ['document-score', documentId],
    queryFn: () => analyticsService.getDocumentScore(documentId!),
    enabled: !!documentId,
  });
}

export function useScoreDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => analyticsService.scoreDocument(documentId),
    onSuccess: (score) => {
      queryClient.invalidateQueries({ queryKey: ['document-scores', score.project_id] });
      queryClient.invalidateQueries({ queryKey: ['document-score', score.document_id] });
      toast.success('Document scored successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to score document: ${error.message}`);
    },
  });
}

export function useScoreAllDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => analyticsService.scoreAllDocuments(projectId),
    onSuccess: (result, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['document-scores', projectId] });
      toast.success(`Scored ${result.scored} documents (${result.failed} failed)`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to score documents: ${error.message}`);
    },
  });
}

// Executive Briefings
export function useExecutiveBriefings(projectId: string) {
  return useQuery<ExecutiveBriefing[]>({
    queryKey: ['executive-briefings', projectId],
    queryFn: () => analyticsService.getBriefings(projectId),
    enabled: !!projectId,
  });
}

export function useExecutiveBriefing(briefingId: string | null) {
  return useQuery<ExecutiveBriefing | null>({
    queryKey: ['executive-briefing', briefingId],
    queryFn: () => analyticsService.getBriefing(briefingId!),
    enabled: !!briefingId,
  });
}

export function useGenerateBriefing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      periodStart,
      periodEnd,
      title,
    }: {
      projectId: string;
      periodStart: Date;
      periodEnd: Date;
      title?: string;
    }) => analyticsService.generateBriefing(projectId, periodStart, periodEnd, title),
    onSuccess: (briefing) => {
      queryClient.invalidateQueries({ queryKey: ['executive-briefings', briefing.project_id] });
      toast.success('Executive briefing generated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate briefing: ${error.message}`);
    },
  });
}

export function useDeleteBriefing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ briefingId, projectId }: { briefingId: string; projectId: string }) =>
      analyticsService.deleteBriefing(briefingId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['executive-briefings', projectId] });
      toast.success('Briefing deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete briefing: ${error.message}`);
    },
  });
}

// Document Anomalies
export function useDocumentAnomalies(projectId: string, includeResolved = false) {
  return useQuery<DocumentAnomaly[]>({
    queryKey: ['document-anomalies', projectId, includeResolved],
    queryFn: () => analyticsService.getAnomalies(projectId, includeResolved),
    enabled: !!projectId,
  });
}

export function useDetectAnomalies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => analyticsService.detectAnomalies(projectId),
    onSuccess: (anomalies, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['document-anomalies', projectId] });
      if (anomalies.length > 0) {
        toast.warning(`Detected ${anomalies.length} anomalies`);
      } else {
        toast.success('No anomalies detected');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to detect anomalies: ${error.message}`);
    },
  });
}

export function useResolveAnomaly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      anomalyId,
      resolutionNotes,
    }: {
      anomalyId: string;
      resolutionNotes: string;
      projectId: string;
    }) => analyticsService.resolveAnomaly(anomalyId, resolutionNotes),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['document-anomalies', projectId] });
      toast.success('Anomaly resolved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to resolve anomaly: ${error.message}`);
    },
  });
}

// Natural Language Queries
export function useAnalyticsQueryHistory(projectId: string, limit = 20) {
  return useQuery<AnalyticsQuery[]>({
    queryKey: ['analytics-queries', projectId, limit],
    queryFn: () => analyticsService.getQueryHistory(projectId, limit),
    enabled: !!projectId,
  });
}

export function useExecuteAnalyticsQuery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, query }: { projectId: string; query: string }) =>
      analyticsService.executeQuery(projectId, query),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['analytics-queries', projectId] });
    },
    onError: (error: Error) => {
      toast.error(`Query failed: ${error.message}`);
    },
  });
}

// Analytics Summary
export function useAnalyticsSummary(projectId: string) {
  return useQuery<AnalyticsSummary>({
    queryKey: ['analytics-summary', projectId],
    queryFn: () => analyticsService.getProjectSummary(projectId),
    enabled: !!projectId,
    staleTime: 30000, // Cache for 30 seconds
  });
}
