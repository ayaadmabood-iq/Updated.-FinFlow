// ============= AI Evaluation Hooks v1.0 =============
// React hooks for retrieval evaluation and quality metrics
// Surfaces AI quality in admin dashboards

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============= Types =============

export interface GoldStandard {
  id: string;
  projectId: string;
  query: string;
  expectedAnswer: string;
  expectedDocumentIds: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface EvaluationMetrics {
  precisionAtK: number;
  recallAtK: number;
  ndcgAtK: number;
  latencyMs: number;
}

export interface RetrievalEvaluation {
  id: string;
  projectId: string;
  goldStandardId: string | null;
  query: string;
  searchMode: string;
  results: Array<{ documentId: string; similarity: number }>;
  metrics: EvaluationMetrics;
  modelVersion: string;
  embeddingModel: string;
  evaluatedAt: string;
}

export interface AIQualityMetric {
  id: string;
  projectId: string;
  metricType: string;
  metricName: string;
  metricValue: number;
  dimension: string;
  sampleSize: number;
  metadata: Record<string, unknown>;
  modelVersion: string;
  measuredAt: string;
}

export interface QualityTrend {
  metric: string;
  values: Array<{ timestamp: string; value: number }>;
  trend: 'improving' | 'stable' | 'degrading';
  changePercent: number;
}

// ============= Gold Standard Hooks =============

export function useGoldStandards(projectId: string) {
  return useQuery({
    queryKey: ['goldStandards', projectId],
    queryFn: async (): Promise<GoldStandard[]> => {
      const { data, error } = await supabase
        .from('gold_standard_answers')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        projectId: row.project_id as string,
        query: row.query as string,
        expectedAnswer: (row.expected_answer as string) || '',
        expectedDocumentIds: (row.expected_document_ids as string[]) || [],
        metadata: (row.metadata as Record<string, unknown>) || {},
        createdAt: row.created_at as string,
      }));
    },
    enabled: !!projectId,
  });
}

export function useCreateGoldStandard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      projectId: string;
      query: string;
      expectedAnswer: string;
      expectedDocumentIds: string[];
      metadata?: Record<string, unknown>;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('gold_standard_answers')
        .insert({
          project_id: input.projectId,
          query: input.query,
          gold_response: input.expectedAnswer,
          incorrect_response: '',
          source_document_ids: input.expectedDocumentIds,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goldStandards', variables.projectId] });
      toast.success('Gold standard created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create gold standard: ${error.message}`);
    },
  });
}

export function useDeleteGoldStandard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('gold_standard_answers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['goldStandards', projectId] });
      toast.success('Gold standard deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}

// ============= Evaluation Hooks =============

export function useRetrievalEvaluations(projectId: string, limit = 50) {
  return useQuery({
    queryKey: ['retrievalEvaluations', projectId, limit],
    queryFn: async (): Promise<RetrievalEvaluation[]> => {
      const { data, error } = await supabase
        .from('retrieval_evaluations')
        .select('*')
        .eq('project_id', projectId)
        .order('evaluated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        projectId: row.project_id as string,
        goldStandardId: row.gold_standard_id as string | null,
        query: row.query as string,
        searchMode: row.search_mode as string,
        results: (Array.isArray(row.results) ? row.results : []) as Array<{ documentId: string; similarity: number }>,
        metrics: {
          precisionAtK: (row.precision_at_k as number) || 0,
          recallAtK: (row.recall_at_k as number) || 0,
          ndcgAtK: (row.ndcg_at_k as number) || 0,
          latencyMs: (row.latency_ms as number) || 0,
        },
        modelVersion: (row.model_version as string) || '',
        embeddingModel: (row.embedding_model as string) || '',
        evaluatedAt: row.evaluated_at as string,
      }));
    },
    enabled: !!projectId,
  });
}

export function useRunBenchmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { projectId: string; searchModes?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('run-rag-evaluation', {
        body: {
          projectId: input.projectId,
          searchModes: input.searchModes || ['hybrid', 'semantic', 'fulltext'],
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['retrievalEvaluations', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['aiQualityMetrics', variables.projectId] });
      toast.success('Benchmark complete');
    },
    onError: (error: Error) => {
      toast.error(`Benchmark failed: ${error.message}`);
    },
  });
}

// ============= Quality Metrics Hooks =============

export function useAIQualityMetrics(projectId: string, metricType?: string, days = 30) {
  return useQuery({
    queryKey: ['aiQualityMetrics', projectId, metricType, days],
    queryFn: async (): Promise<AIQualityMetric[]> => {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      
      let query = supabase
        .from('ai_quality_metrics')
        .select('*')
        .eq('project_id', projectId)
        .gte('measured_at', startDate)
        .order('measured_at', { ascending: false });

      if (metricType) {
        query = query.eq('metric_type', metricType);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        projectId: row.project_id as string,
        metricType: row.metric_type as string,
        metricName: row.metric_name as string,
        metricValue: row.metric_value as number,
        dimension: row.dimension as string,
        sampleSize: (row.sample_size as number) || 1,
        metadata: (typeof row.metadata === 'object' && row.metadata !== null ? row.metadata : {}) as Record<string, unknown>,
        modelVersion: (row.model_version as string) || '',
        measuredAt: row.measured_at as string,
      }));
    },
    enabled: !!projectId,
  });
}

export function useQualityTrend(
  projectId: string,
  metricType: string,
  dimension: string,
  days = 30
) {
  return useQuery({
    queryKey: ['qualityTrend', projectId, metricType, dimension, days],
    queryFn: async (): Promise<QualityTrend> => {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('ai_quality_metrics')
        .select('metric_value, measured_at')
        .eq('project_id', projectId)
        .eq('metric_type', metricType)
        .eq('dimension', dimension)
        .gte('measured_at', startDate)
        .order('measured_at', { ascending: true });

      if (error) throw error;

      const values = (data || []).map(d => ({
        timestamp: d.measured_at,
        value: d.metric_value,
      }));

      if (values.length < 2) {
        return {
          metric: `${metricType}:${dimension}`,
          values,
          trend: 'stable',
          changePercent: 0,
        };
      }

      const firstValue = values[0].value;
      const lastValue = values[values.length - 1].value;
      const changePercent = firstValue !== 0 
        ? ((lastValue - firstValue) / firstValue) * 100 
        : 0;

      let trend: QualityTrend['trend'] = 'stable';
      if (Math.abs(changePercent) > 5) {
        trend = changePercent > 0 ? 'improving' : 'degrading';
      }

      return {
        metric: `${metricType}:${dimension}`,
        values,
        trend,
        changePercent,
      };
    },
    enabled: !!projectId && !!metricType && !!dimension,
  });
}

// ============= Aggregated Quality Report =============

export function useQualityReport(projectId: string) {
  return useQuery({
    queryKey: ['qualityReport', projectId],
    queryFn: async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Current week metrics
      const { data: currentMetrics } = await supabase
        .from('ai_quality_metrics')
        .select('*')
        .eq('project_id', projectId)
        .gte('measured_at', weekAgo.toISOString());

      // Previous week metrics
      const { data: previousMetrics } = await supabase
        .from('ai_quality_metrics')
        .select('*')
        .eq('project_id', projectId)
        .gte('measured_at', twoWeeksAgo.toISOString())
        .lt('measured_at', weekAgo.toISOString());

      const summarize = (
        current: typeof currentMetrics,
        previous: typeof previousMetrics,
        type: string,
        dimension: string
      ) => {
        const curr = current?.filter(m => m.metric_type === type && m.dimension === dimension) || [];
        const prev = previous?.filter(m => m.metric_type === type && m.dimension === dimension) || [];

        const currentAvg = curr.length > 0
          ? curr.reduce((s, m) => s + m.metric_value, 0) / curr.length
          : 0;
        const previousAvg = prev.length > 0
          ? prev.reduce((s, m) => s + m.metric_value, 0) / prev.length
          : 0;

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (currentAvg > previousAvg * 1.05) trend = 'up';
        if (currentAvg < previousAvg * 0.95) trend = 'down';

        return { current: currentAvg, previous: previousAvg, trend, sampleSize: curr.length };
      };

      return {
        projectId,
        generatedAt: now.toISOString(),
        metrics: {
          embedding: summarize(currentMetrics, previousMetrics, 'embedding_quality', 'coherence'),
          search: summarize(currentMetrics, previousMetrics, 'search_relevance', 'precision'),
          summarization: summarize(currentMetrics, previousMetrics, 'summarization', 'rouge_l'),
          chunking: summarize(currentMetrics, previousMetrics, 'chunking', 'avg_coherence'),
        },
      };
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============= Injection Detection Logs =============

export function useInjectionLogs(projectId?: string, limit = 100) {
  return useQuery({
    queryKey: ['injectionLogs', projectId, limit],
    queryFn: async () => {
      let query = supabase
        .from('injection_detection_logs')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(limit);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: true,
  });
}

// ============= Chunking Strategy Options =============

export const CHUNKING_STRATEGIES = [
  { 
    value: 'fixed', 
    label: 'Fixed Size', 
    description: 'Split by character count with overlap',
    quality: 'low',
  },
  { 
    value: 'sentence', 
    label: 'Sentence', 
    description: 'Split at sentence boundaries',
    quality: 'medium',
  },
  { 
    value: 'heuristic_semantic', 
    label: 'Heuristic Semantic', 
    description: 'Sentence-based with size constraints (rule-based)',
    quality: 'medium',
  },
  { 
    value: 'embedding_cluster', 
    label: 'Embedding Cluster', 
    description: 'True semantic chunking using embedding similarity',
    quality: 'high',
  },
  { 
    value: 'ai_topic', 
    label: 'AI Topic Detection', 
    description: 'LLM-powered topic boundary detection (highest quality)',
    quality: 'highest',
  },
] as const;

export type ChunkingStrategy = typeof CHUNKING_STRATEGIES[number]['value'];
