// ============= Pipeline Orchestrator v3 =============
// Queue-based document processing orchestrator
// Security-hardened with auth validation, ownership checks, and abuse prevention
// Replaces monolithic process-document with async job-based processing

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createPipelineQueue } from '../_shared/queue-service.ts';
import { createMonitoringService } from '../_shared/monitoring-service.ts';
import { createSecurityService, CONCURRENT_LIMITS, SECURITY_INVARIANTS } from '../_shared/ai-safety.ts';
import type { QueueService } from '../_shared/queue-service.ts';
import { createCacheService } from '../_shared/cache-service.ts';

// Define stages locally to avoid import issues
type PipelineStage = 'ingestion' | 'extraction' | 'language' | 'chunking' | 'summarization' | 'indexing';

// ============= CORS =============

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= Types =============

interface PipelineJobPayload {
  documentId: string;
  projectId: string;
  storagePath: string;
  ownerId: string;
  currentStage: PipelineStage;
  completedStages: string[];
  forceReprocess?: boolean;
  priority?: number;
}

interface OrchestratorRequest {
  action: 'enqueue' | 'process' | 'status' | 'cancel' | 'retry';
  documentId?: string;
  projectId?: string;
  storagePath?: string;
  ownerId?: string;
  priority?: number;
  forceReprocess?: boolean;
  jobId?: string;
}

// ============= Stage Configuration =============

const STAGE_ORDER: PipelineStage[] = [
  'ingestion',
  'extraction',
  'language',
  'chunking',
  'summarization',
  'indexing',
];

const STAGE_EXECUTORS: Record<PipelineStage, string> = {
  ingestion: 'ingestion-executor',
  extraction: 'extraction-executor',
  language: 'language-executor',
  chunking: 'chunking-executor',
  summarization: 'summarization-executor',
  indexing: 'indexing-executor',
};

// ============= Create Supabase Client =============

function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function createUserClient(authHeader: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );
}

// ============= Main Handler =============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[orchestrator:v3] Request ${requestId} started`);

  try {
    // SECURITY: Validate authentication for all requests
    const authHeader = req.headers.get('Authorization');
    const supabaseService = createServiceClient();
    const security = createSecurityService(supabaseService);

    const authResult = await security.validateAuth(authHeader);
    if (!authResult.isValid) {
      console.warn(`[orchestrator:v3] ${requestId} Auth failed: ${authResult.error}`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authResult.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authResult.userId!;
    console.log(`[orchestrator:v3] ${requestId} Authenticated user: ${userId}`);

    // SECURITY: Check for abuse patterns
    const abuseCheck = await security.detectAbusePatterns(userId);
    if (abuseCheck.action === 'block') {
      console.error(`[orchestrator:v3] ${requestId} User blocked due to abuse: ${userId}`);
      return new Response(
        JSON.stringify({ error: 'Access temporarily blocked due to abuse detection' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Rate limiting
    const rateLimit = await security.checkRateLimit(userId, 'orchestrator');
    if (!rateLimit.allowed) {
      console.warn(`[orchestrator:v3] ${requestId} Rate limit exceeded for user: ${userId}`);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded', 
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': rateLimit.resetAt,
          } 
        }
      );
    }

    const body: OrchestratorRequest = await req.json();
    const { action } = body;

    const queue = createPipelineQueue(supabaseService);
    const monitoring = createMonitoringService(supabaseService);

    switch (action) {
      case 'enqueue':
        return await handleEnqueue(body, queue, supabaseService, security, userId, requestId);
      
      case 'process':
        return await handleProcess(queue, supabaseService, monitoring, requestId);
      
      case 'status':
        return await handleStatus(body, queue, requestId);
      
      case 'cancel':
        return await handleCancel(body, queue, supabaseService, security, userId, requestId);
      
      case 'retry':
        return await handleRetry(body, queue, security, userId, requestId);
      
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error(`[orchestrator:v3] ${requestId} Error:`, error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============= Action Handlers =============

async function handleEnqueue(
  body: OrchestratorRequest,
  queue: QueueService,
  supabase: ReturnType<typeof createServiceClient>,
  security: ReturnType<typeof createSecurityService>,
  userId: string,
  requestId: string
): Promise<Response> {
  const { documentId, projectId, storagePath, ownerId, priority = 0, forceReprocess = false } = body;

  if (!documentId || !projectId || !storagePath || !ownerId) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: documentId, projectId, storagePath, ownerId' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // SECURITY: Verify document and project ownership
  const docOwnership = await security.verifyDocumentOwnership(userId, documentId);
  if (!docOwnership.isOwner) {
    return new Response(
      JSON.stringify({ error: 'Access denied', details: docOwnership.error }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // SECURITY: Check concurrent processing limits
  const concurrentCheck = await security.checkConcurrentLimit(userId, projectId, 'documents');
  if (!concurrentCheck.allowed) {
    return new Response(
      JSON.stringify({ error: concurrentCheck.error, current: concurrentCheck.current, limit: concurrentCheck.limit }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  await supabase.from('documents').update({ status: 'queued' }).eq('id', documentId);

  const payload: Record<string, unknown> = {
    documentId, projectId, storagePath, ownerId,
    currentStage: 'ingestion' as PipelineStage,
    completedStages: [] as string[],
    forceReprocess, priority,
  };

  const jobId = await queue.enqueue('pipeline', payload, {
    priority, maxAttempts: CONCURRENT_LIMITS.retriesPerDocument,
    jobId: `pipeline-${documentId}`,
  });

  console.log(`[orchestrator:v3] ${requestId} Enqueued job ${jobId} for document ${documentId}`);

  return new Response(
    JSON.stringify({ success: true, jobId, documentId, message: 'Document queued for processing' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleProcess(
  queue: QueueService,
  supabase: ReturnType<typeof createServiceClient>,
  monitoring: ReturnType<typeof createMonitoringService>,
  requestId: string
): Promise<Response> {
  const cache = createCacheService(supabase);

  const result = await queue.processNext(async (payload, context) => {
    const { documentId, projectId, storagePath, currentStage, completedStages } = payload as Record<string, unknown>;
    const stage = currentStage as PipelineStage;
    context.log(`Processing stage: ${stage}`);

    const metricId = await monitoring.recordStageStart(documentId as string, projectId as string, stage);
    const stageStart = Date.now();
    const completedStagesArr = completedStages as string[];

    try {
      await supabase.from('documents').update({ 
        status: 'processing',
        processing_steps: { currentStage: stage, completedStages: completedStagesArr, startedAt: new Date().toISOString() },
      }).eq('id', documentId as string);

      const executorInput = buildExecutorInput(stage, documentId as string, projectId as string, storagePath as string);
      const executorName = STAGE_EXECUTORS[stage];
      const executorResult = await invokeExecutor(supabase, executorName, executorInput);

      if (!executorResult.success) throw new Error(executorResult.error || `${stage} failed`);

      const duration = Date.now() - stageStart;
      await monitoring.recordStageComplete(metricId, duration, executorResult.data as Record<string, unknown>);
      context.log(`Stage ${stage} completed in ${duration}ms`);

      const stageIndex = STAGE_ORDER.indexOf(stage);
      const nextStageIndex = stageIndex + 1;
      const newCompletedStages = [...completedStagesArr, stage];

      if (nextStageIndex < STAGE_ORDER.length) {
        const nextStage = STAGE_ORDER[nextStageIndex];
        await queue.enqueue('pipeline', { ...(payload as Record<string, unknown>), currentStage: nextStage, completedStages: newCompletedStages }, {
          priority: (payload as Record<string, unknown>).priority as number || 0,
          jobId: `pipeline-${documentId}-${nextStage}`,
        });
        context.log(`Queued next stage: ${nextStage}`);
      } else {
        await supabase.from('documents').update({ status: 'ready', processing_steps: { completedStages: newCompletedStages, completedAt: new Date().toISOString() } }).eq('id', documentId as string);
        await sendNotification(supabase, (payload as Record<string, unknown>).ownerId as string, documentId as string, 'processing_complete');
        context.log('Pipeline completed successfully');
      }
      return { stage, success: true, duration };
    } catch (error) {
      const duration = Date.now() - stageStart;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await monitoring.recordStageFailure(metricId, errorMessage, duration);
      await supabase.from('documents').update({ status: 'error', processing_steps: { currentStage: stage, completedStages: completedStagesArr, error: errorMessage, failedAt: new Date().toISOString() } }).eq('id', documentId as string);
      throw error;
    }
  });

  return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleStatus(body: OrchestratorRequest, queue: QueueService, requestId: string): Promise<Response> {
  if (body.jobId) {
    const job = await queue.getJob(body.jobId);
    return new Response(JSON.stringify({ job }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const stats = await queue.getStats();
  return new Response(JSON.stringify({ stats }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleCancel(
  body: OrchestratorRequest,
  queue: QueueService,
  supabase: ReturnType<typeof createServiceClient>,
  security: ReturnType<typeof createSecurityService>,
  userId: string,
  requestId: string
): Promise<Response> {
  const { jobId, documentId } = body;
  if (!jobId && !documentId) {
    return new Response(JSON.stringify({ error: 'Missing jobId or documentId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // SECURITY: Verify ownership before cancelling
  if (documentId) {
    const ownership = await security.verifyDocumentOwnership(userId, documentId);
    if (!ownership.isOwner) {
      return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  const targetJobId = jobId || `pipeline-${documentId}`;
  const cancelled = await queue.cancelJob(targetJobId);
  if (documentId) await supabase.from('documents').update({ status: 'cancelled' }).eq('id', documentId);
  return new Response(JSON.stringify({ success: cancelled, jobId: targetJobId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleRetry(
  body: OrchestratorRequest,
  queue: QueueService,
  security: ReturnType<typeof createSecurityService>,
  userId: string,
  requestId: string
): Promise<Response> {
  const { jobId } = body;
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'Missing jobId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const retried = await queue.retryJob(jobId);
  return new Response(JSON.stringify({ success: retried, jobId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// ============= Helper Functions =============

function buildExecutorInput(
  stage: PipelineStage,
  documentId: string,
  projectId: string,
  storagePath: string
): Record<string, unknown> {
  const base = { documentId, projectId };

  switch (stage) {
    case 'ingestion':
      return { ...base, storagePath };
    case 'chunking':
      return { ...base, chunkSize: 1000, chunkOverlap: 200, chunkStrategy: 'sentence' };
    default:
      return base;
  }
}

async function invokeExecutor(
  supabase: ReturnType<typeof createServiceClient>,
  functionName: string,
  input: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    // SECURITY: Add internal secret header for authenticating internal function calls
    const internalSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET');
    if (!internalSecret) {
      console.error('[orchestrator] INTERNAL_FUNCTION_SECRET not configured');
      return { success: false, error: 'Internal authentication not configured' };
    }

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: input,
      headers: {
        'X-Internal-Secret': internalSecret,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: data?.success ?? true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function sendNotification(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  documentId: string,
  type: string
): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'document',
      title: 'Document Ready',
      message: 'Your document has finished processing',
      data: { documentId, type },
    });
  } catch (error) {
    console.error('[orchestrator] Failed to send notification:', error);
  }
}
