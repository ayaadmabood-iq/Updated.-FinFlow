// ============= Cost Monitoring Hook =============
// Frontend hooks for cost tracking, projections, and alerts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

// ============= Types =============

export type StageType = 'ingestion' | 'extraction' | 'language' | 'chunking' | 'summarization' | 'indexing';

export interface DailyCostSummary {
  date: string;
  totalCostUsd: number;
  byStage: Record<string, number>;
  documentsProcessed: number;
  avgCostPerDocument: number;
  isWithinBudget: boolean;
  budgetUtilization: number;
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

export interface CostTrend {
  date: string;
  totalCost: number;
  documentsProcessed: number;
  avgCostPerDoc: number;
}

export interface StageScalingConfig {
  stage: StageType;
  resourceProfile: 'cpu-bound' | 'io-bound' | 'api-bound' | 'memory-bound';
  minWorkers: number;
  maxWorkers: number;
  targetConcurrency: number;
  maxQueueDepth: number;
  targetLatencyMs: number;
  dailyCostLimit: number;
}

export interface GrowthScenario {
  name: string;
  multiplier: number;
  expectedCostMultiplier: number;
  requiredChanges: string[];
  bottlenecks: string[];
  acceptable: boolean;
}

// ============= Stage Configurations (mirrored from backend) =============

export const STAGE_CONFIGS: Record<StageType, StageScalingConfig> = {
  ingestion: {
    stage: 'ingestion',
    resourceProfile: 'io-bound',
    minWorkers: 1,
    maxWorkers: 10,
    targetConcurrency: 5,
    maxQueueDepth: 200,
    targetLatencyMs: 2000,
    dailyCostLimit: 10,
  },
  extraction: {
    stage: 'extraction',
    resourceProfile: 'cpu-bound',
    minWorkers: 1,
    maxWorkers: 5,
    targetConcurrency: 3,
    maxQueueDepth: 100,
    targetLatencyMs: 5000,
    dailyCostLimit: 50,
  },
  language: {
    stage: 'language',
    resourceProfile: 'api-bound',
    minWorkers: 1,
    maxWorkers: 20,
    targetConcurrency: 10,
    maxQueueDepth: 500,
    targetLatencyMs: 500,
    dailyCostLimit: 5,
  },
  chunking: {
    stage: 'chunking',
    resourceProfile: 'memory-bound',
    minWorkers: 1,
    maxWorkers: 5,
    targetConcurrency: 3,
    maxQueueDepth: 100,
    targetLatencyMs: 3000,
    dailyCostLimit: 20,
  },
  summarization: {
    stage: 'summarization',
    resourceProfile: 'api-bound',
    minWorkers: 1,
    maxWorkers: 8,
    targetConcurrency: 4,
    maxQueueDepth: 50,
    targetLatencyMs: 10000,
    dailyCostLimit: 100,
  },
  indexing: {
    stage: 'indexing',
    resourceProfile: 'io-bound',
    minWorkers: 1,
    maxWorkers: 10,
    targetConcurrency: 5,
    maxQueueDepth: 200,
    targetLatencyMs: 2000,
    dailyCostLimit: 30,
  },
};

export const SYSTEM_LIMITS = {
  maxDailyCostUsd: 500,
  maxDailyDocuments: 10000,
  maxTotalQueueDepth: 1000,
  maxConcurrentDocuments: 100,
};

export const GROWTH_SCENARIOS: GrowthScenario[] = [
  {
    name: '2x Traffic',
    multiplier: 2,
    expectedCostMultiplier: 2.1,
    requiredChanges: [
      'Increase summarization workers to 8',
      'Add extraction worker capacity',
    ],
    bottlenecks: ['summarization queue depth'],
    acceptable: true,
  },
  {
    name: '5x Traffic',
    multiplier: 5,
    expectedCostMultiplier: 5.5,
    requiredChanges: [
      'Scale all stages to max workers',
      'Consider read replica for DB',
      'Increase Redis memory',
    ],
    bottlenecks: [
      'Database connection pool',
      'Summarization API rate limits',
    ],
    acceptable: true,
  },
  {
    name: '10x Traffic',
    multiplier: 10,
    expectedCostMultiplier: 12,
    requiredChanges: [
      'Database read replica required',
      'Redis cluster mode',
      'Consider dedicated embedding service',
      'Review summarization batching',
    ],
    bottlenecks: [
      'Database write throughput',
      'Embedding generation rate',
      'Cost per document increases',
    ],
    acceptable: true,
  },
];

// ============= Daily Cost Summary Hook =============

export function useDailyCostSummary(projectId?: string) {
  return useQuery({
    queryKey: ['cost-summary', 'daily', projectId],
    queryFn: async (): Promise<DailyCostSummary> => {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00Z`;
      const endOfDay = `${today}T23:59:59Z`;

      let query = supabase
        .from('project_cost_logs')
        .select('operation_type, cost_usd, operation_id')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate
      const byStage: Record<string, number> = {};
      const documents = new Set<string>();
      let totalCost = 0;

      for (const row of data || []) {
        const stage = row.operation_type;
        byStage[stage] = (byStage[stage] || 0) + (row.cost_usd || 0);
        totalCost += row.cost_usd || 0;
        if (row.operation_id) documents.add(row.operation_id);
      }

      const documentsProcessed = documents.size;
      const avgCostPerDocument = documentsProcessed > 0 ? totalCost / documentsProcessed : 0;
      const budgetUtilization = (totalCost / SYSTEM_LIMITS.maxDailyCostUsd) * 100;

      return {
        date: today,
        totalCostUsd: totalCost,
        byStage,
        documentsProcessed,
        avgCostPerDocument,
        isWithinBudget: totalCost <= SYSTEM_LIMITS.maxDailyCostUsd,
        budgetUtilization: Math.min(100, budgetUtilization),
      };
    },
    refetchInterval: 30000,
  });
}

// ============= Cost Projection Hook =============

export function useCostProjection(projectId?: string) {
  return useQuery({
    queryKey: ['cost-projection', projectId],
    queryFn: async (): Promise<CostProjection> => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      let query = supabase
        .from('project_cost_logs')
        .select('operation_type, cost_usd, operation_id, created_at')
        .gte('created_at', sevenDaysAgo);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          currentDailyCost: 0,
          projectedMonthlyCost: 0,
          costPerDocument: 0,
          mostExpensiveStage: 'summarization',
          costBreakdown: Object.fromEntries(
            Object.keys(STAGE_CONFIGS).map(s => [s, { cost: 0, percent: 0 }])
          ) as Record<StageType, { cost: number; percent: number }>,
          warnings: [],
          recommendations: ['No cost data available yet'],
        };
      }

      // Calculate
      const byStage: Record<string, number> = {};
      const byDay: Record<string, number> = {};
      const documents = new Set<string>();
      let totalCost = 0;

      for (const row of data) {
        const stage = row.operation_type;
        const day = row.created_at.split('T')[0];
        
        byStage[stage] = (byStage[stage] || 0) + (row.cost_usd || 0);
        byDay[day] = (byDay[day] || 0) + (row.cost_usd || 0);
        totalCost += row.cost_usd || 0;
        if (row.operation_id) documents.add(row.operation_id);
      }

      const daysWithData = Object.keys(byDay).length;
      const avgDailyCost = daysWithData > 0 ? totalCost / daysWithData : 0;
      const projectedMonthlyCost = avgDailyCost * 30;
      const costPerDocument = documents.size > 0 ? totalCost / documents.size : 0;

      // Find most expensive
      let mostExpensiveStage: StageType = 'summarization';
      let maxStageCost = 0;
      for (const [stage, cost] of Object.entries(byStage)) {
        if (cost > maxStageCost) {
          maxStageCost = cost;
          mostExpensiveStage = stage as StageType;
        }
      }

      // Build breakdown
      const costBreakdown = {} as Record<StageType, { cost: number; percent: number }>;
      for (const stage of Object.keys(STAGE_CONFIGS) as StageType[]) {
        const cost = byStage[stage] || 0;
        costBreakdown[stage] = {
          cost,
          percent: totalCost > 0 ? (cost / totalCost) * 100 : 0,
        };
      }

      // Warnings
      const warnings: string[] = [];
      const recommendations: string[] = [];

      if (projectedMonthlyCost > SYSTEM_LIMITS.maxDailyCostUsd * 20) {
        warnings.push(`Projected monthly cost ($${projectedMonthlyCost.toFixed(2)}) may exceed budget`);
      }

      if (costBreakdown.summarization?.percent > 60) {
        warnings.push('Summarization accounts for >60% of costs');
        recommendations.push('Consider batching summarization or using cheaper models');
      }

      if (costPerDocument > 0.10) {
        warnings.push(`High cost per document: $${costPerDocument.toFixed(3)}`);
        recommendations.push('Review caching strategy');
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
    },
    refetchInterval: 60000,
  });
}

// ============= Cost Trend Hook =============

export function useCostTrend(days: number = 30, projectId?: string) {
  return useQuery({
    queryKey: ['cost-trend', days, projectId],
    queryFn: async (): Promise<CostTrend[]> => {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      let query = supabase
        .from('project_cost_logs')
        .select('cost_usd, operation_id, created_at')
        .gte('created_at', startDate);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by day
      const byDay: Record<string, { cost: number; docs: Set<string> }> = {};

      for (const row of data || []) {
        const day = row.created_at.split('T')[0];
        if (!byDay[day]) {
          byDay[day] = { cost: 0, docs: new Set() };
        }
        byDay[day].cost += row.cost_usd || 0;
        if (row.operation_id) byDay[day].docs.add(row.operation_id);
      }

      return Object.entries(byDay)
        .map(([date, { cost, docs }]) => ({
          date,
          totalCost: cost,
          documentsProcessed: docs.size,
          avgCostPerDoc: docs.size > 0 ? cost / docs.size : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    refetchInterval: 300000, // 5 minutes
  });
}

// ============= Cost Alerts Hook =============

export function useCostAlerts(projectId?: string) {
  const { data: dailySummary } = useDailyCostSummary(projectId);
  const { data: projection } = useCostProjection(projectId);

  return useQuery({
    queryKey: ['cost-alerts', dailySummary, projection],
    queryFn: async (): Promise<CostAlert[]> => {
      const alerts: CostAlert[] = [];
      const timestamp = new Date().toISOString();

      if (!dailySummary) return alerts;

      // Daily budget alerts
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

      // Per-stage alerts
      for (const [stage, config] of Object.entries(STAGE_CONFIGS)) {
        const stageCost = dailySummary.byStage[stage] || 0;
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

      return alerts.sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2 };
        return order[a.severity] - order[b.severity];
      });
    },
    enabled: !!dailySummary,
    refetchInterval: 60000,
  });
}
