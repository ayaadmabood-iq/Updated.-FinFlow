// ============= AI Quality Metrics v1.0 =============
// Continuously observe AI behavior across time, models, and features
// Features: Embedding quality, search relevance, summarization quality
// Mental model: Quality is not a binary state, it's a time series

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============= Types =============

export type MetricType = 
  | 'embedding_quality'
  | 'search_relevance'
  | 'summarization'
  | 'chunking'
  | 'extraction'
  | 'language_detection'
  | 'cost';

export interface QualityMetric {
  id: string;
  projectId: string;
  metricType: MetricType;
  metricName: string;
  metricValue: number;
  dimension: string;
  sampleSize: number;
  metadata: Record<string, unknown>;
  modelVersion: string;
  measuredAt: string;
}

export interface MetricTrend {
  metric: string;
  values: Array<{ timestamp: string; value: number }>;
  trend: 'improving' | 'stable' | 'degrading';
  changePercent: number;
}

export interface QualityReport {
  projectId: string;
  generatedAt: string;
  overallHealth: 'good' | 'warning' | 'critical';
  metrics: {
    embedding: MetricSummary;
    search: MetricSummary;
    summarization: MetricSummary;
    chunking: MetricSummary;
  };
  alerts: QualityAlert[];
  recommendations: string[];
}

export interface MetricSummary {
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'stable';
  sampleSize: number;
}

export interface QualityAlert {
  severity: 'info' | 'warning' | 'error';
  metric: string;
  message: string;
  value: number;
  threshold: number;
}

// ============= Quality Thresholds =============

export const QUALITY_THRESHOLDS = {
  embedding_quality: {
    min_coherence: 0.6,
    min_coverage: 0.8,
  },
  search_relevance: {
    min_precision: 0.7,
    min_recall: 0.6,
    min_ndcg: 0.7,
    max_latency_ms: 500,
  },
  summarization: {
    min_rouge_l: 0.5,
    min_coherence: 0.7,
    max_hallucination_rate: 0.1,
  },
  chunking: {
    min_coherence: 0.6,
    max_avg_size_variance: 0.3,
    max_duplicate_rate: 0.1,
  },
};

// ============= ROUGE Score Calculation =============

/**
 * Calculate ROUGE-L score for summarization quality
 * ROUGE-L uses longest common subsequence
 */
export function calculateRougeL(reference: string, candidate: string): number {
  const refTokens = tokenize(reference);
  const candTokens = tokenize(candidate);
  
  if (refTokens.length === 0 || candTokens.length === 0) return 0;
  
  const lcsLength = longestCommonSubsequence(refTokens, candTokens);
  
  const precision = lcsLength / candTokens.length;
  const recall = lcsLength / refTokens.length;
  
  if (precision + recall === 0) return 0;
  
  // F1 score
  return (2 * precision * recall) / (precision + recall);
}

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

function longestCommonSubsequence(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  return dp[m][n];
}

// ============= Embedding Quality Metrics =============

/**
 * Calculate embedding quality based on semantic coherence
 */
export function calculateEmbeddingCoherence(
  embeddings: number[][],
  expectedSimilar: Array<[number, number]>,
  expectedDissimilar: Array<[number, number]>
): number {
  if (embeddings.length < 2) return 1;
  
  let correctSimilar = 0;
  let correctDissimilar = 0;
  
  for (const [i, j] of expectedSimilar) {
    const sim = cosineSimilarity(embeddings[i], embeddings[j]);
    if (sim > 0.7) correctSimilar++;
  }
  
  for (const [i, j] of expectedDissimilar) {
    const sim = cosineSimilarity(embeddings[i], embeddings[j]);
    if (sim < 0.3) correctDissimilar++;
  }
  
  const totalTests = expectedSimilar.length + expectedDissimilar.length;
  if (totalTests === 0) return 1;
  
  return (correctSimilar + correctDissimilar) / totalTests;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude > 0 ? dotProduct / magnitude : 0;
}

// ============= AI Quality Service =============

export class AIQualityService {
  private supabase: SupabaseClient;
  private projectId: string;
  
  constructor(supabase: SupabaseClient, projectId: string) {
    this.supabase = supabase;
    this.projectId = projectId;
  }
  
  /**
   * Record a quality metric
   */
  async recordMetric(
    metricType: MetricType,
    metricName: string,
    metricValue: number,
    dimension: string,
    sampleSize: number = 1,
    metadata: Record<string, unknown> = {},
    modelVersion: string = 'v6.0'
  ): Promise<void> {
    await this.supabase.from('ai_quality_metrics').insert({
      project_id: this.projectId,
      metric_type: metricType,
      metric_name: metricName,
      metric_value: metricValue,
      dimension,
      sample_size: sampleSize,
      metadata,
      model_version: modelVersion,
    });
  }
  
  /**
   * Record summarization quality
   */
  async recordSummarizationQuality(
    documentId: string,
    originalText: string,
    summary: string,
    referenceText?: string
  ): Promise<{ rougeL: number; coherence: number }> {
    // Calculate ROUGE-L if reference available
    const rougeL = referenceText 
      ? calculateRougeL(referenceText, summary)
      : calculateRougeL(originalText, summary);
    
    // Simple coherence check: summary should be shorter but cover key terms
    const originalTerms = new Set(tokenize(originalText).slice(0, 50));
    const summaryTerms = new Set(tokenize(summary));
    const overlap = [...summaryTerms].filter(t => originalTerms.has(t)).length;
    const coherence = overlap / Math.max(summaryTerms.size, 1);
    
    await this.recordMetric(
      'summarization',
      'document_summary',
      rougeL,
      'rouge_l',
      1,
      { document_id: documentId, summary_length: summary.length }
    );
    
    await this.recordMetric(
      'summarization',
      'document_summary',
      coherence,
      'coherence',
      1,
      { document_id: documentId }
    );
    
    return { rougeL, coherence };
  }
  
  /**
   * Record chunking quality
   */
  async recordChunkingQuality(
    documentId: string,
    chunks: string[],
    coherenceScores: number[],
    duplicateCount: number
  ): Promise<void> {
    const avgCoherence = coherenceScores.length > 0
      ? coherenceScores.reduce((a, b) => a + b, 0) / coherenceScores.length
      : 0;
    
    const avgSize = chunks.reduce((s, c) => s + c.length, 0) / Math.max(chunks.length, 1);
    const sizeVariance = chunks.length > 0
      ? Math.sqrt(chunks.reduce((s, c) => s + Math.pow(c.length - avgSize, 2), 0) / chunks.length) / avgSize
      : 0;
    
    const duplicateRate = chunks.length > 0 ? duplicateCount / chunks.length : 0;
    
    await this.recordMetric(
      'chunking',
      'chunk_quality',
      avgCoherence,
      'avg_coherence',
      chunks.length,
      { document_id: documentId }
    );
    
    await this.recordMetric(
      'chunking',
      'chunk_quality',
      sizeVariance,
      'size_variance',
      chunks.length,
      { document_id: documentId, avg_size: avgSize }
    );
    
    await this.recordMetric(
      'chunking',
      'chunk_quality',
      duplicateRate,
      'duplicate_rate',
      chunks.length,
      { document_id: documentId, duplicate_count: duplicateCount }
    );
  }
  
  /**
   * Record search quality from evaluation
   */
  async recordSearchQuality(
    precision: number,
    recall: number,
    ndcg: number,
    latencyMs: number,
    searchMode: string
  ): Promise<void> {
    const metadata = { search_mode: searchMode };
    
    await this.recordMetric('search_relevance', 'search_quality', precision, 'precision', 1, metadata);
    await this.recordMetric('search_relevance', 'search_quality', recall, 'recall', 1, metadata);
    await this.recordMetric('search_relevance', 'search_quality', ndcg, 'ndcg', 1, metadata);
    await this.recordMetric('search_relevance', 'search_quality', latencyMs, 'latency_ms', 1, metadata);
  }
  
  /**
   * Get metric trend over time
   */
  async getMetricTrend(
    metricType: MetricType,
    dimension: string,
    days: number = 30
  ): Promise<MetricTrend> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const { data } = await this.supabase
      .from('ai_quality_metrics')
      .select('metric_value, measured_at')
      .eq('project_id', this.projectId)
      .eq('metric_type', metricType)
      .eq('dimension', dimension)
      .gte('measured_at', startDate)
      .order('measured_at', { ascending: true });
    
    if (!data || data.length < 2) {
      return {
        metric: `${metricType}:${dimension}`,
        values: data?.map(d => ({ timestamp: d.measured_at, value: d.metric_value })) || [],
        trend: 'stable',
        changePercent: 0,
      };
    }
    
    const values = data.map(d => ({ timestamp: d.measured_at, value: d.metric_value }));
    
    // Calculate trend using linear regression
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((s, v) => s + v.value, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i].value - yMean);
      denominator += (i - xMean) ** 2;
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const firstValue = values[0].value;
    const lastValue = values[n - 1].value;
    const changePercent = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
    
    let trend: MetricTrend['trend'] = 'stable';
    if (Math.abs(changePercent) > 5) {
      trend = slope > 0 ? 'improving' : 'degrading';
    }
    
    return {
      metric: `${metricType}:${dimension}`,
      values,
      trend,
      changePercent,
    };
  }
  
  /**
   * Generate quality report
   */
  async generateReport(): Promise<QualityReport> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    // Get current week metrics
    const { data: currentMetrics } = await this.supabase
      .from('ai_quality_metrics')
      .select('*')
      .eq('project_id', this.projectId)
      .gte('measured_at', weekAgo.toISOString());
    
    // Get previous week metrics
    const { data: previousMetrics } = await this.supabase
      .from('ai_quality_metrics')
      .select('*')
      .eq('project_id', this.projectId)
      .gte('measured_at', twoWeeksAgo.toISOString())
      .lt('measured_at', weekAgo.toISOString());
    
    const summarize = (
      metrics: typeof currentMetrics,
      prevMetrics: typeof previousMetrics,
      type: MetricType,
      dimension: string
    ): MetricSummary => {
      const current = metrics?.filter(m => m.metric_type === type && m.dimension === dimension) || [];
      const previous = prevMetrics?.filter(m => m.metric_type === type && m.dimension === dimension) || [];
      
      const currentAvg = current.length > 0
        ? current.reduce((s, m) => s + m.metric_value, 0) / current.length
        : 0;
      const previousAvg = previous.length > 0
        ? previous.reduce((s, m) => s + m.metric_value, 0) / previous.length
        : 0;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (currentAvg > previousAvg * 1.05) trend = 'up';
      if (currentAvg < previousAvg * 0.95) trend = 'down';
      
      return {
        current: currentAvg,
        previous: previousAvg,
        trend,
        sampleSize: current.length,
      };
    };
    
    const embedding = summarize(currentMetrics, previousMetrics, 'embedding_quality', 'coherence');
    const search = summarize(currentMetrics, previousMetrics, 'search_relevance', 'precision');
    const summarization = summarize(currentMetrics, previousMetrics, 'summarization', 'rouge_l');
    const chunking = summarize(currentMetrics, previousMetrics, 'chunking', 'avg_coherence');
    
    // Generate alerts
    const alerts: QualityAlert[] = [];
    
    if (search.current < QUALITY_THRESHOLDS.search_relevance.min_precision) {
      alerts.push({
        severity: 'warning',
        metric: 'search_precision',
        message: 'Search precision below threshold',
        value: search.current,
        threshold: QUALITY_THRESHOLDS.search_relevance.min_precision,
      });
    }
    
    if (chunking.current < QUALITY_THRESHOLDS.chunking.min_coherence) {
      alerts.push({
        severity: 'warning',
        metric: 'chunking_coherence',
        message: 'Chunking coherence below threshold',
        value: chunking.current,
        threshold: QUALITY_THRESHOLDS.chunking.min_coherence,
      });
    }
    
    // Determine overall health
    let overallHealth: QualityReport['overallHealth'] = 'good';
    if (alerts.some(a => a.severity === 'error')) {
      overallHealth = 'critical';
    } else if (alerts.some(a => a.severity === 'warning')) {
      overallHealth = 'warning';
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (search.trend === 'down') {
      recommendations.push('Consider re-evaluating gold standards and search configuration');
    }
    if (chunking.current < 0.6) {
      recommendations.push('Try embedding_cluster or ai_topic chunking strategy for better coherence');
    }
    
    return {
      projectId: this.projectId,
      generatedAt: now.toISOString(),
      overallHealth,
      metrics: { embedding, search, summarization, chunking },
      alerts,
      recommendations,
    };
  }
}

// ============= Factory Function =============

export function createAIQualityService(
  supabase: SupabaseClient,
  projectId: string
): AIQualityService {
  return new AIQualityService(supabase, projectId);
}
