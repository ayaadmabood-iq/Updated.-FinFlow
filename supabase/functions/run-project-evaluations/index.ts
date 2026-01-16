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

interface RunRequest {
  project_id: string;
  eval_set_id: string;
  experiment_ids?: string[];      // Optional: specific experiments to run
  auto_generated_only?: boolean;  // Only run auto-generated experiments
  select_baseline?: boolean;      // Auto-select best as baseline
  baseline_metric?: string;       // Metric to use for baseline selection (legacy)
  baseline_strategy?: BaselineStrategy; // Smart baseline selection strategy
}

interface CostMetrics {
  embedding_calls: number;
  embedding_tokens: number;
  embedding_cost_usd: number;
  evaluation_calls: number;
  total_tokens: number;
  estimated_usd: number;
  model_used: string;
}

interface LatencyStats {
  avg_query_latency_ms: number;
  p95_latency_ms: number;
}

interface ExperimentResult {
  experiment_id: string;
  experiment_name: string;
  run_id: string;
  status: 'completed' | 'failed' | 'skipped';
  metrics?: Record<string, number>;
  cost_metrics?: CostMetrics;
  latency_stats?: LatencyStats;
  efficiency_score?: number;
  error?: string;
}

interface BaselineSelection {
  experiment_id: string;
  experiment_name: string;
  strategy: BaselineStrategy;
  quality_score: number;
  cost_usd: number;
  avg_latency_ms: number;
  efficiency_score: number;
  comparison_note?: string;
}

// ============================================================================
// Scoring Functions
// ============================================================================

/**
 * Calculate efficiency score based on quality, cost, and latency
 * Higher is better
 */
function calculateEfficiencyScore(
  qualityScore: number,
  costUsd: number,
  avgLatencyMs: number
): number {
  // Avoid division by zero
  const safeCost = Math.max(costUsd, 0.000001);
  const safeLatency = Math.max(avgLatencyMs, 1);
  
  // Normalize latency to seconds for calculation
  const latencySeconds = safeLatency / 1000;
  
  // Efficiency = quality / (cost * latency)
  return qualityScore / (safeCost * latencySeconds);
}

/**
 * Select best experiment based on strategy
 */
function selectBestExperiment(
  results: ExperimentResult[],
  strategy: BaselineStrategy
): ExperimentResult | null {
  const completedResults = results.filter(r => r.status === 'completed' && r.metrics);
  
  if (completedResults.length === 0) return null;

  switch (strategy) {
    case 'quality_only':
      return completedResults.reduce((best, curr) => {
        const bestScore = best.metrics?.mean_mrr ?? 0;
        const currScore = curr.metrics?.mean_mrr ?? 0;
        return currScore > bestScore ? curr : best;
      });

    case 'cost_aware':
      // Maximize quality/cost ratio
      return completedResults.reduce((best, curr) => {
        const bestQuality = best.metrics?.mean_mrr ?? 0;
        const bestCost = best.cost_metrics?.estimated_usd ?? 0.000001;
        const currQuality = curr.metrics?.mean_mrr ?? 0;
        const currCost = curr.cost_metrics?.estimated_usd ?? 0.000001;
        
        const bestRatio = bestQuality / Math.max(bestCost, 0.000001);
        const currRatio = currQuality / Math.max(currCost, 0.000001);
        
        return currRatio > bestRatio ? curr : best;
      });

    case 'latency_aware':
      // Maximize quality/latency ratio
      return completedResults.reduce((best, curr) => {
        const bestQuality = best.metrics?.mean_mrr ?? 0;
        const bestLatency = best.latency_stats?.avg_query_latency_ms ?? 1;
        const currQuality = curr.metrics?.mean_mrr ?? 0;
        const currLatency = curr.latency_stats?.avg_query_latency_ms ?? 1;
        
        const bestRatio = bestQuality / Math.max(bestLatency, 1);
        const currRatio = currQuality / Math.max(currLatency, 1);
        
        return currRatio > bestRatio ? curr : best;
      });

    case 'balanced':
      // Use full efficiency score
      return completedResults.reduce((best, curr) => {
        const bestScore = best.efficiency_score ?? 0;
        const currScore = curr.efficiency_score ?? 0;
        return currScore > bestScore ? curr : best;
      });

    default:
      return completedResults[0];
  }
}

/**
 * Generate comparison note between best quality and selected baseline
 */
function generateComparisonNote(
  selected: ExperimentResult,
  bestQuality: ExperimentResult,
  strategy: BaselineStrategy
): string {
  if (selected.experiment_id === bestQuality.experiment_id) {
    return 'This is also the highest quality configuration.';
  }

  const selectedQuality = selected.metrics?.mean_mrr ?? 0;
  const bestQualityScore = bestQuality.metrics?.mean_mrr ?? 0;
  const qualityDiff = ((bestQualityScore - selectedQuality) / bestQualityScore) * 100;

  const selectedCost = selected.cost_metrics?.estimated_usd ?? 0;
  const bestCost = bestQuality.cost_metrics?.estimated_usd ?? 0;
  const costSavings = bestCost > 0 ? ((bestCost - selectedCost) / bestCost) * 100 : 0;

  const selectedLatency = selected.latency_stats?.avg_query_latency_ms ?? 0;
  const bestLatency = bestQuality.latency_stats?.avg_query_latency_ms ?? 0;
  const latencyReduction = bestLatency > 0 ? ((bestLatency - selectedLatency) / bestLatency) * 100 : 0;

  const parts: string[] = [];
  
  if (qualityDiff > 0) {
    parts.push(`${qualityDiff.toFixed(1)}% lower quality`);
  }
  if (costSavings > 0) {
    parts.push(`${costSavings.toFixed(0)}% cheaper`);
  }
  if (latencyReduction > 0) {
    parts.push(`${latencyReduction.toFixed(0)}% faster`);
  }

  if (parts.length === 0) {
    return 'Comparable to best quality configuration.';
  }

  return `This config is ${parts.join(' and ')}.`;
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const startTime = Date.now();

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
      experiment_ids,
      auto_generated_only = false,
      select_baseline = true,
      baseline_metric = 'mean_mrr',
      baseline_strategy = 'quality_only',
    }: RunRequest = await req.json();

    if (!project_id || !eval_set_id) {
      return new Response(JSON.stringify({ 
        error: 'project_id and eval_set_id are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Run Project Evaluations] Starting for project: ${project_id}, eval_set: ${eval_set_id}, strategy: ${baseline_strategy}`);

    // Verify eval set ownership
    const { data: evalSet, error: evalSetError } = await supabase
      .from('rag_eval_sets')
      .select('*')
      .eq('id', eval_set_id)
      .eq('user_id', user.id)
      .single();

    if (evalSetError || !evalSet) {
      return new Response(JSON.stringify({ error: 'Evaluation set not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch experiments to run
    let experimentQuery = supabase
      .from('rag_experiments')
      .select('*')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (experiment_ids && experiment_ids.length > 0) {
      experimentQuery = experimentQuery.in('id', experiment_ids);
    }

    if (auto_generated_only) {
      experimentQuery = experimentQuery.eq('auto_generated', true);
    }

    const { data: experiments, error: expError } = await experimentQuery;

    if (expError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch experiments' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!experiments || experiments.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No experiments to run',
        results: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Run Project Evaluations] Running ${experiments.length} experiments`);

    const results: ExperimentResult[] = [];
    let totalCostUsd = 0;

    // Run each experiment
    for (const experiment of experiments) {
      console.log(`[Run Project Evaluations] Running experiment: ${experiment.name}`);

      try {
        // Invoke the evaluation function
        const response = await supabase.functions.invoke('run-rag-evaluation', {
          body: {
            experiment_id: experiment.id,
            eval_set_id,
          },
          headers: {
            Authorization: authHeader,
          },
        });

        if (response.error) {
          console.error(`[Run Project Evaluations] Experiment ${experiment.name} failed:`, response.error);
          results.push({
            experiment_id: experiment.id,
            experiment_name: experiment.name,
            run_id: '',
            status: 'failed',
            error: response.error.message || 'Unknown error',
          });
          continue;
        }

        const evalResult = response.data;
        const costMetrics = evalResult.cost_metrics as CostMetrics;
        const latencyStats = evalResult.latency_stats as LatencyStats;
        
        // Calculate efficiency score
        const qualityScore = evalResult.metrics?.mean_mrr ?? 0;
        const costUsd = costMetrics?.estimated_usd ?? 0;
        const avgLatency = latencyStats?.avg_query_latency_ms ?? 1;
        const efficiencyScore = calculateEfficiencyScore(qualityScore, costUsd, avgLatency);

        totalCostUsd += costUsd;
        
        results.push({
          experiment_id: experiment.id,
          experiment_name: experiment.name,
          run_id: evalResult.run_id,
          status: 'completed',
          metrics: evalResult.metrics,
          cost_metrics: costMetrics,
          latency_stats: latencyStats,
          efficiency_score: efficiencyScore,
        });

      } catch (err) {
        console.error(`[Run Project Evaluations] Error running experiment ${experiment.name}:`, err);
        results.push({
          experiment_id: experiment.id,
          experiment_name: experiment.name,
          run_id: '',
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Select baseline based on strategy
    let baselineUpdated = false;
    let baselineSelection: BaselineSelection | null = null;
    
    if (select_baseline) {
      const bestByStrategy = selectBestExperiment(results, baseline_strategy);
      const bestByQuality = selectBestExperiment(results, 'quality_only');

      if (bestByStrategy) {
        console.log(`[Run Project Evaluations] Setting baseline (${baseline_strategy}): ${bestByStrategy.experiment_name}`);

        // Update experiment with baseline flag and strategy
        const { error: baselineError } = await supabase
          .from('rag_experiments')
          .update({ 
            is_baseline: true,
            baseline_strategy,
          })
          .eq('id', bestByStrategy.experiment_id);

        if (baselineError) {
          console.error('[Run Project Evaluations] Failed to set baseline:', baselineError);
        } else {
          baselineUpdated = true;
          
          baselineSelection = {
            experiment_id: bestByStrategy.experiment_id,
            experiment_name: bestByStrategy.experiment_name,
            strategy: baseline_strategy,
            quality_score: bestByStrategy.metrics?.mean_mrr ?? 0,
            cost_usd: bestByStrategy.cost_metrics?.estimated_usd ?? 0,
            avg_latency_ms: bestByStrategy.latency_stats?.avg_query_latency_ms ?? 0,
            efficiency_score: bestByStrategy.efficiency_score ?? 0,
            comparison_note: bestByQuality 
              ? generateComparisonNote(bestByStrategy, bestByQuality, baseline_strategy)
              : undefined,
          };
        }
      }
    }

    const duration = Date.now() - startTime;
    const completedCount = results.filter(r => r.status === 'completed').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    console.log(`[Run Project Evaluations] Completed in ${duration}ms: ${completedCount} succeeded, ${failedCount} failed`);

    // Generate summary
    let summary = '';
    if (baselineSelection) {
      summary = `Best RAG config found: ${baselineSelection.experiment_name} ` +
        `(MRR: ${baselineSelection.quality_score.toFixed(4)}, ` +
        `Cost: $${baselineSelection.cost_usd.toFixed(6)}, ` +
        `Latency: ${baselineSelection.avg_latency_ms.toFixed(0)}ms). ` +
        (baselineSelection.comparison_note || '');
    } else {
      summary = 'No successful evaluations completed';
    }

    return new Response(JSON.stringify({
      success: true,
      project_id,
      eval_set_id,
      baseline_strategy,
      total_experiments: experiments.length,
      completed: completedCount,
      failed: failedCount,
      total_cost_usd: totalCostUsd,
      results,
      baseline: baselineSelection,
      baseline_updated: baselineUpdated,
      summary,
      duration_ms: duration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Run Project Evaluations] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
