// ============= Cost Tracking Service =============
// Tracks costs per document, per stage, and per project
// Provides cost-per-document metrics and daily/monthly aggregates

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { STAGE_CONFIGS, StageType, SYSTEM_LIMITS } from './scaling-config.ts';

// ============= Types =============

export interface CostRecord {
  id?: string;
  projectId: string;
  documentId?: string;
  stage: StageType;
  costUsd: number;
  tokensUsed?: number;
  durationMs?: number;
  inputSizeBytes?: number;
  createdAt?: string;
}

export interface DailyCostSummary {
  date: string;
  totalCostUsd: number;
  byStage: Record<StageType, number>;
  documentsProcessed: number;
  avgCostPerDocument: number;
  isWithinBudget: boolean;
  budgetUtilization: number; // 0-100%
}

export interface CostProjection {
  currentDailyCost: number;
  projectedMonthlyCost: number;
  costPerDocument: number;
  mostExpensiveStage: StageType;
  costBreakdown: Record<StageType, { cost: number; percent: number }>;
  warnings: string[];
  recommendations: string[];
}

export interface CostAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  type: 'daily_limit' | 'stage_limit' | 'cost_spike' | 'inefficiency';
  message: string;
  currentValue: number;
  threshold: number;
  timestamp: string;
}

// ============= Cost Service Class =============

export class CostService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  // ============= Record Costs =============

  async recordStageCost(record: CostRecord): Promise<void> {
    const { error } = await this.supabase
      .from('project_cost_logs')
      .insert({
        project_id: record.projectId,
        document_id: record.documentId,
        operation_type: record.stage,
        cost_usd: record.costUsd,
        tokens_used: record.tokensUsed,
        duration_ms: record.durationMs,
        input_size_bytes: record.inputSizeBytes,
      });

    if (error) {
      console.error(`[cost-service] Failed to record cost: ${error.message}`);
    }
  }

  async recordBatchCosts(records: CostRecord[]): Promise<void> {
    const inserts = records.map(r => ({
      project_id: r.projectId,
      document_id: r.documentId,
      operation_type: r.stage,
      cost_usd: r.costUsd,
      tokens_used: r.tokensUsed,
      duration_ms: r.durationMs,
      input_size_bytes: r.inputSizeBytes,
    }));

    const { error } = await this.supabase
      .from('project_cost_logs')
      .insert(inserts);

    if (error) {
      console.error(`[cost-service] Failed to batch record costs: ${error.message}`);
    }
  }

  // ============= Query Costs =============

  async getDailyCostSummary(projectId?: string, date?: string): Promise<DailyCostSummary> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const startOfDay = `${targetDate}T00:00:00Z`;
    const endOfDay = `${targetDate}T23:59:59Z`;

    let query = this.supabase
      .from('project_cost_logs')
      .select('operation_type, cost_usd, document_id')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error || !data) {
      return {
        date: targetDate,
        totalCostUsd: 0,
        byStage: {} as Record<StageType, number>,
        documentsProcessed: 0,
        avgCostPerDocument: 0,
        isWithinBudget: true,
        budgetUtilization: 0,
      };
    }

    // Aggregate costs
    const byStage: Record<string, number> = {};
    const documents = new Set<string>();
    let totalCost = 0;

    for (const row of data) {
      const stage = row.operation_type as StageType;
      byStage[stage] = (byStage[stage] || 0) + (row.cost_usd || 0);
      totalCost += row.cost_usd || 0;
      if (row.document_id) documents.add(row.document_id);
    }

    const documentsProcessed = documents.size;
    const avgCostPerDocument = documentsProcessed > 0 ? totalCost / documentsProcessed : 0;
    const budgetUtilization = (totalCost / SYSTEM_LIMITS.maxDailyCostUsd) * 100;

    return {
      date: targetDate,
      totalCostUsd: totalCost,
      byStage: byStage as Record<StageType, number>,
      documentsProcessed,
      avgCostPerDocument,
      isWithinBudget: totalCost <= SYSTEM_LIMITS.maxDailyCostUsd,
      budgetUtilization: Math.min(100, budgetUtilization),
    };
  }

  async getStageDailyCost(stage: StageType, date?: string): Promise<number> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const startOfDay = `${targetDate}T00:00:00Z`;
    const endOfDay = `${targetDate}T23:59:59Z`;

    const { data, error } = await this.supabase
      .from('project_cost_logs')
      .select('cost_usd')
      .eq('operation_type', stage)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    if (error || !data) return 0;

    return data.reduce((sum, row) => sum + (row.cost_usd || 0), 0);
  }

  // ============= Cost Projections =============

  async getCostProjection(projectId?: string): Promise<CostProjection> {
    // Get last 7 days of costs
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let query = this.supabase
      .from('project_cost_logs')
      .select('operation_type, cost_usd, document_id, created_at')
      .gte('created_at', sevenDaysAgo);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return {
        currentDailyCost: 0,
        projectedMonthlyCost: 0,
        costPerDocument: 0,
        mostExpensiveStage: 'summarization' as StageType,
        costBreakdown: {} as Record<StageType, { cost: number; percent: number }>,
        warnings: [],
        recommendations: ['No cost data available yet'],
      };
    }

    // Calculate averages
    const byStage: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    const documents = new Set<string>();
    let totalCost = 0;

    for (const row of data) {
      const stage = row.operation_type as StageType;
      const day = row.created_at.split('T')[0];
      
      byStage[stage] = (byStage[stage] || 0) + (row.cost_usd || 0);
      byDay[day] = (byDay[day] || 0) + (row.cost_usd || 0);
      totalCost += row.cost_usd || 0;
      if (row.document_id) documents.add(row.document_id);
    }

    const daysWithData = Object.keys(byDay).length;
    const avgDailyCost = daysWithData > 0 ? totalCost / daysWithData : 0;
    const projectedMonthlyCost = avgDailyCost * 30;
    const costPerDocument = documents.size > 0 ? totalCost / documents.size : 0;

    // Find most expensive stage
    let mostExpensiveStage: StageType = 'summarization';
    let maxStageCost = 0;
    for (const [stage, cost] of Object.entries(byStage)) {
      if (cost > maxStageCost) {
        maxStageCost = cost;
        mostExpensiveStage = stage as StageType;
      }
    }

    // Build breakdown with percentages
    const costBreakdown = {} as Record<StageType, { cost: number; percent: number }>;
    for (const stage of Object.keys(STAGE_CONFIGS) as StageType[]) {
      const cost = byStage[stage] || 0;
      costBreakdown[stage] = {
        cost,
        percent: totalCost > 0 ? (cost / totalCost) * 100 : 0,
      };
    }

    // Generate warnings and recommendations
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (projectedMonthlyCost > SYSTEM_LIMITS.maxDailyCostUsd * 20) {
      warnings.push(`Projected monthly cost ($${projectedMonthlyCost.toFixed(2)}) may exceed budget`);
    }

    if (costBreakdown.summarization?.percent > 60) {
      warnings.push('Summarization accounts for >60% of costs');
      recommendations.push('Consider batching summarization requests or using cheaper models for simple documents');
    }

    if (costPerDocument > 0.10) {
      warnings.push(`High cost per document: $${costPerDocument.toFixed(3)}`);
      recommendations.push('Review caching strategy to reduce redundant operations');
    }

    if (costBreakdown.indexing?.percent > 30) {
      recommendations.push('Consider reducing embedding dimensions or using cheaper embedding models');
    }

    return {
      currentDailyCost: avgDailyCost,
      projectedMonthlyCost,
      costPerDocument,
      mostExpensiveStage,
      costBreakdown,
      warnings,
      recommendations,
    };
  }

  // ============= Cost Alerts =============

  async checkCostAlerts(projectId?: string): Promise<CostAlert[]> {
    const alerts: CostAlert[] = [];
    const timestamp = new Date().toISOString();

    // Check daily cost
    const dailySummary = await this.getDailyCostSummary(projectId);
    
    if (dailySummary.budgetUtilization > 90) {
      alerts.push({
        id: 'daily-budget-critical',
        severity: 'critical',
        type: 'daily_limit',
        message: `Daily cost at ${dailySummary.budgetUtilization.toFixed(1)}% of limit`,
        currentValue: dailySummary.totalCostUsd,
        threshold: SYSTEM_LIMITS.maxDailyCostUsd,
        timestamp,
      });
    } else if (dailySummary.budgetUtilization > 70) {
      alerts.push({
        id: 'daily-budget-warning',
        severity: 'warning',
        type: 'daily_limit',
        message: `Daily cost at ${dailySummary.budgetUtilization.toFixed(1)}% of limit`,
        currentValue: dailySummary.totalCostUsd,
        threshold: SYSTEM_LIMITS.maxDailyCostUsd,
        timestamp,
      });
    }

    // Check per-stage limits
    for (const [stage, config] of Object.entries(STAGE_CONFIGS)) {
      const stageCost = await this.getStageDailyCost(stage as StageType);
      const utilization = (stageCost / config.dailyCostLimit) * 100;

      if (utilization > 90) {
        alerts.push({
          id: `stage-${stage}-critical`,
          severity: 'critical',
          type: 'stage_limit',
          message: `${stage} stage at ${utilization.toFixed(1)}% of daily limit`,
          currentValue: stageCost,
          threshold: config.dailyCostLimit,
          timestamp,
        });
      } else if (utilization > 70) {
        alerts.push({
          id: `stage-${stage}-warning`,
          severity: 'warning',
          type: 'stage_limit',
          message: `${stage} stage at ${utilization.toFixed(1)}% of daily limit`,
          currentValue: stageCost,
          threshold: config.dailyCostLimit,
          timestamp,
        });
      }
    }

    // Check for cost spikes (compare to yesterday)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const yesterdaySummary = await this.getDailyCostSummary(projectId, yesterday);
    
    if (yesterdaySummary.totalCostUsd > 0) {
      const spikeRatio = dailySummary.totalCostUsd / yesterdaySummary.totalCostUsd;
      if (spikeRatio > 2) {
        alerts.push({
          id: 'cost-spike',
          severity: spikeRatio > 3 ? 'critical' : 'warning',
          type: 'cost_spike',
          message: `Today's cost is ${spikeRatio.toFixed(1)}x yesterday's cost`,
          currentValue: dailySummary.totalCostUsd,
          threshold: yesterdaySummary.totalCostUsd,
          timestamp,
        });
      }
    }

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  // ============= Budget Checks =============

  async canProcessDocument(
    projectId: string,
    estimatedCostUsd: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    const dailySummary = await this.getDailyCostSummary(projectId);
    
    // Check daily limit
    if (dailySummary.totalCostUsd + estimatedCostUsd > SYSTEM_LIMITS.maxDailyCostUsd) {
      return {
        allowed: false,
        reason: `Daily cost limit would be exceeded (${dailySummary.totalCostUsd.toFixed(2)} + ${estimatedCostUsd.toFixed(2)} > ${SYSTEM_LIMITS.maxDailyCostUsd})`,
      };
    }

    // Check documents per day limit
    if (dailySummary.documentsProcessed >= SYSTEM_LIMITS.maxDailyDocuments) {
      return {
        allowed: false,
        reason: `Daily document limit reached (${dailySummary.documentsProcessed} >= ${SYSTEM_LIMITS.maxDailyDocuments})`,
      };
    }

    return { allowed: true };
  }
}

// ============= Factory Function =============

export function createCostService(supabase: SupabaseClient): CostService {
  return new CostService(supabase);
}
