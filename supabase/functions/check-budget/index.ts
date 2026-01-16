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

type EnforcementMode = 'warn' | 'abort' | 'auto_downgrade';
type OperationType = 'experiment_run' | 'evaluation' | 'optimization' | 'query';

interface BudgetCheckRequest {
  project_id: string;
  operation_type: OperationType;
  estimated_cost_usd?: number;
  config?: {
    embedding_model?: string;
    top_k?: number;
    chunk_overlap?: number;
    num_experiments?: number;
    num_queries?: number;
  };
}

interface BudgetStatus {
  monthly_budget_usd: number;
  current_spending_usd: number;
  remaining_budget_usd: number;
  estimated_cost_usd: number;
  will_exceed_budget: boolean;
  burn_rate_per_day_usd: number;
  projected_month_end_usd: number;
  on_track: boolean;
  enforcement_mode: EnforcementMode;
  max_cost_per_query_usd: number;
}

interface DowngradeConfig {
  embedding_model: string;
  top_k: number;
  chunk_overlap: number;
  num_experiments: number;
}

interface BudgetDecision {
  action: 'proceed' | 'warn' | 'abort' | 'downgrade';
  reason: string;
  original_config?: DowngradeConfig;
  adjusted_config?: DowngradeConfig;
  estimated_cost_usd: number;
  adjusted_cost_usd?: number;
  quality_impact_percent?: number;
  cost_savings_percent?: number;
}

// ============================================================================
// Cost Estimation Constants
// ============================================================================

const EMBEDDING_COSTS: Record<string, { input_per_million: number; quality_score: number }> = {
  'text-embedding-3-large': { input_per_million: 0.13, quality_score: 1.0 },
  'text-embedding-3-small': { input_per_million: 0.02, quality_score: 0.85 },
  'text-embedding-ada-002': { input_per_million: 0.10, quality_score: 0.80 },
};

// Average tokens per query (rough estimate)
const AVG_TOKENS_PER_QUERY = 50;

// Top K quality impact (relative to top_k=20)
const TOP_K_QUALITY: Record<number, number> = {
  3: 0.75,
  5: 0.85,
  10: 0.95,
  20: 1.0,
};

// ============================================================================
// Helper Functions
// ============================================================================

function estimateOperationCost(
  operationType: OperationType,
  config: {
    embedding_model?: string;
    top_k?: number;
    num_experiments?: number;
    num_queries?: number;
  }
): number {
  const embeddingModel = config.embedding_model || 'text-embedding-3-small';
  const costPerMillion = EMBEDDING_COSTS[embeddingModel]?.input_per_million || 0.02;
  const numQueries = config.num_queries || 10;
  const numExperiments = config.num_experiments || 1;

  // Cost per embedding call
  const tokensPerQuery = AVG_TOKENS_PER_QUERY;
  const costPerQuery = (tokensPerQuery / 1_000_000) * costPerMillion;

  switch (operationType) {
    case 'query':
      return costPerQuery;
    case 'experiment_run':
    case 'evaluation':
      return costPerQuery * numQueries;
    case 'optimization':
      return costPerQuery * numQueries * numExperiments;
    default:
      return costPerQuery;
  }
}

function findCheaperConfig(
  currentConfig: DowngradeConfig,
  budgetRemaining: number,
  estimatedCost: number
): { config: DowngradeConfig; cost: number; qualityImpact: number } | null {
  const downgrades: Array<{
    config: Partial<DowngradeConfig>;
    costReduction: number;
    qualityImpact: number;
  }> = [
    // Tier 1: Switch to smaller embedding model (biggest cost savings)
    {
      config: { embedding_model: 'text-embedding-3-small' },
      costReduction: 0.85, // 85% cost reduction from large to small
      qualityImpact: -15, // 15% quality reduction
    },
    // Tier 2: Reduce top_k
    {
      config: { top_k: 5 },
      costReduction: 0.25,
      qualityImpact: -5,
    },
    // Tier 3: Reduce experiments
    {
      config: { num_experiments: Math.max(5, Math.floor(currentConfig.num_experiments / 2)) },
      costReduction: 0.5,
      qualityImpact: -10,
    },
    // Tier 4: Aggressive reduction
    {
      config: { 
        embedding_model: 'text-embedding-3-small', 
        top_k: 3,
        num_experiments: 5,
      },
      costReduction: 0.75,
      qualityImpact: -25,
    },
  ];

  // Try each downgrade option until we find one that fits budget
  for (const downgrade of downgrades) {
    const adjustedCost = estimatedCost * (1 - downgrade.costReduction);
    
    if (adjustedCost <= budgetRemaining) {
      return {
        config: { ...currentConfig, ...downgrade.config },
        cost: adjustedCost,
        qualityImpact: downgrade.qualityImpact,
      };
    }
  }

  return null;
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
      project_id,
      operation_type,
      estimated_cost_usd,
      config = {},
    }: BudgetCheckRequest = await req.json();

    if (!project_id || !operation_type) {
      return new Response(JSON.stringify({ 
        error: 'project_id and operation_type are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Budget Guard] Checking budget for project: ${project_id}, operation: ${operation_type}`);

    // Calculate estimated cost if not provided
    const calculatedCost = estimated_cost_usd ?? estimateOperationCost(operation_type, config);

    // Get budget status from database function
    const { data: budgetData, error: budgetError } = await supabase
      .rpc('check_project_budget', {
        p_project_id: project_id,
        p_estimated_cost: calculatedCost,
      });

    if (budgetError) {
      console.error('[Budget Guard] Error checking budget:', budgetError);
      return new Response(JSON.stringify({ error: 'Failed to check budget' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const budgetStatus = budgetData as BudgetStatus;

    // Determine action based on budget status and enforcement mode
    let decision: BudgetDecision;
    const originalConfig: DowngradeConfig = {
      embedding_model: config.embedding_model || 'text-embedding-3-small',
      top_k: config.top_k || 10,
      chunk_overlap: config.chunk_overlap || 50,
      num_experiments: config.num_experiments || 10,
    };

    if (!budgetStatus.will_exceed_budget) {
      // Within budget - proceed
      decision = {
        action: 'proceed',
        reason: `Operation within budget. Remaining: $${budgetStatus.remaining_budget_usd.toFixed(4)}`,
        original_config: originalConfig,
        estimated_cost_usd: calculatedCost,
      };
    } else {
      // Would exceed budget - handle based on enforcement mode
      switch (budgetStatus.enforcement_mode) {
        case 'warn':
          decision = {
            action: 'warn',
            reason: `Warning: Operation would exceed monthly budget by $${(calculatedCost - budgetStatus.remaining_budget_usd).toFixed(4)}`,
            original_config: originalConfig,
            estimated_cost_usd: calculatedCost,
          };
          break;

        case 'abort':
          decision = {
            action: 'abort',
            reason: `Operation aborted: Would exceed monthly budget. ` +
              `Remaining: $${budgetStatus.remaining_budget_usd.toFixed(4)}, ` +
              `Estimated cost: $${calculatedCost.toFixed(4)}`,
            original_config: originalConfig,
            estimated_cost_usd: calculatedCost,
          };
          break;

        case 'auto_downgrade':
          const downgradeResult = findCheaperConfig(
            originalConfig,
            budgetStatus.remaining_budget_usd,
            calculatedCost
          );

          if (downgradeResult) {
            const costSavings = ((calculatedCost - downgradeResult.cost) / calculatedCost) * 100;
            
            decision = {
              action: 'downgrade',
              reason: `Auto-downgraded to fit budget. ` +
                `Quality reduced by ${Math.abs(downgradeResult.qualityImpact)}%, ` +
                `cost reduced by ${costSavings.toFixed(0)}%`,
              original_config: originalConfig,
              adjusted_config: downgradeResult.config,
              estimated_cost_usd: calculatedCost,
              adjusted_cost_usd: downgradeResult.cost,
              quality_impact_percent: downgradeResult.qualityImpact,
              cost_savings_percent: costSavings,
            };
          } else {
            // Cannot downgrade enough - abort
            decision = {
              action: 'abort',
              reason: `Cannot fit operation within budget even with maximum downgrades. ` +
                `Remaining: $${budgetStatus.remaining_budget_usd.toFixed(4)}`,
              original_config: originalConfig,
              estimated_cost_usd: calculatedCost,
            };
          }
          break;

        default:
          decision = {
            action: 'warn',
            reason: 'Unknown enforcement mode, defaulting to warn',
            estimated_cost_usd: calculatedCost,
          };
      }
    }

    // Log the decision
    if (decision.action !== 'proceed') {
      const { error: logError } = await supabase
        .from('budget_decisions')
        .insert({
          project_id,
          user_id: user.id,
          decision_type: decision.action,
          reason: decision.reason,
          original_config: decision.original_config,
          adjusted_config: decision.adjusted_config,
          estimated_cost_usd: decision.estimated_cost_usd,
          quality_impact_percent: decision.quality_impact_percent,
          cost_savings_percent: decision.cost_savings_percent,
        });

      if (logError) {
        console.error('[Budget Guard] Error logging decision:', logError);
      }
    }

    console.log(`[Budget Guard] Decision: ${decision.action} - ${decision.reason}`);

    return new Response(JSON.stringify({
      success: true,
      budget_status: budgetStatus,
      decision,
      can_proceed: decision.action !== 'abort',
      use_config: decision.adjusted_config || decision.original_config,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Budget Guard] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
