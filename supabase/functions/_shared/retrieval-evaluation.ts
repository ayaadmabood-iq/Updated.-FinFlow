// ============= Retrieval Evaluation Framework v1.0 =============
// Close the loop on search quality - make retrieval measurable
// Features: Precision@k, Recall@k, NDCG@k, latency tracking, A/B testing
// Principle: Retrieval without evaluation is guessing with confidence

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============= Types =============

export interface GoldStandard {
  id: string;
  projectId: string;
  query: string;
  expectedAnswer: string;
  expectedDocumentIds: string[];
  metadata: Record<string, unknown>;
}

export interface SearchResult {
  documentId: string;
  similarity: number;
  content?: string;
}

export interface EvaluationMetrics {
  precisionAtK: number;
  recallAtK: number;
  ndcgAtK: number;
  latencyMs: number;
  reciprocalRank: number;
  hitRate: number;
}

export interface EvaluationRun {
  id: string;
  projectId: string;
  goldStandardId: string | null;
  query: string;
  searchMode: string;
  results: SearchResult[];
  metrics: EvaluationMetrics;
  modelVersion: string;
  embeddingModel: string;
  evaluatedAt: string;
}

export interface BenchmarkResult {
  totalQueries: number;
  avgPrecision: number;
  avgRecall: number;
  avgNDCG: number;
  avgLatency: number;
  avgReciprocalRank: number;
  hitRate: number;
  bySearchMode: Record<string, EvaluationMetrics>;
  failures: Array<{ query: string; reason: string }>;
}

// ============= Metric Calculations =============

/**
 * Calculate Precision@K: proportion of top-k results that are relevant
 */
export function calculatePrecisionAtK(
  retrievedIds: string[],
  relevantIds: string[],
  k: number
): number {
  if (k <= 0 || retrievedIds.length === 0) return 0;
  
  const topK = retrievedIds.slice(0, k);
  const relevantSet = new Set(relevantIds);
  const relevantInTopK = topK.filter(id => relevantSet.has(id)).length;
  
  return relevantInTopK / Math.min(k, topK.length);
}

/**
 * Calculate Recall@K: proportion of relevant items found in top-k
 */
export function calculateRecallAtK(
  retrievedIds: string[],
  relevantIds: string[],
  k: number
): number {
  if (k <= 0 || relevantIds.length === 0) return 0;
  
  const topK = retrievedIds.slice(0, k);
  const relevantSet = new Set(relevantIds);
  const relevantInTopK = topK.filter(id => relevantSet.has(id)).length;
  
  return relevantInTopK / relevantIds.length;
}

/**
 * Calculate NDCG@K: Normalized Discounted Cumulative Gain
 * Accounts for position of relevant results
 */
export function calculateNDCGAtK(
  retrievedIds: string[],
  relevantIds: string[],
  k: number
): number {
  if (k <= 0 || relevantIds.length === 0) return 0;
  
  const relevantSet = new Set(relevantIds);
  const topK = retrievedIds.slice(0, k);
  
  // Calculate DCG
  let dcg = 0;
  for (let i = 0; i < topK.length; i++) {
    const relevance = relevantSet.has(topK[i]) ? 1 : 0;
    dcg += relevance / Math.log2(i + 2); // +2 because positions are 1-indexed
  }
  
  // Calculate ideal DCG (all relevant items at top)
  let idcg = 0;
  const idealK = Math.min(k, relevantIds.length);
  for (let i = 0; i < idealK; i++) {
    idcg += 1 / Math.log2(i + 2);
  }
  
  return idcg > 0 ? dcg / idcg : 0;
}

/**
 * Calculate Mean Reciprocal Rank
 */
export function calculateReciprocalRank(
  retrievedIds: string[],
  relevantIds: string[]
): number {
  const relevantSet = new Set(relevantIds);
  
  for (let i = 0; i < retrievedIds.length; i++) {
    if (relevantSet.has(retrievedIds[i])) {
      return 1 / (i + 1);
    }
  }
  
  return 0;
}

/**
 * Calculate all metrics for a single query
 */
export function calculateAllMetrics(
  results: SearchResult[],
  expectedDocumentIds: string[],
  latencyMs: number,
  k: number = 10
): EvaluationMetrics {
  const retrievedIds = results.map(r => r.documentId);
  
  return {
    precisionAtK: calculatePrecisionAtK(retrievedIds, expectedDocumentIds, k),
    recallAtK: calculateRecallAtK(retrievedIds, expectedDocumentIds, k),
    ndcgAtK: calculateNDCGAtK(retrievedIds, expectedDocumentIds, k),
    latencyMs,
    reciprocalRank: calculateReciprocalRank(retrievedIds, expectedDocumentIds),
    hitRate: retrievedIds.some(id => expectedDocumentIds.includes(id)) ? 1 : 0,
  };
}

// ============= Evaluation Service =============

export class RetrievalEvaluationService {
  private supabase: SupabaseClient;
  private projectId: string;
  
  constructor(supabase: SupabaseClient, projectId: string) {
    this.supabase = supabase;
    this.projectId = projectId;
  }
  
  /**
   * Create a gold standard Q&A pair
   */
  async createGoldStandard(
    query: string,
    expectedAnswer: string,
    expectedDocumentIds: string[],
    metadata: Record<string, unknown> = {}
  ): Promise<{ id: string; error?: string }> {
    const { data, error } = await this.supabase
      .from('gold_standard_answers')
      .insert({
        project_id: this.projectId,
        query,
        expected_answer: expectedAnswer,
        expected_document_ids: expectedDocumentIds,
        metadata,
      })
      .select('id')
      .single();
    
    if (error) {
      return { id: '', error: error.message };
    }
    
    return { id: data.id };
  }
  
  /**
   * Get all gold standards for project
   */
  async getGoldStandards(): Promise<GoldStandard[]> {
    const { data, error } = await this.supabase
      .from('gold_standard_answers')
      .select('*')
      .eq('project_id', this.projectId)
      .order('created_at', { ascending: false });
    
    if (error || !data) return [];
    
    return data.map(row => ({
      id: row.id,
      projectId: row.project_id,
      query: row.query,
      expectedAnswer: row.expected_answer,
      expectedDocumentIds: row.expected_document_ids || [],
      metadata: row.metadata || {},
    }));
  }
  
  /**
   * Run evaluation for a single query
   */
  async evaluateQuery(
    query: string,
    searchFn: (q: string) => Promise<{ results: SearchResult[]; latencyMs: number }>,
    expectedDocumentIds: string[],
    searchMode: string = 'hybrid',
    goldStandardId?: string
  ): Promise<EvaluationRun> {
    const { results, latencyMs } = await searchFn(query);
    const metrics = calculateAllMetrics(results, expectedDocumentIds, latencyMs);
    
    // Get current model version
    const modelVersion = await this.getModelVersion();
    
    // Store evaluation
    const { data } = await this.supabase
      .from('retrieval_evaluations')
      .insert({
        project_id: this.projectId,
        gold_standard_id: goldStandardId || null,
        query,
        search_mode: searchMode,
        results,
        precision_at_k: metrics.precisionAtK,
        recall_at_k: metrics.recallAtK,
        ndcg_at_k: metrics.ndcgAtK,
        latency_ms: latencyMs,
        model_version: modelVersion,
        embedding_model: 'text-embedding-3-small',
      })
      .select('id')
      .single();
    
    return {
      id: data?.id || '',
      projectId: this.projectId,
      goldStandardId: goldStandardId || null,
      query,
      searchMode,
      results,
      metrics,
      modelVersion,
      embeddingModel: 'text-embedding-3-small',
      evaluatedAt: new Date().toISOString(),
    };
  }
  
  /**
   * Run benchmark across all gold standards
   */
  async runBenchmark(
    searchFn: (q: string) => Promise<{ results: SearchResult[]; latencyMs: number }>,
    searchModes: string[] = ['hybrid']
  ): Promise<BenchmarkResult> {
    const goldStandards = await this.getGoldStandards();
    
    if (goldStandards.length === 0) {
      return {
        totalQueries: 0,
        avgPrecision: 0,
        avgRecall: 0,
        avgNDCG: 0,
        avgLatency: 0,
        avgReciprocalRank: 0,
        hitRate: 0,
        bySearchMode: {},
        failures: [],
      };
    }
    
    const allMetrics: EvaluationMetrics[] = [];
    const bySearchMode: Record<string, EvaluationMetrics[]> = {};
    const failures: Array<{ query: string; reason: string }> = [];
    
    for (const searchMode of searchModes) {
      bySearchMode[searchMode] = [];
    }
    
    for (const gs of goldStandards) {
      for (const searchMode of searchModes) {
        try {
          const run = await this.evaluateQuery(
            gs.query,
            searchFn,
            gs.expectedDocumentIds,
            searchMode,
            gs.id
          );
          
          allMetrics.push(run.metrics);
          bySearchMode[searchMode].push(run.metrics);
        } catch (err) {
          failures.push({
            query: gs.query,
            reason: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }
    
    // Aggregate metrics
    const aggregate = (metrics: EvaluationMetrics[]): EvaluationMetrics => {
      if (metrics.length === 0) {
        return {
          precisionAtK: 0,
          recallAtK: 0,
          ndcgAtK: 0,
          latencyMs: 0,
          reciprocalRank: 0,
          hitRate: 0,
        };
      }
      
      return {
        precisionAtK: metrics.reduce((s, m) => s + m.precisionAtK, 0) / metrics.length,
        recallAtK: metrics.reduce((s, m) => s + m.recallAtK, 0) / metrics.length,
        ndcgAtK: metrics.reduce((s, m) => s + m.ndcgAtK, 0) / metrics.length,
        latencyMs: metrics.reduce((s, m) => s + m.latencyMs, 0) / metrics.length,
        reciprocalRank: metrics.reduce((s, m) => s + m.reciprocalRank, 0) / metrics.length,
        hitRate: metrics.reduce((s, m) => s + m.hitRate, 0) / metrics.length,
      };
    };
    
    const overall = aggregate(allMetrics);
    
    const byModeAggregated: Record<string, EvaluationMetrics> = {};
    for (const [mode, metrics] of Object.entries(bySearchMode)) {
      byModeAggregated[mode] = aggregate(metrics);
    }
    
    return {
      totalQueries: goldStandards.length * searchModes.length,
      avgPrecision: overall.precisionAtK,
      avgRecall: overall.recallAtK,
      avgNDCG: overall.ndcgAtK,
      avgLatency: overall.latencyMs,
      avgReciprocalRank: overall.reciprocalRank,
      hitRate: overall.hitRate,
      bySearchMode: byModeAggregated,
      failures,
    };
  }
  
  /**
   * Get evaluation history
   */
  async getEvaluationHistory(limit: number = 100): Promise<EvaluationRun[]> {
    const { data, error } = await this.supabase
      .from('retrieval_evaluations')
      .select('*')
      .eq('project_id', this.projectId)
      .order('evaluated_at', { ascending: false })
      .limit(limit);
    
    if (error || !data) return [];
    
    return data.map(row => ({
      id: row.id,
      projectId: row.project_id,
      goldStandardId: row.gold_standard_id,
      query: row.query,
      searchMode: row.search_mode,
      results: row.results || [],
      metrics: {
        precisionAtK: row.precision_at_k || 0,
        recallAtK: row.recall_at_k || 0,
        ndcgAtK: row.ndcg_at_k || 0,
        latencyMs: row.latency_ms || 0,
        reciprocalRank: 0, // Not stored
        hitRate: 0, // Not stored
      },
      modelVersion: row.model_version || '',
      embeddingModel: row.embedding_model || '',
      evaluatedAt: row.evaluated_at,
    }));
  }
  
  /**
   * Compare two evaluation runs or periods
   */
  async compareEvaluations(
    runA: EvaluationRun,
    runB: EvaluationRun
  ): Promise<{
    improved: string[];
    regressed: string[];
    unchanged: string[];
    delta: Record<string, number>;
  }> {
    const metrics = ['precisionAtK', 'recallAtK', 'ndcgAtK', 'latencyMs'] as const;
    const improved: string[] = [];
    const regressed: string[] = [];
    const unchanged: string[] = [];
    const delta: Record<string, number> = {};
    
    for (const metric of metrics) {
      const valueA = runA.metrics[metric];
      const valueB = runB.metrics[metric];
      const diff = valueB - valueA;
      delta[metric] = diff;
      
      // Latency is better when lower
      const isImproved = metric === 'latencyMs' ? diff < 0 : diff > 0;
      const threshold = metric === 'latencyMs' ? 10 : 0.01;
      
      if (Math.abs(diff) < threshold) {
        unchanged.push(metric);
      } else if (isImproved) {
        improved.push(metric);
      } else {
        regressed.push(metric);
      }
    }
    
    return { improved, regressed, unchanged, delta };
  }
  
  private async getModelVersion(): Promise<string> {
    const { data } = await this.supabase
      .from('projects')
      .select('processing_config')
      .eq('id', this.projectId)
      .single();
    
    return data?.processing_config?.pipeline_version || 'v6.0';
  }
}

// ============= Factory Function =============

export function createRetrievalEvaluationService(
  supabase: SupabaseClient,
  projectId: string
): RetrievalEvaluationService {
  return new RetrievalEvaluationService(supabase, projectId);
}
