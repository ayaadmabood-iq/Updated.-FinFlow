// ============= Monitoring Service =============
// Collects and aggregates metrics for observability
// Tracks: queue depth, stage latency, error rates, cache hit ratio, DB p95 latency

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============= Types =============

export interface StageMetrics {
  stage: string;
  avgDurationMs: number;
  p95DurationMs: number;
  successRate: number;
  totalProcessed: number;
  errorCount: number;
  lastProcessedAt: string | null;
}

export interface QueueMetrics {
  queueName: string;
  pending: number;
  processing: number;
  failed: number;
  retrying: number;
  avgProcessingTime: number;
}

export interface CacheMetrics {
  hitRate: number;
  totalEntries: number;
  entriesByType: Record<string, number>;
}

export interface SystemMetrics {
  stages: StageMetrics[];
  queues: QueueMetrics[];
  cache: CacheMetrics;
  summary: {
    totalDocumentsProcessed24h: number;
    avgProcessingTimeMs: number;
    overallSuccessRate: number;
    criticalErrors: number;
  };
  alerts: Alert[];
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  type: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
}

export interface AlertThresholds {
  stageLatencyP95Ms: number;
  errorRatePercent: number;
  queueDepth: number;
  cacheHitRateMin: number;
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  stageLatencyP95Ms: 30000, // 30 seconds
  errorRatePercent: 10,
  queueDepth: 100,
  cacheHitRateMin: 0.7, // 70%
};

// ============= Monitoring Service Class =============

export class MonitoringService {
  private supabase: SupabaseClient;
  private thresholds: AlertThresholds;

  constructor(supabase: SupabaseClient, thresholds?: Partial<AlertThresholds>) {
    this.supabase = supabase;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  // ============= Collect All Metrics =============

  async collectMetrics(): Promise<SystemMetrics> {
    const [stages, queues, cache, summary] = await Promise.all([
      this.getStageMetrics(),
      this.getQueueMetrics(),
      this.getCacheMetrics(),
      this.getSummaryMetrics(),
    ]);

    const alerts = this.generateAlerts(stages, queues, cache);

    return {
      stages,
      queues,
      cache,
      summary,
      alerts,
    };
  }

  // ============= Stage Metrics =============

  async getStageMetrics(): Promise<StageMetrics[]> {
    const { data, error } = await this.supabase
      .from('pipeline_metrics')
      .select('stage, duration_ms, status, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    // Group by stage
    const byStage: Record<string, Array<{ duration_ms: number; status: string; created_at: string }>> = {};
    for (const row of data) {
      if (!byStage[row.stage]) byStage[row.stage] = [];
      byStage[row.stage].push(row);
    }

    return Object.entries(byStage).map(([stage, metrics]) => {
      const durations = metrics
        .filter(m => m.duration_ms != null && m.status === 'completed')
        .map(m => m.duration_ms)
        .sort((a, b) => a - b);

      const successCount = metrics.filter(m => m.status === 'completed').length;
      const errorCount = metrics.filter(m => m.status === 'failed').length;
      const totalProcessed = metrics.length;

      return {
        stage,
        avgDurationMs: durations.length > 0 
          ? durations.reduce((a, b) => a + b, 0) / durations.length 
          : 0,
        p95DurationMs: durations.length > 0 
          ? durations[Math.floor(durations.length * 0.95)] || durations[durations.length - 1]
          : 0,
        successRate: totalProcessed > 0 ? successCount / totalProcessed : 1,
        totalProcessed,
        errorCount,
        lastProcessedAt: metrics[0]?.created_at || null,
      };
    });
  }

  // ============= Queue Metrics =============

  async getQueueMetrics(): Promise<QueueMetrics[]> {
    const { data, error } = await this.supabase
      .from('queue_jobs')
      .select('queue_name, status, started_at, completed_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error || !data) return [];

    // Group by queue
    const byQueue: Record<string, typeof data> = {};
    for (const job of data) {
      if (!byQueue[job.queue_name]) byQueue[job.queue_name] = [];
      byQueue[job.queue_name].push(job);
    }

    return Object.entries(byQueue).map(([queueName, jobs]) => {
      const pending = jobs.filter(j => j.status === 'pending').length;
      const processing = jobs.filter(j => j.status === 'processing').length;
      const failed = jobs.filter(j => j.status === 'failed').length;
      const retrying = jobs.filter(j => j.status === 'retrying').length;

      const processingTimes = jobs
        .filter(j => j.started_at && j.completed_at)
        .map(j => new Date(j.completed_at!).getTime() - new Date(j.started_at!).getTime());

      return {
        queueName,
        pending,
        processing,
        failed,
        retrying,
        avgProcessingTime: processingTimes.length > 0
          ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
          : 0,
      };
    });
  }

  // ============= Cache Metrics =============

  async getCacheMetrics(): Promise<CacheMetrics> {
    const { data, error } = await this.supabase
      .from('cache_entries')
      .select('cache_type, hit_count');

    if (error || !data) {
      return { hitRate: 0, totalEntries: 0, entriesByType: {} };
    }

    const entriesByType: Record<string, number> = {};
    let totalHits = 0;

    for (const entry of data) {
      entriesByType[entry.cache_type] = (entriesByType[entry.cache_type] || 0) + 1;
      totalHits += entry.hit_count || 0;
    }

    // Estimate hit rate (hits / (hits + estimated misses))
    // Assume ~20% miss rate based on entry count
    const estimatedMisses = data.length * 0.25;
    const hitRate = totalHits > 0 ? totalHits / (totalHits + estimatedMisses) : 0;

    return {
      hitRate: Math.min(1, hitRate),
      totalEntries: data.length,
      entriesByType,
    };
  }

  // ============= Summary Metrics =============

  async getSummaryMetrics(): Promise<SystemMetrics['summary']> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get documents processed
    const { count: docCount } = await this.supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ready')
      .gte('updated_at', since24h);

    // Get pipeline metrics
    const { data: pipelineData } = await this.supabase
      .from('pipeline_metrics')
      .select('duration_ms, status')
      .gte('created_at', since24h);

    const completedMetrics = pipelineData?.filter(m => m.status === 'completed') || [];
    const failedMetrics = pipelineData?.filter(m => m.status === 'failed') || [];
    const totalMetrics = pipelineData?.length || 0;

    const durations = completedMetrics
      .filter(m => m.duration_ms != null)
      .map(m => m.duration_ms);

    return {
      totalDocumentsProcessed24h: docCount || 0,
      avgProcessingTimeMs: durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0,
      overallSuccessRate: totalMetrics > 0
        ? completedMetrics.length / totalMetrics
        : 1,
      criticalErrors: failedMetrics.length,
    };
  }

  // ============= Alert Generation =============

  generateAlerts(
    stages: StageMetrics[],
    queues: QueueMetrics[],
    cache: CacheMetrics
  ): Alert[] {
    const alerts: Alert[] = [];
    const timestamp = new Date().toISOString();

    // Check stage latencies
    for (const stage of stages) {
      if (stage.p95DurationMs > this.thresholds.stageLatencyP95Ms) {
        alerts.push({
          id: `latency-${stage.stage}`,
          severity: stage.p95DurationMs > this.thresholds.stageLatencyP95Ms * 2 ? 'critical' : 'warning',
          type: 'high_latency',
          message: `Stage ${stage.stage} p95 latency is ${Math.round(stage.p95DurationMs)}ms`,
          value: stage.p95DurationMs,
          threshold: this.thresholds.stageLatencyP95Ms,
          timestamp,
        });
      }

      const errorRate = (1 - stage.successRate) * 100;
      if (errorRate > this.thresholds.errorRatePercent) {
        alerts.push({
          id: `error-rate-${stage.stage}`,
          severity: errorRate > this.thresholds.errorRatePercent * 2 ? 'critical' : 'warning',
          type: 'high_error_rate',
          message: `Stage ${stage.stage} error rate is ${errorRate.toFixed(1)}%`,
          value: errorRate,
          threshold: this.thresholds.errorRatePercent,
          timestamp,
        });
      }
    }

    // Check queue depths
    for (const queue of queues) {
      const depth = queue.pending + queue.processing + queue.retrying;
      if (depth > this.thresholds.queueDepth) {
        alerts.push({
          id: `queue-depth-${queue.queueName}`,
          severity: depth > this.thresholds.queueDepth * 2 ? 'critical' : 'warning',
          type: 'queue_backlog',
          message: `Queue ${queue.queueName} has ${depth} pending jobs`,
          value: depth,
          threshold: this.thresholds.queueDepth,
          timestamp,
        });
      }
    }

    // Check cache hit rate
    if (cache.hitRate < this.thresholds.cacheHitRateMin && cache.totalEntries > 100) {
      alerts.push({
        id: 'cache-hit-rate',
        severity: cache.hitRate < this.thresholds.cacheHitRateMin * 0.5 ? 'warning' : 'info',
        type: 'low_cache_hit_rate',
        message: `Cache hit rate is ${(cache.hitRate * 100).toFixed(1)}%`,
        value: cache.hitRate * 100,
        threshold: this.thresholds.cacheHitRateMin * 100,
        timestamp,
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  // ============= Record Pipeline Metrics =============

  async recordStageStart(
    documentId: string,
    projectId: string,
    stage: string
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('pipeline_metrics')
      .insert({
        document_id: documentId,
        project_id: projectId,
        stage,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error(`[monitoring] Failed to record stage start: ${error.message}`);
      return '';
    }

    return data.id;
  }

  async recordStageComplete(
    metricId: string,
    durationMs: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.supabase
      .from('pipeline_metrics')
      .update({
        status: 'completed',
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
        metadata: metadata || {},
      })
      .eq('id', metricId);
  }

  async recordStageFailure(
    metricId: string,
    errorMessage: string,
    durationMs?: number
  ): Promise<void> {
    await this.supabase
      .from('pipeline_metrics')
      .update({
        status: 'failed',
        duration_ms: durationMs,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', metricId);
  }
}

// ============= Factory Function =============

export function createMonitoringService(
  supabase: SupabaseClient,
  thresholds?: Partial<AlertThresholds>
): MonitoringService {
  return new MonitoringService(supabase, thresholds);
}
