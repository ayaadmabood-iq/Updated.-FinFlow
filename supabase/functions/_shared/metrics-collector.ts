// ============= Metrics Collector =============
// Centralized metrics collection for pipeline stages
// Enables analytics dashboards and performance monitoring

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// ============= Types =============

export interface StageMetricRecord {
  document_id: string;
  stage: string;
  executor_version: string;
  pipeline_version: string;
  duration_ms: number;
  success: boolean;
  error_message?: string;
  input_size_bytes?: number;
  output_size_bytes?: number;
  retry_count?: number;
  metadata?: Record<string, unknown>;
}

export interface MetricsContext {
  documentId: string;
  stage: string;
  executorVersion: string;
  pipelineVersion: string;
  startTime: number;
  inputSizeBytes?: number;
}

// ============= Metrics Collector Class =============

export class MetricsCollector {
  private supabase: AnySupabaseClient;
  private context: MetricsContext;
  private retryCount: number = 0;

  constructor(
    supabase: AnySupabaseClient,
    documentId: string,
    stage: string,
    executorVersion: string,
    pipelineVersion: string = 'v5.0'
  ) {
    this.supabase = supabase;
    this.context = {
      documentId,
      stage,
      executorVersion,
      pipelineVersion,
      startTime: Date.now(),
    };
  }

  setInputSize(bytes: number): void {
    this.context.inputSizeBytes = bytes;
  }

  incrementRetry(): void {
    this.retryCount++;
  }

  async recordSuccess(outputSizeBytes?: number, metadata?: Record<string, unknown>): Promise<void> {
    await this.recordMetric(true, undefined, outputSizeBytes, metadata);
  }

  async recordFailure(errorMessage: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.recordMetric(false, errorMessage, undefined, metadata);
  }

  private async recordMetric(
    success: boolean,
    errorMessage?: string,
    outputSizeBytes?: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const record: StageMetricRecord = {
      document_id: this.context.documentId,
      stage: this.context.stage,
      executor_version: this.context.executorVersion,
      pipeline_version: this.context.pipelineVersion,
      duration_ms: Date.now() - this.context.startTime,
      success,
      error_message: errorMessage,
      input_size_bytes: this.context.inputSizeBytes,
      output_size_bytes: outputSizeBytes,
      retry_count: this.retryCount,
      metadata,
    };

    try {
      const { error } = await this.supabase
        .from('processing_stage_metrics')
        .insert(record);

      if (error) {
        console.warn(`[MetricsCollector] Failed to record metric: ${error.message}`);
      }
    } catch (err) {
      // Don't fail the stage if metrics recording fails
      console.warn(`[MetricsCollector] Error recording metric:`, err);
    }
  }
}

// ============= Factory Function =============

export function createMetricsCollector(
  supabase: AnySupabaseClient,
  documentId: string,
  stage: string,
  executorVersion: string,
  pipelineVersion: string = 'v5.0'
): MetricsCollector {
  return new MetricsCollector(supabase, documentId, stage, executorVersion, pipelineVersion);
}

// ============= Aggregation Functions =============

export interface StageStats {
  stage: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  avgDurationMs: number;
  p95DurationMs: number;
  successRate: number;
}

export async function getStageStats(
  supabase: AnySupabaseClient,
  projectId?: string,
  days: number = 30
): Promise<StageStats[]> {
  // Use the materialized view for efficient querying
  const { data, error } = await supabase
    .from('v_stage_failure_rates')
    .select('*');

  if (error || !data) {
    console.warn(`[MetricsCollector] Failed to get stage stats: ${error?.message}`);
    return [];
  }

  return data.map((row: Record<string, unknown>) => ({
    stage: row.stage as string,
    totalRuns: Number(row.total_runs) || 0,
    successfulRuns: Number(row.successful_runs) || 0,
    failedRuns: Number(row.failed_runs) || 0,
    avgDurationMs: Number(row.avg_duration_ms) || 0,
    p95DurationMs: Number(row.p95_duration_ms) || 0,
    successRate: Number(row.total_runs) > 0 
      ? Number(row.successful_runs) / Number(row.total_runs) 
      : 0,
  }));
}

// ============= Document Processing Timeline =============

export interface ProcessingTimelineEvent {
  stage: string;
  status: 'completed' | 'failed' | 'running' | 'pending';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
  executorVersion?: string;
}

export async function getDocumentTimeline(
  supabase: AnySupabaseClient,
  documentId: string
): Promise<ProcessingTimelineEvent[]> {
  const { data: doc, error } = await supabase
    .from('documents')
    .select('processing_steps')
    .eq('id', documentId)
    .single();

  if (error || !doc) {
    return [];
  }

  const steps = (doc.processing_steps as Array<Record<string, unknown>>) || [];
  
  return steps.map(step => ({
    stage: step.stage as string,
    status: step.status as ProcessingTimelineEvent['status'],
    startedAt: step.started_at as string | undefined,
    completedAt: step.completed_at as string | undefined,
    durationMs: step.duration_ms as number | undefined,
    error: step.error as string | undefined,
    executorVersion: step.executor_version as string | undefined,
  }));
}
