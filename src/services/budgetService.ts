import { supabase } from '@/integrations/supabase/client';

export type BaselineStrategy = 'quality_only' | 'cost_aware' | 'latency_aware' | 'balanced';
export type EnforcementMode = 'warn' | 'abort' | 'auto_downgrade';
export type BudgetStatus = 'under_budget' | 'on_track' | 'at_risk' | 'over_budget';

export interface BudgetSettings {
  monthlyBudgetUsd: number;
  maxCostPerQueryUsd: number;
  preferredBaselineStrategy: BaselineStrategy;
  budgetEnforcementMode: EnforcementMode;
}

export interface BudgetSummary {
  monthlyBudget: number;
  currentSpending: number;
  remainingBudget: number;
  budgetUsedPercent: number;
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
  dailyBurnRate: number;
  projectedMonthEnd: number;
  daysUntilExhausted: number | null;
  status: BudgetStatus;
}

export interface CostBreakdownItem {
  operationType: string;
  totalCost: number;
  count: number;
  avgCost: number;
}

export interface BudgetDecision {
  id: string;
  projectId: string;
  userId: string;
  decisionType: string;
  reason: string;
  originalConfig: Record<string, unknown> | null;
  adjustedConfig: Record<string, unknown> | null;
  estimatedCostUsd: number | null;
  actualCostUsd: number | null;
  costSavingsPercent: number | null;
  qualityImpactPercent: number | null;
  createdAt: string;
}

export interface SavingsAnalysis {
  totalSavedUsd: number;
  qualityPreservedPercent: number;
  downgradeCount: number;
}

export interface BudgetRecommendation {
  type: string;
  title: string;
  description: string;
  potentialSavings?: number;
  action?: string;
}

export interface BudgetReport {
  summary: BudgetSummary;
  costBreakdown: CostBreakdownItem[];
  savings: SavingsAnalysis;
  recommendations: BudgetRecommendation[];
  recentDecisions: BudgetDecision[];
  dailySpending: { date: string; amount: number }[];
}

export interface CostCheckResult {
  allowed: boolean;
  message: string;
  remainingBudget: number;
  estimatedCost: number;
  monthSpent: number;
  monthlyBudget: number;
  percentUsed: number;
  projectedMonthEnd: number;
  enforceMode: EnforcementMode;
  downgrade?: {
    recommended: boolean;
    originalConfig: Record<string, unknown>;
    adjustedConfig: Record<string, unknown>;
    estimatedNewCost: number;
    costSavingsPercent: number;
    qualityImpactPercent: number;
  };
}

class BudgetService {
  /**
   * Get budget settings for a project
   */
  async getBudgetSettings(projectId: string): Promise<BudgetSettings> {
    const { data, error } = await supabase
      .from('projects')
      .select('monthly_budget_usd, max_cost_per_query_usd, preferred_baseline_strategy, budget_enforcement_mode')
      .eq('id', projectId)
      .single();

    if (error) throw new Error(error.message);

    return {
      monthlyBudgetUsd: data.monthly_budget_usd || 50,
      maxCostPerQueryUsd: data.max_cost_per_query_usd || 0.01,
      preferredBaselineStrategy: (data.preferred_baseline_strategy as BaselineStrategy) || 'balanced',
      budgetEnforcementMode: (data.budget_enforcement_mode as EnforcementMode) || 'warn',
    };
  }

  /**
   * Update budget settings for a project
   */
  async updateBudgetSettings(projectId: string, settings: Partial<BudgetSettings>): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (settings.monthlyBudgetUsd !== undefined) updates.monthly_budget_usd = settings.monthlyBudgetUsd;
    if (settings.maxCostPerQueryUsd !== undefined) updates.max_cost_per_query_usd = settings.maxCostPerQueryUsd;
    if (settings.preferredBaselineStrategy !== undefined) updates.preferred_baseline_strategy = settings.preferredBaselineStrategy;
    if (settings.budgetEnforcementMode !== undefined) updates.budget_enforcement_mode = settings.budgetEnforcementMode;

    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId);

    if (error) throw new Error(error.message);
  }

  /**
   * Get current month spending for a project
   */
  async getCurrentSpending(projectId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_project_month_spending', {
      p_project_id: projectId,
    });

    if (error) throw new Error(error.message);
    return data || 0;
  }

  /**
   * Get budget summary (quick overview)
   */
  async getBudgetSummary(projectId: string): Promise<BudgetSummary> {
    const [settings, currentSpending] = await Promise.all([
      this.getBudgetSettings(projectId),
      this.getCurrentSpending(projectId),
    ]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysInMonth = monthEnd.getDate();
    const daysElapsed = Math.max(1, Math.floor((now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = daysInMonth - daysElapsed;

    const remainingBudget = settings.monthlyBudgetUsd - currentSpending;
    const budgetUsedPercent = (currentSpending / settings.monthlyBudgetUsd) * 100;
    const dailyBurnRate = currentSpending / daysElapsed;
    const projectedMonthEnd = dailyBurnRate * daysInMonth;

    let daysUntilExhausted: number | null = null;
    if (dailyBurnRate > 0 && remainingBudget > 0) {
      daysUntilExhausted = Math.floor(remainingBudget / dailyBurnRate);
    }

    let status: BudgetStatus = 'under_budget';
    if (currentSpending > settings.monthlyBudgetUsd) {
      status = 'over_budget';
    } else if (projectedMonthEnd > settings.monthlyBudgetUsd) {
      status = 'at_risk';
    } else if (budgetUsedPercent > 75) {
      status = 'on_track';
    }

    return {
      monthlyBudget: settings.monthlyBudgetUsd,
      currentSpending,
      remainingBudget,
      budgetUsedPercent,
      daysInMonth,
      daysElapsed,
      daysRemaining,
      dailyBurnRate,
      projectedMonthEnd,
      daysUntilExhausted,
      status,
    };
  }

  /**
   * Get full budget report via edge function
   */
  async getBudgetReport(projectId: string): Promise<BudgetReport> {
    const { data, error } = await supabase.functions.invoke('budget-report', {
      body: { projectId },
    });

    if (error) throw new Error(error.message || 'Failed to fetch budget report');
    return data as BudgetReport;
  }

  /**
   * Check budget before running an operation
   */
  async checkBudget(projectId: string, estimatedCost: number, config?: Record<string, unknown>): Promise<CostCheckResult> {
    const { data, error } = await supabase.functions.invoke('check-budget', {
      body: { projectId, estimatedCost, config },
    });

    if (error) throw new Error(error.message || 'Failed to check budget');
    return data as CostCheckResult;
  }

  /**
   * Get budget decisions for a project
   */
  async getBudgetDecisions(projectId: string, limit = 50): Promise<BudgetDecision[]> {
    const { data, error } = await supabase
      .from('budget_decisions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    return (data || []).map((d) => ({
      id: d.id,
      projectId: d.project_id,
      userId: d.user_id,
      decisionType: d.decision_type,
      reason: d.reason,
      originalConfig: d.original_config as Record<string, unknown> | null,
      adjustedConfig: d.adjusted_config as Record<string, unknown> | null,
      estimatedCostUsd: d.estimated_cost_usd,
      actualCostUsd: d.actual_cost_usd,
      costSavingsPercent: d.cost_savings_percent,
      qualityImpactPercent: d.quality_impact_percent,
      createdAt: d.created_at,
    }));
  }

  /**
   * Get cost breakdown by operation type
   */
  async getCostBreakdown(projectId: string): Promise<CostBreakdownItem[]> {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('project_cost_logs')
      .select('operation_type, cost_usd')
      .eq('project_id', projectId)
      .gte('created_at', monthStart.toISOString());

    if (error) throw new Error(error.message);

    // Aggregate by operation type
    const breakdown: Record<string, { total: number; count: number }> = {};
    for (const log of data || []) {
      if (!breakdown[log.operation_type]) {
        breakdown[log.operation_type] = { total: 0, count: 0 };
      }
      breakdown[log.operation_type].total += log.cost_usd;
      breakdown[log.operation_type].count += 1;
    }

    return Object.entries(breakdown).map(([operationType, stats]) => ({
      operationType,
      totalCost: stats.total,
      count: stats.count,
      avgCost: stats.total / stats.count,
    }));
  }

  /**
   * Get daily spending data for charts
   */
  async getDailySpending(projectId: string, days = 30): Promise<{ date: string; amount: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('project_cost_logs')
      .select('cost_usd, created_at')
      .eq('project_id', projectId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    // Aggregate by day
    const dailyTotals: Record<string, number> = {};
    for (const log of data || []) {
      const date = log.created_at.split('T')[0];
      dailyTotals[date] = (dailyTotals[date] || 0) + log.cost_usd;
    }

    return Object.entries(dailyTotals).map(([date, amount]) => ({ date, amount }));
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  }

  /**
   * Get status badge color
   */
  getStatusColor(status: BudgetStatus): string {
    switch (status) {
      case 'under_budget':
        return 'bg-success/10 text-success border-success/20';
      case 'on_track':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'at_risk':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'over_budget':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  }

  /**
   * Get strategy display name
   */
  getStrategyDisplayName(strategy: BaselineStrategy): string {
    const names: Record<BaselineStrategy, string> = {
      quality_only: 'Quality Only',
      cost_aware: 'Cost Aware',
      latency_aware: 'Latency Aware',
      balanced: 'Balanced',
    };
    return names[strategy];
  }

  /**
   * Get enforcement mode display name
   */
  getEnforcementDisplayName(mode: EnforcementMode): string {
    const names: Record<EnforcementMode, string> = {
      warn: 'Warn Only',
      abort: 'Abort Operation',
      auto_downgrade: 'Auto-Downgrade',
    };
    return names[mode];
  }
}

export const budgetService = new BudgetService();
