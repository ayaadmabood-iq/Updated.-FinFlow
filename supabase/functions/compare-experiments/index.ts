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

interface CompareRequest {
  experiment_ids?: string[];       // Compare specific experiments
  project_id?: string;            // Get best experiment for project
  metric?: string;                // Which metric to rank by (default: mean_mrr)
  eval_set_id?: string;           // Filter by specific eval set
  include_cost_analysis?: boolean; // Include cost/latency comparison
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

interface ExperimentSummary {
  experiment_id: string;
  experiment_name: string;
  embedding_model: string;
  chunking_config_hash: string | null;
  retrieval_config: Record<string, unknown>;
  is_baseline: boolean;
  auto_generated: boolean;
  run_count: number;
  latest_run: {
    run_id: string;
    executed_at: string;
    metrics: Record<string, number>;
    cost_metrics: CostMetrics | null;
    avg_query_latency_ms: number;
    p95_latency_ms: number;
  } | null;
  best_run: {
    run_id: string;
    executed_at: string;
    metrics: Record<string, number>;
    cost_metrics: CostMetrics | null;
    avg_query_latency_ms: number;
    p95_latency_ms: number;
  } | null;
}

interface RankingEntry {
  rank: number;
  experiment_id: string;
  experiment_name: string;
  value: number;
  difference_from_best: number;
  percentage_of_best: number;
  is_baseline: boolean;
}

interface CostComparisonEntry {
  experiment_id: string;
  experiment_name: string;
  quality_score: number;
  cost_usd: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  efficiency_score: number;
  quality_rank: number;
  efficiency_rank: number;
  cost_vs_best_quality: string; // e.g., "40% cheaper, 3% lower quality"
}

interface ComparisonResult {
  experiments: ExperimentSummary[];
  winner: {
    experiment_id: string;
    experiment_name: string;
    metric_name: string;
    metric_value: number;
  } | null;
  comparison_details: {
    metric_name: string;
    rankings: RankingEntry[];
  };
  cost_analysis?: {
    most_efficient: CostComparisonEntry | null;
    best_quality: CostComparisonEntry | null;
    cheapest: CostComparisonEntry | null;
    fastest: CostComparisonEntry | null;
    all_experiments: CostComparisonEntry[];
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateEfficiencyScore(
  qualityScore: number,
  costUsd: number,
  avgLatencyMs: number
): number {
  const safeCost = Math.max(costUsd, 0.000001);
  const safeLatency = Math.max(avgLatencyMs, 1);
  const latencySeconds = safeLatency / 1000;
  return qualityScore / (safeCost * latencySeconds);
}

function generateCostComparison(
  exp: CostComparisonEntry,
  bestQuality: CostComparisonEntry
): string {
  if (exp.experiment_id === bestQuality.experiment_id) {
    return 'Best quality configuration';
  }

  const parts: string[] = [];
  
  // Quality difference
  const qualityDiff = ((bestQuality.quality_score - exp.quality_score) / bestQuality.quality_score) * 100;
  if (qualityDiff > 0.1) {
    parts.push(`${qualityDiff.toFixed(1)}% lower quality`);
  }

  // Cost difference
  const costDiff = ((bestQuality.cost_usd - exp.cost_usd) / bestQuality.cost_usd) * 100;
  if (costDiff > 0) {
    parts.push(`${costDiff.toFixed(0)}% cheaper`);
  } else if (costDiff < -1) {
    parts.push(`${Math.abs(costDiff).toFixed(0)}% more expensive`);
  }

  // Latency difference
  const latencyDiff = ((bestQuality.avg_latency_ms - exp.avg_latency_ms) / bestQuality.avg_latency_ms) * 100;
  if (latencyDiff > 5) {
    parts.push(`${latencyDiff.toFixed(0)}% faster`);
  } else if (latencyDiff < -5) {
    parts.push(`${Math.abs(latencyDiff).toFixed(0)}% slower`);
  }

  return parts.length > 0 ? parts.join(', ') : 'Similar to best quality';
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
    const rateLimitResponse = await rateLimitMiddleware(supabase, user.id, 'default', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      experiment_ids, 
      project_id, 
      metric = 'mean_mrr',
      eval_set_id,
      include_cost_analysis = true,
    }: CompareRequest = await req.json();

    console.log(`[Compare] User: ${user.id}, Experiments: ${experiment_ids?.length || 'all'}, Project: ${project_id}`);

    // Fetch experiments
    let experimentQuery = supabase
      .from('rag_experiments')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (experiment_ids && experiment_ids.length > 0) {
      experimentQuery = experimentQuery.in('id', experiment_ids);
    } else if (project_id) {
      experimentQuery = experimentQuery.eq('project_id', project_id);
    } else {
      return new Response(JSON.stringify({ 
        error: 'Either experiment_ids or project_id is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
        experiments: [],
        winner: null,
        comparison_details: { metric_name: metric, rankings: [] },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch runs for each experiment
    const experimentSummaries: ExperimentSummary[] = [];
    const costComparisonData: CostComparisonEntry[] = [];

    for (const exp of experiments) {
      let runsQuery = supabase
        .from('rag_experiment_runs')
        .select('*')
        .eq('experiment_id', exp.id)
        .eq('status', 'completed')
        .order('executed_at', { ascending: false });

      if (eval_set_id) {
        runsQuery = runsQuery.eq('eval_set_id', eval_set_id);
      }

      const { data: runs, error: runsError } = await runsQuery;

      if (runsError) {
        console.error(`[Compare] Failed to fetch runs for experiment ${exp.id}:`, runsError);
        continue;
      }

      const latestRun = runs && runs.length > 0 ? runs[0] : null;
      
      // Find best run by the specified metric
      let bestRun = null;
      let bestMetricValue = -Infinity;
      
      for (const run of runs || []) {
        const metrics = run.metrics as Record<string, number>;
        const metricValue = metrics[metric] ?? 0;
        if (metricValue > bestMetricValue) {
          bestMetricValue = metricValue;
          bestRun = run;
        }
      }

      experimentSummaries.push({
        experiment_id: exp.id,
        experiment_name: exp.name,
        embedding_model: exp.embedding_model,
        chunking_config_hash: exp.chunking_config_hash,
        retrieval_config: exp.retrieval_config,
        is_baseline: exp.is_baseline || false,
        auto_generated: exp.auto_generated || false,
        run_count: runs?.length || 0,
        latest_run: latestRun ? {
          run_id: latestRun.id,
          executed_at: latestRun.executed_at,
          metrics: latestRun.metrics as Record<string, number>,
          cost_metrics: latestRun.cost_metrics as CostMetrics | null,
          avg_query_latency_ms: latestRun.avg_query_latency_ms || 0,
          p95_latency_ms: latestRun.p95_latency_ms || 0,
        } : null,
        best_run: bestRun ? {
          run_id: bestRun.id,
          executed_at: bestRun.executed_at,
          metrics: bestRun.metrics as Record<string, number>,
          cost_metrics: bestRun.cost_metrics as CostMetrics | null,
          avg_query_latency_ms: bestRun.avg_query_latency_ms || 0,
          p95_latency_ms: bestRun.p95_latency_ms || 0,
        } : null,
      });

      // Build cost comparison data
      if (bestRun && include_cost_analysis) {
        const qualityScore = (bestRun.metrics as Record<string, number>)?.[metric] ?? 0;
        const costMetrics = bestRun.cost_metrics as CostMetrics | null;
        const costUsd = costMetrics?.estimated_usd ?? 0;
        const avgLatency = bestRun.avg_query_latency_ms || 0;
        const p95Latency = bestRun.p95_latency_ms || 0;

        costComparisonData.push({
          experiment_id: exp.id,
          experiment_name: exp.name,
          quality_score: qualityScore,
          cost_usd: costUsd,
          avg_latency_ms: avgLatency,
          p95_latency_ms: p95Latency,
          efficiency_score: calculateEfficiencyScore(qualityScore, costUsd, avgLatency),
          quality_rank: 0, // Will be filled in
          efficiency_rank: 0, // Will be filled in
          cost_vs_best_quality: '', // Will be filled in
        });
      }
    }

    // Rank experiments by the specified metric (using best run)
    const rankings = experimentSummaries
      .filter(e => e.best_run !== null)
      .map(e => ({
        experiment_id: e.experiment_id,
        experiment_name: e.experiment_name,
        value: (e.best_run?.metrics[metric] ?? 0) as number,
        is_baseline: e.is_baseline,
      }))
      .sort((a, b) => b.value - a.value);

    const bestValue = rankings.length > 0 ? rankings[0].value : 0;

    const detailedRankings: RankingEntry[] = rankings.map((r, index) => ({
      rank: index + 1,
      experiment_id: r.experiment_id,
      experiment_name: r.experiment_name,
      value: r.value,
      difference_from_best: bestValue - r.value,
      percentage_of_best: bestValue > 0 ? (r.value / bestValue) * 100 : 0,
      is_baseline: r.is_baseline,
    }));

    const winner = rankings.length > 0 ? {
      experiment_id: rankings[0].experiment_id,
      experiment_name: rankings[0].experiment_name,
      metric_name: metric,
      metric_value: rankings[0].value,
    } : null;

    // Build cost analysis
    let costAnalysis = undefined;
    if (include_cost_analysis && costComparisonData.length > 0) {
      // Sort by quality for ranking
      const sortedByQuality = [...costComparisonData].sort((a, b) => b.quality_score - a.quality_score);
      sortedByQuality.forEach((entry, idx) => {
        const found = costComparisonData.find(e => e.experiment_id === entry.experiment_id);
        if (found) found.quality_rank = idx + 1;
      });

      // Sort by efficiency for ranking
      const sortedByEfficiency = [...costComparisonData].sort((a, b) => b.efficiency_score - a.efficiency_score);
      sortedByEfficiency.forEach((entry, idx) => {
        const found = costComparisonData.find(e => e.experiment_id === entry.experiment_id);
        if (found) found.efficiency_rank = idx + 1;
      });

      // Generate comparison notes
      const bestQuality = sortedByQuality[0];
      costComparisonData.forEach(entry => {
        entry.cost_vs_best_quality = generateCostComparison(entry, bestQuality);
      });

      const sortedByCost = [...costComparisonData].sort((a, b) => a.cost_usd - b.cost_usd);
      const sortedByLatency = [...costComparisonData].sort((a, b) => a.avg_latency_ms - b.avg_latency_ms);

      costAnalysis = {
        most_efficient: sortedByEfficiency[0] || null,
        best_quality: sortedByQuality[0] || null,
        cheapest: sortedByCost[0] || null,
        fastest: sortedByLatency[0] || null,
        all_experiments: costComparisonData,
      };
    }

    const result: ComparisonResult = {
      experiments: experimentSummaries,
      winner,
      comparison_details: {
        metric_name: metric,
        rankings: detailedRankings,
      },
      cost_analysis: costAnalysis,
    };

    console.log(`[Compare] Completed. Winner: ${winner?.experiment_name || 'none'}`);

    return new Response(JSON.stringify({
      success: true,
      ...result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Compare] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
