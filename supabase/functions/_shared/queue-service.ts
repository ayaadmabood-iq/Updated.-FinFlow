// ============= Queue Service =============
// PostgreSQL-based job queue with BullMQ-like features
// Supports: Job prioritization, rate limiting, retries with exponential backoff
// Works with queue_jobs table for persistence

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============= Types =============

export interface QueueJob {
  id: string;
  queue_name: string;
  job_type: string;
  payload: Record<string, unknown>;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface EnqueueOptions {
  priority?: number;
  maxAttempts?: number;
  delay?: number; // Delay in seconds before job is processed
  jobId?: string; // Optional custom job ID for deduplication
}

export interface QueueConfig {
  name: string;
  concurrency?: number;
  rateLimit?: {
    max: number;
    duration: number; // in seconds
  };
  defaultJobOptions?: EnqueueOptions;
}

export interface ProcessorContext {
  jobId: string;
  attempt: number;
  log: (message: string) => void;
}

export type JobProcessor<T = Record<string, unknown>, R = unknown> = (
  payload: T,
  context: ProcessorContext
) => Promise<R>;

// ============= Queue Service Class =============

export class QueueService {
  private supabase: SupabaseClient;
  private config: QueueConfig;

  constructor(supabase: SupabaseClient, config: QueueConfig) {
    this.supabase = supabase;
    this.config = {
      concurrency: 1,
      ...config,
    };
  }

  // ============= Enqueue Jobs =============

  async enqueue<T extends Record<string, unknown>>(
    jobType: string,
    payload: T,
    options: EnqueueOptions = {}
  ): Promise<string> {
    const {
      priority = options.priority ?? this.config.defaultJobOptions?.priority ?? 0,
      maxAttempts = options.maxAttempts ?? this.config.defaultJobOptions?.maxAttempts ?? 3,
      delay = options.delay ?? 0,
      jobId = options.jobId,
    } = options;

    const scheduledAt = delay > 0 
      ? new Date(Date.now() + delay * 1000).toISOString()
      : new Date().toISOString();

    // Check for duplicate job if jobId provided
    if (jobId) {
      const { data: existing } = await this.supabase
        .from('queue_jobs')
        .select('id, status')
        .eq('id', jobId)
        .single();

      if (existing && ['pending', 'processing', 'retrying'].includes(existing.status)) {
        console.log(`[queue:${this.config.name}] Job ${jobId} already exists with status ${existing.status}`);
        return existing.id;
      }
    }

    const { data, error } = await this.supabase
      .from('queue_jobs')
      .insert({
        id: jobId || undefined,
        queue_name: this.config.name,
        job_type: jobType,
        payload,
        priority,
        max_attempts: maxAttempts,
        scheduled_at: scheduledAt,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to enqueue job: ${error.message}`);
    }

    console.log(`[queue:${this.config.name}] Enqueued job ${data.id} (type: ${jobType}, priority: ${priority})`);
    return data.id;
  }

  // ============= Bulk Enqueue =============

  async enqueueBulk<T extends Record<string, unknown>>(
    jobs: Array<{ jobType: string; payload: T; options?: EnqueueOptions }>
  ): Promise<string[]> {
    const inserts = jobs.map(({ jobType, payload, options = {} }) => ({
      queue_name: this.config.name,
      job_type: jobType,
      payload,
      priority: options.priority ?? this.config.defaultJobOptions?.priority ?? 0,
      max_attempts: options.maxAttempts ?? this.config.defaultJobOptions?.maxAttempts ?? 3,
      scheduled_at: options.delay 
        ? new Date(Date.now() + options.delay * 1000).toISOString()
        : new Date().toISOString(),
      status: 'pending' as const,
    }));

    const { data, error } = await this.supabase
      .from('queue_jobs')
      .insert(inserts)
      .select('id');

    if (error) {
      throw new Error(`Failed to bulk enqueue jobs: ${error.message}`);
    }

    console.log(`[queue:${this.config.name}] Bulk enqueued ${data?.length || 0} jobs`);
    return data?.map(j => j.id) || [];
  }

  // ============= Process Jobs =============

  async processNext<T extends Record<string, unknown>, R = unknown>(
    processor: JobProcessor<T, R>
  ): Promise<{ processed: boolean; result?: R; error?: string }> {
    // Check rate limit
    if (this.config.rateLimit) {
      const isAllowed = await this.checkRateLimit();
      if (!isAllowed) {
        return { processed: false, error: 'Rate limit exceeded' };
      }
    }

    // Fetch and lock next job atomically
    const job = await this.fetchAndLockNextJob();
    if (!job) {
      return { processed: false };
    }

    const context: ProcessorContext = {
      jobId: job.id,
      attempt: job.attempts + 1,
      log: (message: string) => console.log(`[queue:${this.config.name}:${job.id}] ${message}`),
    };

    try {
      context.log(`Processing (attempt ${context.attempt}/${job.max_attempts})`);
      const result = await processor(job.payload as T, context);
      
      // Mark as completed
      await this.supabase
        .from('queue_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      context.log('Completed successfully');
      return { processed: true, result };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const newAttempts = job.attempts + 1;
      
      if (newAttempts >= job.max_attempts) {
        // Max retries reached - mark as failed
        await this.supabase
          .from('queue_jobs')
          .update({
            status: 'failed',
            error_message: errorMessage,
            attempts: newAttempts,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        context.log(`Failed permanently after ${newAttempts} attempts: ${errorMessage}`);
        return { processed: true, error: errorMessage };

      } else {
        // Schedule retry with exponential backoff
        const backoffSeconds = Math.pow(2, newAttempts) * 10; // 20s, 40s, 80s...
        const nextAttempt = new Date(Date.now() + backoffSeconds * 1000).toISOString();

        await this.supabase
          .from('queue_jobs')
          .update({
            status: 'retrying',
            error_message: errorMessage,
            attempts: newAttempts,
            scheduled_at: nextAttempt,
            started_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        context.log(`Failed, retrying in ${backoffSeconds}s (attempt ${newAttempts}/${job.max_attempts})`);
        return { processed: true, error: errorMessage };
      }
    }
  }

  // ============= Job Management =============

  async getJob(jobId: string): Promise<QueueJob | null> {
    const { data, error } = await this.supabase
      .from('queue_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) return null;
    return data as QueueJob;
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('queue_jobs')
      .update({ 
        status: 'failed', 
        error_message: 'Cancelled by user',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .in('status', ['pending', 'retrying']);

    return !error;
  }

  async retryJob(jobId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('queue_jobs')
      .update({ 
        status: 'pending',
        error_message: null,
        scheduled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('status', 'failed');

    return !error;
  }

  // ============= Queue Stats =============

  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    retrying: number;
  }> {
    const { data, error } = await this.supabase
      .from('queue_jobs')
      .select('status')
      .eq('queue_name', this.config.name);

    if (error || !data) {
      return { pending: 0, processing: 0, completed: 0, failed: 0, retrying: 0 };
    }

    const stats = { pending: 0, processing: 0, completed: 0, failed: 0, retrying: 0 };
    for (const job of data) {
      if (job.status in stats) {
        stats[job.status as keyof typeof stats]++;
      }
    }

    return stats;
  }

  async cleanupCompleted(olderThanHours: number = 24): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await this.supabase
      .from('queue_jobs')
      .delete()
      .eq('queue_name', this.config.name)
      .eq('status', 'completed')
      .lt('completed_at', cutoff)
      .select('id');

    return data?.length || 0;
  }

  // ============= Private Helpers =============

  private async fetchAndLockNextJob(): Promise<QueueJob | null> {
    // Find next job
    const { data: jobs, error: selectError } = await this.supabase
      .from('queue_jobs')
      .select('*')
      .eq('queue_name', this.config.name)
      .in('status', ['pending', 'retrying'])
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_at', { ascending: true })
      .limit(1);

    if (selectError || !jobs || jobs.length === 0) {
      return null;
    }

    const job = jobs[0];

    // Try to lock it (optimistic locking)
    const { data: updated, error: updateError } = await this.supabase
      .from('queue_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .in('status', ['pending', 'retrying'])
      .select()
      .single();

    if (updateError || !updated) {
      // Job was taken by another worker
      return null;
    }

    return updated as QueueJob;
  }

  private async checkRateLimit(): Promise<boolean> {
    if (!this.config.rateLimit) return true;

    const windowStart = new Date(Date.now() - this.config.rateLimit.duration * 1000).toISOString();

    const { count } = await this.supabase
      .from('queue_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('queue_name', this.config.name)
      .gte('started_at', windowStart);

    return (count || 0) < this.config.rateLimit.max;
  }
}

// ============= Factory Functions =============

export function createPipelineQueue(supabase: SupabaseClient): QueueService {
  return new QueueService(supabase, {
    name: 'pipeline',
    concurrency: 5,
    rateLimit: { max: 100, duration: 60 },
    defaultJobOptions: { priority: 0, maxAttempts: 3 },
  });
}

export function createEmbeddingQueue(supabase: SupabaseClient): QueueService {
  return new QueueService(supabase, {
    name: 'embedding',
    concurrency: 10,
    rateLimit: { max: 500, duration: 60 },
    defaultJobOptions: { priority: 0, maxAttempts: 3 },
  });
}

export function createNotificationQueue(supabase: SupabaseClient): QueueService {
  return new QueueService(supabase, {
    name: 'notification',
    concurrency: 20,
    defaultJobOptions: { priority: 0, maxAttempts: 2 },
  });
}
