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

interface BudgetReportRequest {
  project_id: string;
  include_history?: boolean;
  days?: number; // How many days of history to include
}

interface CostBreakdown {
  operation_type: string;
  total_cost_usd: number;
  count: number;
  avg_cost_usd: number;
}

interface DailySpending {
  date: string;
  cost_usd: number;
  operation_count: number;
}

interface SavingsAnalysis {
  total_saved_usd: number;
  savings_from_downgrades: number;
  quality_preserved_percent: number;
  downgrade_count: number;
}

interface BudgetReport {
  project_id: string;
  project_name: string;
  budget: {
    monthly_budget_usd: number;
    max_cost_per_query_usd: number;
    preferred_baseline_strategy: string;
    enforcement_mode: string;
  };
  current_period: {
    start_date: string;
    end_date: string;
    current_spending_usd: number;
    remaining_budget_usd: number;
    utilization_percent: number;
  };
  projections: {
    burn_rate_per_day_usd: number;
    projected_month_end_usd: number;
    days_until_budget_exhausted: number | null;
    on_track: boolean;
    status: 'under_budget' | 'on_track' | 'at_risk' | 'over_budget';
  };
  breakdown_by_operation: CostBreakdown[];
  daily_spending?: DailySpending[];
  savings_analysis: SavingsAnalysis;
  recommendations: string[];
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
      include_history = true,
      days = 30,
    }: BudgetReportRequest = await req.json();

    if (!project_id) {
      return new Response(JSON.stringify({ error: 'project_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Budget Report] Generating report for project: ${project_id}`);

    // Fetch project settings
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .eq('owner_id', user.id)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysInMonth = monthEnd.getDate();
    const daysElapsed = now.getDate();
    const daysRemaining = daysInMonth - daysElapsed;

    // Get current month spending
    const { data: costLogs, error: costError } = await supabase
      .from('project_cost_logs')
      .select('*')
      .eq('project_id', project_id)
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString());

    if (costError) {
      console.error('[Budget Report] Error fetching cost logs:', costError);
    }

    const logs = costLogs || [];
    const totalSpending = logs.reduce((sum, log) => sum + (parseFloat(log.cost_usd) || 0), 0);
    const monthlyBudget = parseFloat(project.monthly_budget_usd) || 50;
    const remaining = monthlyBudget - totalSpending;
    const utilization = (totalSpending / monthlyBudget) * 100;

    // Calculate burn rate and projections
    const burnRate = daysElapsed > 0 ? totalSpending / daysElapsed : 0;
    const projectedMonthEnd = burnRate * daysInMonth;
    const daysUntilExhausted = burnRate > 0 ? remaining / burnRate : null;

    // Determine status
    let status: 'under_budget' | 'on_track' | 'at_risk' | 'over_budget';
    if (totalSpending > monthlyBudget) {
      status = 'over_budget';
    } else if (projectedMonthEnd > monthlyBudget * 1.1) {
      status = 'at_risk';
    } else if (projectedMonthEnd <= monthlyBudget) {
      status = 'on_track';
    } else {
      status = 'under_budget';
    }

    // Breakdown by operation type
    const operationBreakdown: Record<string, { cost: number; count: number }> = {};
    for (const log of logs) {
      const opType = log.operation_type || 'unknown';
      if (!operationBreakdown[opType]) {
        operationBreakdown[opType] = { cost: 0, count: 0 };
      }
      operationBreakdown[opType].cost += parseFloat(log.cost_usd) || 0;
      operationBreakdown[opType].count++;
    }

    const breakdownByOperation: CostBreakdown[] = Object.entries(operationBreakdown)
      .map(([opType, data]) => ({
        operation_type: opType,
        total_cost_usd: data.cost,
        count: data.count,
        avg_cost_usd: data.count > 0 ? data.cost / data.count : 0,
      }))
      .sort((a, b) => b.total_cost_usd - a.total_cost_usd);

    // Daily spending history
    let dailySpending: DailySpending[] | undefined;
    if (include_history) {
      const dailyMap: Record<string, { cost: number; count: number }> = {};
      for (const log of logs) {
        const date = log.created_at.split('T')[0];
        if (!dailyMap[date]) {
          dailyMap[date] = { cost: 0, count: 0 };
        }
        dailyMap[date].cost += parseFloat(log.cost_usd) || 0;
        dailyMap[date].count++;
      }

      dailySpending = Object.entries(dailyMap)
        .map(([date, data]) => ({
          date,
          cost_usd: data.cost,
          operation_count: data.count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    // Savings analysis from budget decisions
    const { data: decisions, error: decisionsError } = await supabase
      .from('budget_decisions')
      .select('*')
      .eq('project_id', project_id)
      .eq('decision_type', 'downgrade')
      .gte('created_at', monthStart.toISOString());

    let savingsAnalysis: SavingsAnalysis = {
      total_saved_usd: 0,
      savings_from_downgrades: 0,
      quality_preserved_percent: 100,
      downgrade_count: 0,
    };

    if (!decisionsError && decisions && decisions.length > 0) {
      let totalQualityImpact = 0;
      let totalSavings = 0;

      for (const decision of decisions) {
        const estimated = parseFloat(decision.estimated_cost_usd) || 0;
        const actual = parseFloat(decision.actual_cost_usd) || estimated;
        totalSavings += estimated - actual;
        totalQualityImpact += Math.abs(parseFloat(decision.quality_impact_percent) || 0);
      }

      savingsAnalysis = {
        total_saved_usd: totalSavings,
        savings_from_downgrades: totalSavings,
        quality_preserved_percent: 100 - (totalQualityImpact / decisions.length),
        downgrade_count: decisions.length,
      };
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (status === 'over_budget') {
      recommendations.push('Consider increasing your monthly budget or switching to cost_aware baseline strategy');
    }
    if (status === 'at_risk') {
      recommendations.push('You may exceed your budget this month. Consider enabling auto_downgrade enforcement');
    }
    if (burnRate > (monthlyBudget / daysInMonth) * 1.5) {
      recommendations.push('Your spending rate is 50%+ above average. Review your RAG configuration');
    }
    if (project.budget_enforcement_mode === 'warn' && status !== 'under_budget') {
      recommendations.push('Switch to auto_downgrade mode to automatically stay within budget');
    }
    if (breakdownByOperation.some(b => b.operation_type === 'optimization' && b.total_cost_usd > monthlyBudget * 0.3)) {
      recommendations.push('Optimization operations are consuming 30%+ of budget. Reduce max_experiments');
    }
    if (savingsAnalysis.quality_preserved_percent < 90) {
      recommendations.push(`Quality degradation detected (${savingsAnalysis.quality_preserved_percent.toFixed(0)}%). Consider increasing budget.`);
    }
    if (recommendations.length === 0) {
      recommendations.push('Your budget is on track. No action needed.');
    }

    // Build final report
    const report: BudgetReport = {
      project_id,
      project_name: project.name,
      budget: {
        monthly_budget_usd: monthlyBudget,
        max_cost_per_query_usd: parseFloat(project.max_cost_per_query_usd) || 0.01,
        preferred_baseline_strategy: project.preferred_baseline_strategy || 'balanced',
        enforcement_mode: project.budget_enforcement_mode || 'warn',
      },
      current_period: {
        start_date: monthStart.toISOString().split('T')[0],
        end_date: monthEnd.toISOString().split('T')[0],
        current_spending_usd: totalSpending,
        remaining_budget_usd: remaining,
        utilization_percent: utilization,
      },
      projections: {
        burn_rate_per_day_usd: burnRate,
        projected_month_end_usd: projectedMonthEnd,
        days_until_budget_exhausted: daysUntilExhausted,
        on_track: status === 'on_track' || status === 'under_budget',
        status,
      },
      breakdown_by_operation: breakdownByOperation,
      daily_spending: dailySpending,
      savings_analysis: savingsAnalysis,
      recommendations,
    };

    // Generate summary message
    const summaryMessage = savingsAnalysis.downgrade_count > 0
      ? `We stayed within your $${monthlyBudget.toFixed(0)} budget and preserved ${savingsAnalysis.quality_preserved_percent.toFixed(0)}% quality.`
      : `Budget utilization: ${utilization.toFixed(0)}%. Status: ${status}.`;

    console.log(`[Budget Report] Generated report: ${summaryMessage}`);

    return new Response(JSON.stringify({
      success: true,
      report,
      summary: summaryMessage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Budget Report] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
