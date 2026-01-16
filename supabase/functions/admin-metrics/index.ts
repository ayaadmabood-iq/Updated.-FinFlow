import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingStageMetrics {
  stage: string;
  avgDurationMs: number;
  totalExecutions: number;
  successRate: number;
  errorCount: number;
}

interface FileTypeMetrics {
  mimeType: string;
  totalCount: number;
  errorCount: number;
  errorRate: number;
  avgProcessingTime: number;
}

interface ActiveUserMetrics {
  userId: string;
  userName: string;
  email: string;
  documentsCount: number;
  processingCount: number;
  lastActivity: string;
}

interface ActiveProjectMetrics {
  projectId: string;
  projectName: string;
  ownerName: string;
  documentCount: number;
  lastUpdated: string;
}

interface CostMetrics {
  daily: Array<{ date: string; totalCost: number; totalTokens: number; documentsProcessed: number }>;
  monthly: { totalCost: number; totalTokens: number; avgCostPerDocument: number };
  byStage: Array<{ stage: string; totalCost: number; avgCost: number; totalTokens: number }>;
}

interface PipelineHealthMetrics {
  stages: Array<{
    stage: string;
    totalLast24h: number;
    successful: number;
    failed: number;
    failureRatePercent: number;
    avgDurationMs: number;
  }>;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  unhealthyStages: string[];
}

interface ExpensiveDocument {
  documentId: string;
  documentName: string;
  projectName: string;
  processingCostUsd: number;
  totalTokensUsed: number;
  createdAt: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.user.id;
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, userId, 'default', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }


    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile.role !== 'admin' && profile.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for admin queries
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch documents with processing_steps for metrics analysis
    const { data: documents, error: docsError } = await adminClient
      .from('documents')
      .select('id, mime_type, status, processing_steps, processing_metadata, processed_at, created_at, owner_id, processing_cost_usd, total_tokens_used')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (docsError) {
      console.error('Documents fetch error:', docsError);
    }

    // Calculate processing stage metrics
    const stageMetricsMap = new Map<string, { totalMs: number; count: number; errors: number }>();
    
    documents?.forEach(doc => {
      const steps = doc.processing_steps as Array<{
        stage: string;
        status: string;
        duration_ms?: number;
        error?: string;
      }> | null;
      
      if (steps && Array.isArray(steps)) {
        steps.forEach(step => {
          const existing = stageMetricsMap.get(step.stage) || { totalMs: 0, count: 0, errors: 0 };
          existing.count++;
          existing.totalMs += step.duration_ms || 0;
          if (step.status === 'error' || step.error) {
            existing.errors++;
          }
          stageMetricsMap.set(step.stage, existing);
        });
      }
    });

    const processingStageMetrics: ProcessingStageMetrics[] = Array.from(stageMetricsMap.entries())
      .map(([stage, metrics]) => ({
        stage,
        avgDurationMs: metrics.count > 0 ? Math.round(metrics.totalMs / metrics.count) : 0,
        totalExecutions: metrics.count,
        successRate: metrics.count > 0 ? Math.round(((metrics.count - metrics.errors) / metrics.count) * 100) : 0,
        errorCount: metrics.errors,
      }))
      .sort((a, b) => b.totalExecutions - a.totalExecutions);

    // Calculate error rates by file type
    const fileTypeMap = new Map<string, { total: number; errors: number; totalProcessingMs: number }>();
    
    documents?.forEach(doc => {
      const mimeType = doc.mime_type || 'unknown';
      const existing = fileTypeMap.get(mimeType) || { total: 0, errors: 0, totalProcessingMs: 0 };
      existing.total++;
      
      if (doc.status === 'error') {
        existing.errors++;
      }
      
      // Calculate total processing time from steps
      const steps = doc.processing_steps as Array<{ duration_ms?: number }> | null;
      if (steps && Array.isArray(steps)) {
        const totalMs = steps.reduce((sum, s) => sum + (s.duration_ms || 0), 0);
        existing.totalProcessingMs += totalMs;
      }
      
      fileTypeMap.set(mimeType, existing);
    });

    const fileTypeMetrics: FileTypeMetrics[] = Array.from(fileTypeMap.entries())
      .map(([mimeType, metrics]) => ({
        mimeType,
        totalCount: metrics.total,
        errorCount: metrics.errors,
        errorRate: metrics.total > 0 ? Math.round((metrics.errors / metrics.total) * 100) : 0,
        avgProcessingTime: metrics.total > 0 ? Math.round(metrics.totalProcessingMs / metrics.total) : 0,
      }))
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 10);

    // Get most active users
    const { data: usageLimits, error: usageError } = await adminClient
      .from('usage_limits')
      .select('user_id, documents_count, processing_count, updated_at')
      .order('processing_count', { ascending: false })
      .limit(10);

    if (usageError) {
      console.error('Usage limits error:', usageError);
    }

    // Get user details for active users
    const activeUserIds = usageLimits?.map(u => u.user_id) || [];
    const { data: userProfiles } = await adminClient
      .from('profiles')
      .select('id, name, email')
      .in('id', activeUserIds);

    const userProfileMap = new Map(userProfiles?.map(p => [p.id, p]) || []);

    const mostActiveUsers: ActiveUserMetrics[] = usageLimits?.map(usage => {
      const userProfile = userProfileMap.get(usage.user_id);
      return {
        userId: usage.user_id,
        userName: userProfile?.name || 'Unknown',
        email: userProfile?.email || '',
        documentsCount: usage.documents_count || 0,
        processingCount: usage.processing_count || 0,
        lastActivity: usage.updated_at,
      };
    }) || [];

    // Get most active projects
    const { data: projects, error: projectsError } = await adminClient
      .from('projects')
      .select('id, name, owner_id, document_count, updated_at')
      .order('document_count', { ascending: false })
      .limit(10);

    if (projectsError) {
      console.error('Projects error:', projectsError);
    }

    // Get owner names for projects
    const ownerIds = [...new Set(projects?.map(p => p.owner_id) || [])];
    const { data: ownerProfiles } = await adminClient
      .from('profiles')
      .select('id, name')
      .in('id', ownerIds);

    const ownerProfileMap = new Map(ownerProfiles?.map(p => [p.id, p]) || []);

    const mostActiveProjects: ActiveProjectMetrics[] = projects?.map(project => ({
      projectId: project.id,
      projectName: project.name,
      ownerName: ownerProfileMap.get(project.owner_id)?.name || 'Unknown',
      documentCount: project.document_count || 0,
      lastUpdated: project.updated_at,
    })) || [];

    // Get recent audit logs summary
    const { data: recentAuditLogs, error: auditError } = await adminClient
      .from('audit_logs')
      .select('action, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (auditError) {
      console.error('Audit logs error:', auditError);
    }

    // Calculate audit activity by action type
    const auditByAction: Record<string, number> = {};
    recentAuditLogs?.forEach(log => {
      auditByAction[log.action] = (auditByAction[log.action] || 0) + 1;
    });

    // Get processing trends (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentDocs } = await adminClient
      .from('documents')
      .select('created_at, status')
      .is('deleted_at', null)
      .gte('created_at', sevenDaysAgo.toISOString());

    // Group by day
    const processingTrends: Array<{ date: string; processed: number; errors: number }> = [];
    const trendMap = new Map<string, { processed: number; errors: number }>();

    recentDocs?.forEach(doc => {
      const date = new Date(doc.created_at).toISOString().split('T')[0];
      const existing = trendMap.get(date) || { processed: 0, errors: 0 };
      existing.processed++;
      if (doc.status === 'error') {
        existing.errors++;
      }
      trendMap.set(date, existing);
    });

    // Fill in missing days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const data = trendMap.get(dateStr) || { processed: 0, errors: 0 };
      processingTrends.push({ date: dateStr, ...data });
    }

    // ============= NEW: Cost Metrics =============
    const { data: dailyCosts } = await adminClient
      .from('v_daily_ai_costs')
      .select('*')
      .limit(30);

    const costMetrics: CostMetrics = {
      daily: (dailyCosts || []).map((row: Record<string, unknown>) => ({
        date: String(row.date),
        totalCost: Number(row.total_cost_usd) || 0,
        totalTokens: Number(row.total_tokens) || 0,
        documentsProcessed: Number(row.documents_processed) || 0,
      })),
      monthly: {
        totalCost: (dailyCosts || []).reduce((sum: number, row: Record<string, unknown>) => sum + (Number(row.total_cost_usd) || 0), 0),
        totalTokens: (dailyCosts || []).reduce((sum: number, row: Record<string, unknown>) => sum + (Number(row.total_tokens) || 0), 0),
        avgCostPerDocument: 0,
      },
      byStage: [],
    };

    // Calculate avg cost per document
    const totalDocs = (dailyCosts || []).reduce((sum: number, row: Record<string, unknown>) => sum + (Number(row.documents_processed) || 0), 0);
    costMetrics.monthly.avgCostPerDocument = totalDocs > 0 ? costMetrics.monthly.totalCost / totalDocs : 0;

    // Get stage-level cost breakdown
    const { data: stageLatencyData } = await adminClient
      .from('v_stage_latency_analysis')
      .select('*');

    costMetrics.byStage = (stageLatencyData || []).map((row: Record<string, unknown>) => ({
      stage: String(row.stage_name),
      totalCost: Number(row.total_cost_usd) || 0,
      avgCost: Number(row.avg_cost_per_call) || 0,
      totalTokens: Number(row.total_tokens_all_time) || 0,
    }));

    // ============= NEW: Pipeline Health =============
    const { data: healthData } = await adminClient
      .from('v_pipeline_health')
      .select('*');

    const FAILURE_THRESHOLD = 10; // 10% failure rate is concerning
    const CRITICAL_THRESHOLD = 25; // 25% failure rate is critical

    const pipelineHealthMetrics: PipelineHealthMetrics = {
      stages: (healthData || []).map((row: Record<string, unknown>) => ({
        stage: String(row.stage_name),
        totalLast24h: Number(row.total_last_24h) || 0,
        successful: Number(row.successful) || 0,
        failed: Number(row.failed) || 0,
        failureRatePercent: Number(row.failure_rate_percent) || 0,
        avgDurationMs: Number(row.avg_duration_ms) || 0,
      })),
      overallHealth: 'healthy',
      unhealthyStages: [],
    };

    // Determine overall health
    const unhealthyStages = pipelineHealthMetrics.stages.filter(s => s.failureRatePercent >= FAILURE_THRESHOLD);
    const criticalStages = pipelineHealthMetrics.stages.filter(s => s.failureRatePercent >= CRITICAL_THRESHOLD);

    pipelineHealthMetrics.unhealthyStages = unhealthyStages.map(s => s.stage);
    
    if (criticalStages.length > 0) {
      pipelineHealthMetrics.overallHealth = 'critical';
    } else if (unhealthyStages.length > 0) {
      pipelineHealthMetrics.overallHealth = 'degraded';
    }

    // ============= NEW: Most Expensive Documents =============
    const { data: expensiveDocsData } = await adminClient
      .from('v_expensive_documents')
      .select('*')
      .limit(10);

    const expensiveDocuments: ExpensiveDocument[] = (expensiveDocsData || []).map((row: Record<string, unknown>) => ({
      documentId: String(row.document_id),
      documentName: String(row.document_name),
      projectName: String(row.project_name) || 'Unknown',
      processingCostUsd: Number(row.processing_cost_usd) || 0,
      totalTokensUsed: Number(row.total_tokens_used) || 0,
      createdAt: String(row.created_at),
    }));

    // Calculate overall metrics
    const totalProcessed = documents?.length || 0;
    const totalErrors = documents?.filter(d => d.status === 'error').length || 0;
    const overallSuccessRate = totalProcessed > 0 
      ? Math.round(((totalProcessed - totalErrors) / totalProcessed) * 100) 
      : 100;
    const totalAiSpend = documents?.reduce((sum, d) => sum + (Number(d.processing_cost_usd) || 0), 0) || 0;
    const totalTokens = documents?.reduce((sum, d) => sum + (Number(d.total_tokens_used) || 0), 0) || 0;

    const metrics = {
      overview: {
        totalProcessed,
        totalErrors,
        overallSuccessRate,
        avgProcessingTimeMs: processingStageMetrics.reduce((sum, s) => sum + s.avgDurationMs, 0),
        totalAiSpendUsd: totalAiSpend,
        totalTokensUsed: totalTokens,
      },
      processingStageMetrics,
      fileTypeMetrics,
      mostActiveUsers,
      mostActiveProjects,
      auditByAction,
      processingTrends,
      costMetrics,
      pipelineHealth: pipelineHealthMetrics,
      expensiveDocuments,
    };

    return new Response(
      JSON.stringify(metrics),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin metrics error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});