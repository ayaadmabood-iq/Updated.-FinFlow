// ============= Pipeline Logger =============
// Async logging for pipeline stages with trace ID support
// Designed for minimal latency impact on pipeline execution

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { UsageWithCost, createEmptyUsage, aggregateUsage } from './cost-calculator.ts';

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// ============= Types =============

export interface PipelineLogEntry {
  trace_id: string;
  document_id: string;
  stage_name: string;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  duration_ms?: number;
  error_details?: string;
  memory_usage_mb?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  estimated_cost_usd?: number;
  executor_version?: string;
  metadata?: Record<string, unknown>;
}

export interface PipelineTracer {
  traceId: string;
  documentId: string;
  startTime: number;
  stageUsages: Map<string, UsageWithCost>;
  logStageStart(stageName: string, executorVersion?: string): Promise<void>;
  logStageComplete(
    stageName: string,
    executorVersion: string,
    usage?: UsageWithCost,
    metadata?: Record<string, unknown>
  ): Promise<void>;
  logStageError(
    stageName: string,
    executorVersion: string,
    error: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;
  logStageSkipped(stageName: string, reason: string): Promise<void>;
  getTotalUsage(): UsageWithCost;
  finalize(): Promise<void>;
}

// ============= Logger Queue (Fire and Forget) =============

const logQueue: PipelineLogEntry[] = [];
let flushTimeout: number | null = null;
const FLUSH_INTERVAL_MS = 1000;
const MAX_BATCH_SIZE = 50;

async function flushLogs(supabase: AnySupabaseClient): Promise<void> {
  if (logQueue.length === 0) return;

  const batch = logQueue.splice(0, MAX_BATCH_SIZE);
  
  try {
    const { error } = await supabase
      .from('pipeline_logs')
      .insert(batch);

    if (error) {
      console.warn(`[PipelineLogger] Failed to flush logs: ${error.message}`);
      // Re-queue failed logs (at the front)
      logQueue.unshift(...batch);
    }
  } catch (err) {
    console.warn(`[PipelineLogger] Error flushing logs:`, err);
  }
}

function scheduleFlush(supabase: AnySupabaseClient): void {
  if (flushTimeout !== null) return;
  
  flushTimeout = setTimeout(() => {
    flushTimeout = null;
    flushLogs(supabase).catch(console.error);
    if (logQueue.length > 0) {
      scheduleFlush(supabase);
    }
  }, FLUSH_INTERVAL_MS) as unknown as number;
}

function queueLog(supabase: AnySupabaseClient, entry: PipelineLogEntry): void {
  logQueue.push(entry);
  
  if (logQueue.length >= MAX_BATCH_SIZE) {
    flushLogs(supabase).catch(console.error);
  } else {
    scheduleFlush(supabase);
  }
}

// Synchronous immediate log (for critical entries)
async function logImmediate(supabase: AnySupabaseClient, entry: PipelineLogEntry): Promise<void> {
  try {
    const { error } = await supabase
      .from('pipeline_logs')
      .insert(entry);

    if (error) {
      console.warn(`[PipelineLogger] Failed to log immediately: ${error.message}`);
    }
  } catch (err) {
    console.warn(`[PipelineLogger] Error logging immediately:`, err);
  }
}

// ============= Pipeline Tracer Implementation =============

export function createPipelineTracer(
  supabase: AnySupabaseClient,
  documentId: string,
  existingTraceId?: string
): PipelineTracer {
  const traceId = existingTraceId || crypto.randomUUID();
  const startTime = Date.now();
  const stageStartTimes = new Map<string, number>();
  const stageUsages = new Map<string, UsageWithCost>();

  return {
    traceId,
    documentId,
    startTime,
    stageUsages,

    async logStageStart(stageName: string, executorVersion?: string): Promise<void> {
      stageStartTimes.set(stageName, Date.now());
      
      // Fire and forget - non-blocking
      queueLog(supabase, {
        trace_id: traceId,
        document_id: documentId,
        stage_name: stageName,
        status: 'started',
        executor_version: executorVersion,
      });
    },

    async logStageComplete(
      stageName: string,
      executorVersion: string,
      usage?: UsageWithCost,
      metadata?: Record<string, unknown>
    ): Promise<void> {
      const stageStart = stageStartTimes.get(stageName) || Date.now();
      const durationMs = Date.now() - stageStart;

      if (usage) {
        stageUsages.set(stageName, usage);
      }

      queueLog(supabase, {
        trace_id: traceId,
        document_id: documentId,
        stage_name: stageName,
        status: 'completed',
        duration_ms: durationMs,
        prompt_tokens: usage?.promptTokens || 0,
        completion_tokens: usage?.completionTokens || 0,
        total_tokens: usage?.totalTokens || 0,
        estimated_cost_usd: usage?.totalCost || 0,
        executor_version: executorVersion,
        metadata,
      });
    },

    async logStageError(
      stageName: string,
      executorVersion: string,
      error: string,
      metadata?: Record<string, unknown>
    ): Promise<void> {
      const stageStart = stageStartTimes.get(stageName) || Date.now();
      const durationMs = Date.now() - stageStart;

      // Log errors immediately (important for debugging)
      await logImmediate(supabase, {
        trace_id: traceId,
        document_id: documentId,
        stage_name: stageName,
        status: 'failed',
        duration_ms: durationMs,
        error_details: error,
        executor_version: executorVersion,
        metadata,
      });
    },

    async logStageSkipped(stageName: string, reason: string): Promise<void> {
      queueLog(supabase, {
        trace_id: traceId,
        document_id: documentId,
        stage_name: stageName,
        status: 'skipped',
        metadata: { skipReason: reason },
      });
    },

    getTotalUsage(): UsageWithCost {
      const usages = Array.from(stageUsages.values());
      return usages.length > 0 ? aggregateUsage(usages) : createEmptyUsage();
    },

    async finalize(): Promise<void> {
      // Flush any remaining logs
      await flushLogs(supabase);

      // Update document with total cost and trace ID
      const totalUsage = this.getTotalUsage();
      
      try {
        const { error } = await supabase
          .from('documents')
          .update({
            trace_id: traceId,
            processing_cost_usd: totalUsage.totalCost,
            total_tokens_used: totalUsage.totalTokens,
          })
          .eq('id', documentId);

        if (error) {
          console.warn(`[PipelineLogger] Failed to update document costs: ${error.message}`);
        }
      } catch (err) {
        console.warn(`[PipelineLogger] Error updating document costs:`, err);
      }
    },
  };
}

// ============= Utility Functions =============

export function generateTraceId(): string {
  return crypto.randomUUID();
}

export async function getDocumentTrace(
  supabase: AnySupabaseClient,
  documentId: string
): Promise<PipelineLogEntry[]> {
  const { data, error } = await supabase
    .from('pipeline_logs')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn(`[PipelineLogger] Failed to get document trace: ${error.message}`);
    return [];
  }

  return data || [];
}

export async function getStageMetrics(
  supabase: AnySupabaseClient
): Promise<Record<string, { avgDuration: number; successRate: number; totalCost: number }>> {
  const { data, error } = await supabase
    .from('v_stage_latency_analysis')
    .select('*');

  if (error) {
    console.warn(`[PipelineLogger] Failed to get stage metrics: ${error.message}`);
    return {};
  }

  const metrics: Record<string, { avgDuration: number; successRate: number; totalCost: number }> = {};
  
  for (const row of (data || [])) {
    metrics[row.stage_name] = {
      avgDuration: row.avg_duration_ms || 0,
      successRate: row.total_runs > 0 ? (row.successful_runs / row.total_runs) : 0,
      totalCost: row.total_cost_usd || 0,
    };
  }

  return metrics;
}
