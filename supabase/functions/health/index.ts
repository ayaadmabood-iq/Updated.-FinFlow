/**
 * Health Check Edge Function
 * 
 * Provides comprehensive health status for FineFlow services including:
 * - Database connectivity
 * - AI service availability
 * - Queue health
 * - Cache status
 * 
 * @endpoint GET /health
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: Record<string, unknown>;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    auth: HealthCheck;
    storage: HealthCheck;
    aiService: HealthCheck;
  };
  metrics?: {
    activeConnections?: number;
    queueDepth?: number;
    cacheHitRate?: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// Track uptime
const startTime = Date.now();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const detailed = url.searchParams.get('detailed') === 'true';
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase: AnySupabaseClient = createClient(supabaseUrl, supabaseKey);

    // Run all health checks in parallel
    const [databaseCheck, authCheck, storageCheck, aiServiceCheck] = await Promise.all([
      checkDatabase(supabase),
      checkAuth(supabase),
      checkStorage(supabase),
      checkAIService(),
    ]);

    // Determine overall status
    const checks = { database: databaseCheck, auth: authCheck, storage: storageCheck, aiService: aiServiceCheck };
    const statuses = Object.values(checks).map(c => c.status);
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (statuses.includes('unhealthy')) {
      // Database unhealthy = system unhealthy; others = degraded
      overallStatus = databaseCheck.status === 'unhealthy' ? 'unhealthy' : 'degraded';
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    }

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: Deno.env.get('APP_VERSION') || '1.0.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks,
    };

    // Add detailed metrics if requested
    if (detailed) {
      response.metrics = await getMetrics(supabase);
    }

    const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    
    return new Response(JSON.stringify(response), {
      status: httpStatus,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function checkDatabase(supabase: AnySupabaseClient): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Simple query to check database connectivity
    const { error } = await supabase
      .from('projects')
      .select('id')
      .limit(1);
    
    const responseTime = Date.now() - start;
    
    if (error) {
      return {
        status: 'unhealthy',
        responseTime,
        error: error.message,
      };
    }
    
    // Check if response time is acceptable (< 1s = healthy, < 3s = degraded)
    const status = responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'degraded' : 'unhealthy';
    
    return { status, responseTime };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Database check failed',
    };
  }
}

async function checkAuth(supabase: AnySupabaseClient): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Check auth service by getting settings
    const { error } = await supabase.auth.getSession();
    const responseTime = Date.now() - start;
    
    if (error && !error.message.includes('no session')) {
      return { status: 'degraded', responseTime, error: error.message };
    }
    
    return { status: 'healthy', responseTime };
  } catch (error) {
    return {
      status: 'degraded',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Auth check failed',
    };
  }
}

async function checkStorage(supabase: AnySupabaseClient): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Check storage by listing buckets
    const { error } = await supabase.storage.listBuckets();
    const responseTime = Date.now() - start;
    
    if (error) {
      return { status: 'degraded', responseTime, error: error.message };
    }
    
    return { status: 'healthy', responseTime };
  } catch (error) {
    return {
      status: 'degraded',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Storage check failed',
    };
  }
}

async function checkAIService(): Promise<HealthCheck> {
  // Check if AI API keys are configured
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  
  if (!openaiKey && !anthropicKey) {
    return {
      status: 'degraded',
      error: 'No AI API keys configured',
    };
  }
  
  // Don't actually call AI APIs in health check (costs money)
  return {
    status: 'healthy',
    details: {
      openai: !!openaiKey,
      anthropic: !!anthropicKey,
    },
  };
}

async function getMetrics(supabase: AnySupabaseClient): Promise<HealthResponse['metrics']> {
  try {
    // Get queue depth from pipeline_jobs
    const { count: queueDepth } = await supabase
      .from('pipeline_jobs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'processing']);
    
    // Get cache hit rate from cache_entries (if available)
    const { data: cacheData } = await supabase
      .from('cache_entries')
      .select('hit_count')
      .limit(100);
    
    let totalHits = 0;
    if (cacheData && Array.isArray(cacheData)) {
      for (const entry of cacheData) {
        const hitCount = typeof entry.hit_count === 'number' ? entry.hit_count : 0;
        totalHits += hitCount;
      }
    }
    const cacheHitRate = cacheData?.length ? totalHits / cacheData.length : 0;
    
    return {
      queueDepth: queueDepth || 0,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
    };
  } catch {
    return {};
  }
}
