// ============= Monitoring Dashboard API =============
// Provides metrics, alerts, and system health information
// Admin-only endpoint for observability

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createMonitoringService } from '../_shared/monitoring-service.ts';
import { createCacheService } from '../_shared/cache-service.ts';
import { createPipelineQueue, createEmbeddingQueue, createNotificationQueue } from '../_shared/queue-service.ts';
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";

// ============= CORS =============

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= Types =============

interface DashboardRequest {
  action: 'metrics' | 'alerts' | 'health' | 'queue-stats' | 'cache-stats' | 'cleanup';
  timeRange?: '1h' | '24h' | '7d';
}

// ============= Create Supabase Client =============

function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ============= Main Handler =============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[monitoring-dashboard] Request ${requestId} started`);

  try {
    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServiceClient();
    
    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, user.id, 'default', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: DashboardRequest = await req.json();
    const { action } = body;

    const monitoring = createMonitoringService(supabase);
    const cache = createCacheService(supabase);

    switch (action) {
      case 'metrics':
        return await handleMetrics(monitoring);
      
      case 'alerts':
        return await handleAlerts(monitoring);
      
      case 'health':
        return await handleHealth(supabase, monitoring, cache);
      
      case 'queue-stats':
        return await handleQueueStats(supabase);
      
      case 'cache-stats':
        return await handleCacheStats(cache);
      
      case 'cleanup':
        return await handleCleanup(supabase, cache);
      
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error(`[monitoring-dashboard] ${requestId} Error:`, error);
    
    // Import and use Sentry
    const { captureException } = await import("../_shared/sentry.ts");
    await captureException(error as Error, {
      operation: 'monitoring-dashboard',
      extra: { requestId },
    });
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============= Action Handlers =============

async function handleMetrics(
  monitoring: ReturnType<typeof createMonitoringService>
): Promise<Response> {
  const metrics = await monitoring.collectMetrics();
  
  return new Response(
    JSON.stringify({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleAlerts(
  monitoring: ReturnType<typeof createMonitoringService>
): Promise<Response> {
  const metrics = await monitoring.collectMetrics();
  
  return new Response(
    JSON.stringify({
      success: true,
      alerts: metrics.alerts,
      summary: {
        critical: metrics.alerts.filter(a => a.severity === 'critical').length,
        warning: metrics.alerts.filter(a => a.severity === 'warning').length,
        info: metrics.alerts.filter(a => a.severity === 'info').length,
      },
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleHealth(
  supabase: ReturnType<typeof createServiceClient>,
  monitoring: ReturnType<typeof createMonitoringService>,
  cache: ReturnType<typeof createCacheService>
): Promise<Response> {
  const checks: Record<string, { status: 'healthy' | 'degraded' | 'unhealthy'; message?: string }> = {};

  // Database check
  try {
    const start = Date.now();
    await supabase.from('profiles').select('id').limit(1);
    const latency = Date.now() - start;
    checks.database = {
      status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'unhealthy',
      message: `Latency: ${latency}ms`,
    };
  } catch (error) {
    checks.database = { status: 'unhealthy', message: error instanceof Error ? error.message : 'Unknown error' };
  }

  // Queue check
  try {
    const pipelineQueue = createPipelineQueue(supabase);
    const stats = await pipelineQueue.getStats();
    const backlog = stats.pending + stats.retrying;
    checks.queue = {
      status: backlog < 50 ? 'healthy' : backlog < 200 ? 'degraded' : 'unhealthy',
      message: `Pending: ${stats.pending}, Processing: ${stats.processing}, Failed: ${stats.failed}`,
    };
  } catch (error) {
    checks.queue = { status: 'unhealthy', message: error instanceof Error ? error.message : 'Unknown error' };
  }

  // Cache check
  try {
    const cacheStats = await cache.getStats();
    checks.cache = {
      status: cacheStats.hitRate >= 0.7 ? 'healthy' : cacheStats.hitRate >= 0.5 ? 'degraded' : 'unhealthy',
      message: `Hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%, Entries: ${cacheStats.totalEntries}`,
    };
  } catch (error) {
    checks.cache = { status: 'unhealthy', message: error instanceof Error ? error.message : 'Unknown error' };
  }

  // Calculate overall status
  const statuses = Object.values(checks).map(c => c.status);
  const overallStatus = statuses.includes('unhealthy') ? 'unhealthy'
    : statuses.includes('degraded') ? 'degraded'
    : 'healthy';

  return new Response(
    JSON.stringify({
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleQueueStats(
  supabase: ReturnType<typeof createServiceClient>
): Promise<Response> {
  const queues = [
    { name: 'pipeline', queue: createPipelineQueue(supabase) },
    { name: 'embedding', queue: createEmbeddingQueue(supabase) },
    { name: 'notification', queue: createNotificationQueue(supabase) },
  ];

  const stats: Record<string, Awaited<ReturnType<typeof queues[0]['queue']['getStats']>>> = {};
  
  for (const { name, queue } of queues) {
    stats[name] = await queue.getStats();
  }

  return new Response(
    JSON.stringify({
      success: true,
      queues: stats,
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleCacheStats(
  cache: ReturnType<typeof createCacheService>
): Promise<Response> {
  const stats = await cache.getStats();
  
  return new Response(
    JSON.stringify({
      success: true,
      cache: stats,
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleCleanup(
  supabase: ReturnType<typeof createServiceClient>,
  cache: ReturnType<typeof createCacheService>
): Promise<Response> {
  const results: Record<string, number> = {};

  // Cleanup expired cache entries
  results.expiredCacheEntries = await cache.cleanupExpired();

  // Cleanup completed queue jobs older than 24 hours
  const pipelineQueue = createPipelineQueue(supabase);
  results.completedJobs = await pipelineQueue.cleanupCompleted(24);

  // Cleanup old pipeline metrics (keep 7 days)
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: deletedMetrics } = await supabase
    .from('pipeline_metrics')
    .delete()
    .lt('created_at', cutoffDate)
    .select('id');
  results.oldMetrics = deletedMetrics?.length || 0;

  return new Response(
    JSON.stringify({
      success: true,
      cleaned: results,
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
