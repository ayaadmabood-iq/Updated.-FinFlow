import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ============================================================================
// Types
// ============================================================================

type BaselineStrategy = 'quality_only' | 'cost_aware' | 'latency_aware' | 'balanced';

interface OptimizeRequest {
  project_id: string;
  eval_set_id: string;
  max_experiments?: number;
  baseline_metric?: string;
  baseline_strategy?: BaselineStrategy;
  skip_budget_check?: boolean;
}

interface OptimizationResult {
  phase: string;
  status: 'completed' | 'failed' | 'skipped';
  message: string;
  data?: Record<string, unknown>;
}

interface BaselineInfo {
  experiment_id: string;
  experiment_name: string;
  strategy: BaselineStrategy;
  quality_score: number;
  cost_usd: number;
  avg_latency_ms: number;
  efficiency_score: number;
  comparison_note?: string;
}

interface BudgetDecision {
  action: 'proceed' | 'warn' | 'abort' | 'downgrade';
  reason: string;
  adjusted_config?: Record<string, unknown>;
  cost_savings_percent?: number;
  quality_impact_percent?: number;
}

// ============================================================================
// Main Handler - Orchestrates the full optimization pipeline
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const startTime = Date.now();
  const phases: OptimizationResult[] = [];

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, user.id, 'generate', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      project_id,
      eval_set_id,
      max_experiments = 20,
      baseline_metric = 'mean_mrr',
      baseline_strategy = 'balanced',
      skip_budget_check = false,
    }: OptimizeRequest = await req.json();

    if (!project_id || !eval_set_id) {
      return new Response(JSON.stringify({ 
        error: 'project_id and eval_set_id are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Optimize RAG] Starting optimization for project: ${project_id}, strategy: ${baseline_strategy}`);

    // Get eval set query count for cost estimation
    const { data: evalSet, error: evalSetError } = await supabase
      .from('rag_eval_sets')
      .select('query_count')
      .eq('id', eval_set_id)
      .single();

    const numQueries = evalSet?.query_count || 10;

    // ========================================================================
    // Phase 0: Budget Check
    // ========================================================================
    let effectiveMaxExperiments = max_experiments;
    let budgetDecision: BudgetDecision | null = null;

    if (!skip_budget_check) {
      console.log('[Optimize RAG] Phase 0: Checking budget...');

      try {
        const budgetResponse = await supabase.functions.invoke('check-budget', {
          body: {
            project_id,
            operation_type: 'optimization',
            config: {
              num_experiments: max_experiments,
              num_queries: numQueries,
            },
          },
          headers: {
            Authorization: authHeader,
          },
        });

        if (budgetResponse.error) {
          phases.push({
            phase: 'budget_check',
            status: 'failed',
            message: budgetResponse.error.message || 'Failed to check budget',
          });
        } else {
          budgetDecision = budgetResponse.data.decision as BudgetDecision;
          
          if (budgetDecision.action === 'abort') {
            phases.push({
              phase: 'budget_check',
              status: 'failed',
              message: budgetDecision.reason,
              data: { budget_status: budgetResponse.data.budget_status },
            });

            // Return early - cannot proceed
            return new Response(JSON.stringify({
              success: false,
              project_id,
              eval_set_id,
              phases,
              error: budgetDecision.reason,
              budget_exceeded: true,
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (budgetDecision.action === 'downgrade') {
            // Apply downgraded config
            const adjustedConfig = budgetDecision.adjusted_config || {};
            effectiveMaxExperiments = (adjustedConfig.num_experiments as number) || max_experiments;
            
            phases.push({
              phase: 'budget_check',
              status: 'completed',
              message: budgetDecision.reason,
              data: {
                original_experiments: max_experiments,
                adjusted_experiments: effectiveMaxExperiments,
                quality_impact_percent: budgetDecision.quality_impact_percent,
                cost_savings_percent: budgetDecision.cost_savings_percent,
              },
            });
          } else if (budgetDecision.action === 'warn') {
            phases.push({
              phase: 'budget_check',
              status: 'completed',
              message: budgetDecision.reason,
              data: { warning: true },
            });
          } else {
            phases.push({
              phase: 'budget_check',
              status: 'completed',
              message: 'Budget check passed',
              data: { budget_status: budgetResponse.data.budget_status },
            });
          }
        }
      } catch (err) {
        phases.push({
          phase: 'budget_check',
          status: 'failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
        // Continue anyway - budget check is non-blocking on error
      }
    }

    // ========================================================================
    // Phase 1: Generate Experiments
    // ========================================================================
    console.log('[Optimize RAG] Phase 1: Generating experiments...');

    try {
      const genResponse = await supabase.functions.invoke('generate-rag-experiments', {
        body: {
          project_id,
          max_experiments: effectiveMaxExperiments,
        },
        headers: {
          Authorization: authHeader,
        },
      });

      if (genResponse.error) {
        phases.push({
          phase: 'generate_experiments',
          status: 'failed',
          message: genResponse.error.message || 'Failed to generate experiments',
        });
      } else {
        phases.push({
          phase: 'generate_experiments',
          status: 'completed',
          message: `Generated ${genResponse.data.created_count} experiments (${genResponse.data.skipped_count} skipped)`,
          data: {
            created_count: genResponse.data.created_count,
            skipped_count: genResponse.data.skipped_count,
            batch_id: genResponse.data.batch_id,
          },
        });
      }
    } catch (err) {
      phases.push({
        phase: 'generate_experiments',
        status: 'failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    // ========================================================================
    // Phase 2: Run Evaluations with Cost-Aware Baseline Selection
    // ========================================================================
    console.log('[Optimize RAG] Phase 2: Running evaluations...');

    let evaluationResult: Record<string, unknown> | null = null;

    try {
      const evalResponse = await supabase.functions.invoke('run-project-evaluations', {
        body: {
          project_id,
          eval_set_id,
          auto_generated_only: true,
          select_baseline: true,
          baseline_metric,
          baseline_strategy,
        },
        headers: {
          Authorization: authHeader,
        },
      });

      if (evalResponse.error) {
        phases.push({
          phase: 'run_evaluations',
          status: 'failed',
          message: evalResponse.error.message || 'Failed to run evaluations',
        });
      } else {
        evaluationResult = evalResponse.data;
        const totalCost = evalResponse.data.total_cost_usd || 0;
        phases.push({
          phase: 'run_evaluations',
          status: 'completed',
          message: `Evaluated ${evalResponse.data.completed}/${evalResponse.data.total_experiments} experiments (Total cost: $${totalCost.toFixed(6)})`,
          data: {
            total: evalResponse.data.total_experiments,
            completed: evalResponse.data.completed,
            failed: evalResponse.data.failed,
            total_cost_usd: totalCost,
          },
        });
      }
    } catch (err) {
      phases.push({
        phase: 'run_evaluations',
        status: 'failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    // ========================================================================
    // Phase 3: Report Baseline Selection with Cost Analysis
    // ========================================================================
    console.log('[Optimize RAG] Phase 3: Analyzing baseline selection...');

    let baselineInfo: BaselineInfo | null = null;

    if (evaluationResult?.baseline) {
      const baseline = evaluationResult.baseline as BaselineInfo;
      baselineInfo = baseline;
      
      const strategyDescriptions: Record<BaselineStrategy, string> = {
        quality_only: 'highest quality',
        cost_aware: 'best quality/cost ratio',
        latency_aware: 'best quality/latency ratio',
        balanced: 'most efficient overall',
      };
      
      phases.push({
        phase: 'select_baseline',
        status: 'completed',
        message: `Selected ${strategyDescriptions[baseline.strategy]}: ${baseline.experiment_name} ` +
          `(MRR: ${baseline.quality_score.toFixed(4)}, Cost: $${baseline.cost_usd.toFixed(6)}, ` +
          `Latency: ${baseline.avg_latency_ms.toFixed(0)}ms). ${baseline.comparison_note || ''}`,
        data: baseline as unknown as Record<string, unknown>,
      });
    } else {
      phases.push({
        phase: 'select_baseline',
        status: 'skipped',
        message: 'No baseline selected - no successful evaluations',
      });
    }

    // ========================================================================
    // Summary with Cost/Quality Tradeoff Analysis
    // ========================================================================
    const duration = Date.now() - startTime;
    const successfulPhases = phases.filter(p => p.status === 'completed').length;
    const failedPhases = phases.filter(p => p.status === 'failed').length;
    const totalCost = (evaluationResult?.total_cost_usd as number) || 0;

    // Get budget status for final summary
    let budgetSummary = '';
    if (budgetDecision?.action === 'downgrade') {
      budgetSummary = ` Quality reduced by ${Math.abs(budgetDecision.quality_impact_percent || 0)}%, ` +
        `cost reduced by ${budgetDecision.cost_savings_percent?.toFixed(0) || 0}%.`;
    }

    let summary = '';
    if (baselineInfo) {
      summary = `Best RAG config found: ${baselineInfo.experiment_name} ` +
        `(Quality: ${(baselineInfo.quality_score * 100).toFixed(1)}%, ` +
        `Cost: $${baselineInfo.cost_usd.toFixed(6)}, ` +
        `Latency: ${baselineInfo.avg_latency_ms.toFixed(0)}ms).`;
      
      if (baselineInfo.comparison_note) {
        summary += ` ${baselineInfo.comparison_note}`;
      }
      summary += budgetSummary;
    } else {
      summary = 'Optimization completed but no winning configuration identified';
    }

    console.log(`[Optimize RAG] Completed in ${duration}ms: ${summary}`);

    // Fetch final budget report
    const { data: budgetReport } = await supabase.functions.invoke('budget-report', {
      body: { project_id, include_history: false },
      headers: { Authorization: authHeader },
    });

    return new Response(JSON.stringify({
      success: successfulPhases > 0,
      project_id,
      eval_set_id,
      baseline_strategy,
      phases,
      best_config: baselineInfo,
      summary,
      cost_summary: {
        total_evaluation_cost_usd: totalCost,
        selected_config_cost_per_query_usd: baselineInfo?.cost_usd || 0,
        budget_status: budgetReport?.report?.projections?.status,
        remaining_budget_usd: budgetReport?.report?.current_period?.remaining_budget_usd,
      },
      budget_decision: budgetDecision,
      duration_ms: duration,
      metrics: {
        successful_phases: successfulPhases,
        failed_phases: failedPhases,
        total_phases: phases.length,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Optimize RAG] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      phases,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
