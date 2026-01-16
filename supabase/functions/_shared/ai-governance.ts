// ============= AI Governance Engine v1.0 =============
// Evaluation-driven development, controlled model upgrades, regression detection
// Mental model: If you cannot measure it, version it, or evaluate it, you do not control it.

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============= Types =============

export type ChangeType = 
  | 'chunking_strategy'
  | 'embedding_model'
  | 'retrieval_config'
  | 'prompt_template'
  | 'threshold_adjustment';

export type ChangeStatus = 
  | 'pending'
  | 'evaluating'
  | 'approved'
  | 'rejected'
  | 'deployed'
  | 'rolled_back';

export type AlertType = 
  | 'precision_drop'
  | 'recall_drop'
  | 'latency_spike'
  | 'cost_anomaly'
  | 'quality_drift'
  | 'error_rate_spike';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ChangeRequest {
  id: string;
  projectId: string;
  changeType: ChangeType;
  proposedBy: string;
  title: string;
  description?: string;
  currentConfig: Record<string, unknown>;
  proposedConfig: Record<string, unknown>;
  status: ChangeStatus;
  requiresApproval: boolean;
  isBreakingChange: boolean;
  createdAt: string;
  evaluatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  deployedAt?: string;
  rolledBackAt?: string;
  rollbackReason?: string;
}

export interface EvaluationGate {
  id: string;
  changeRequestId: string;
  baselineMetrics: MetricsSnapshot;
  proposedMetrics: MetricsSnapshot;
  passed: boolean;
  failureReasons: string[];
  precisionDelta: number;
  recallDelta: number;
  ndcgDelta: number;
  latencyDeltaMs: number;
  costDeltaUsd: number;
  thresholdConfig: EvaluationThresholds;
  evaluatedAt: string;
  evaluatedBy?: string;
}

export interface MetricsSnapshot {
  precision: number;
  recall: number;
  ndcg: number;
  avgLatencyMs: number;
  avgCostUsd: number;
  sampleSize: number;
  timestamp: string;
}

export interface EvaluationThresholds {
  minPrecision: number;      // Minimum allowed precision (0 = no regression allowed)
  minRecall: number;         // Minimum allowed recall
  maxLatencyIncreaseMs: number;
  maxCostIncreasePercent: number;
}

export interface QualityBaseline {
  id: string;
  projectId: string;
  baselineType: 'retrieval' | 'chunking' | 'embedding' | 'summarization' | 'overall';
  metrics: MetricsSnapshot;
  sampleSize: number;
  modelConfig: Record<string, unknown>;
  isCurrent: boolean;
  establishedAt: string;
  establishedBy?: string;
}

export interface RegressionAlert {
  id: string;
  projectId: string;
  alertType: AlertType;
  severity: AlertSeverity;
  metricName: string;
  baselineValue: number;
  currentValue: number;
  deltaPercent: number;
  thresholdExceeded?: number;
  isAcknowledged: boolean;
  isResolved: boolean;
  resolvedAt?: string;
  resolutionNotes?: string;
  relatedChangeId?: string;
  detectedAt: string;
}

export interface ModelRegistryEntry {
  id: string;
  projectId?: string;
  modelType: 'embedding' | 'chunking' | 'summarization' | 'generation';
  modelName: string;
  modelVersion: string;
  isActive: boolean;
  isBaseline: boolean;
  config: Record<string, unknown>;
  performanceMetrics: MetricsSnapshot | null;
  deploymentPercentage: number;
  deployedAt?: string;
  deprecatedAt?: string;
  createdAt: string;
}

export interface ABExperiment {
  id: string;
  projectId: string;
  experimentName: string;
  description?: string;
  controlModelId?: string;
  treatmentModelId?: string;
  controlPercentage: number;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  minSampleSize: number;
  currentSampleSize: number;
  controlMetrics: MetricsSnapshot | null;
  treatmentMetrics: MetricsSnapshot | null;
  winner?: 'control' | 'treatment' | 'no_difference';
  statisticalSignificance?: number;
  createdAt: string;
}

// ============= Constants =============

export const DEFAULT_THRESHOLDS: EvaluationThresholds = {
  minPrecision: 0,           // No precision regression allowed
  minRecall: 0,              // No recall regression allowed
  maxLatencyIncreaseMs: 500, // Max 500ms latency increase
  maxCostIncreasePercent: 20 // Max 20% cost increase
};

export const REGRESSION_THRESHOLDS = {
  precision: { warning: -0.05, critical: -0.10 },  // 5% warning, 10% critical
  recall: { warning: -0.05, critical: -0.10 },
  ndcg: { warning: -0.05, critical: -0.10 },
  latency: { warning: 1.5, critical: 2.0 },        // 50% / 100% increase
  cost: { warning: 1.2, critical: 1.5 }            // 20% / 50% increase
};

// ============= Governance Engine =============

export class AIGovernanceEngine {
  private supabase: SupabaseClient;
  private projectId: string;

  constructor(supabase: SupabaseClient, projectId: string) {
    this.supabase = supabase;
    this.projectId = projectId;
  }

  // ============= Change Request Management =============

  async createChangeRequest(input: {
    changeType: ChangeType;
    proposedBy: string;
    title: string;
    description?: string;
    currentConfig: Record<string, unknown>;
    proposedConfig: Record<string, unknown>;
    isBreakingChange?: boolean;
  }): Promise<ChangeRequest> {
    const { data, error } = await this.supabase
      .from('ai_change_requests')
      .insert({
        project_id: this.projectId,
        change_type: input.changeType,
        proposed_by: input.proposedBy,
        title: input.title,
        description: input.description,
        current_config: input.currentConfig,
        proposed_config: input.proposedConfig,
        is_breaking_change: input.isBreakingChange || false,
        requires_approval: input.isBreakingChange || false,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create change request: ${error.message}`);

    await this.logGovernanceAction({
      action: 'create_change_request',
      category: 'change_request',
      resourceType: 'ai_change_request',
      resourceId: data.id,
      afterState: data,
      actorId: input.proposedBy
    });

    return this.mapChangeRequest(data);
  }

  async evaluateChangeRequest(
    changeRequestId: string,
    baselineMetrics: MetricsSnapshot,
    proposedMetrics: MetricsSnapshot,
    thresholds: EvaluationThresholds = DEFAULT_THRESHOLDS,
    evaluatedBy?: string
  ): Promise<EvaluationGate> {
    // Calculate deltas
    const precisionDelta = proposedMetrics.precision - baselineMetrics.precision;
    const recallDelta = proposedMetrics.recall - baselineMetrics.recall;
    const ndcgDelta = proposedMetrics.ndcg - baselineMetrics.ndcg;
    const latencyDeltaMs = proposedMetrics.avgLatencyMs - baselineMetrics.avgLatencyMs;
    const costDeltaUsd = proposedMetrics.avgCostUsd - baselineMetrics.avgCostUsd;

    // Evaluate against thresholds
    const failureReasons: string[] = [];

    if (precisionDelta < thresholds.minPrecision) {
      failureReasons.push(`Precision dropped by ${(Math.abs(precisionDelta) * 100).toFixed(2)}%`);
    }
    if (recallDelta < thresholds.minRecall) {
      failureReasons.push(`Recall dropped by ${(Math.abs(recallDelta) * 100).toFixed(2)}%`);
    }
    if (latencyDeltaMs > thresholds.maxLatencyIncreaseMs) {
      failureReasons.push(`Latency increased by ${latencyDeltaMs}ms (max: ${thresholds.maxLatencyIncreaseMs}ms)`);
    }

    const costIncreasePercent = baselineMetrics.avgCostUsd > 0 
      ? ((costDeltaUsd / baselineMetrics.avgCostUsd) * 100) 
      : 0;
    if (costIncreasePercent > thresholds.maxCostIncreasePercent) {
      failureReasons.push(`Cost increased by ${costIncreasePercent.toFixed(2)}% (max: ${thresholds.maxCostIncreasePercent}%)`);
    }

    const passed = failureReasons.length === 0;

    // Insert evaluation gate
    const { data, error } = await this.supabase
      .from('ai_evaluation_gates')
      .insert({
        change_request_id: changeRequestId,
        baseline_metrics: baselineMetrics,
        proposed_metrics: proposedMetrics,
        passed,
        failure_reasons: failureReasons,
        precision_delta: precisionDelta,
        recall_delta: recallDelta,
        ndcg_delta: ndcgDelta,
        latency_delta_ms: latencyDeltaMs,
        cost_delta_usd: costDeltaUsd,
        threshold_config: thresholds,
        evaluated_by: evaluatedBy
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create evaluation gate: ${error.message}`);

    // Update change request status
    await this.supabase
      .from('ai_change_requests')
      .update({
        status: passed ? 'approved' : 'rejected',
        evaluated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', changeRequestId);

    await this.logGovernanceAction({
      action: passed ? 'evaluation_passed' : 'evaluation_failed',
      category: 'evaluation',
      resourceType: 'ai_evaluation_gate',
      resourceId: data.id,
      afterState: { passed, failureReasons, precisionDelta, recallDelta },
      actorId: evaluatedBy || 'system'
    });

    return this.mapEvaluationGate(data);
  }

  async deployChange(changeRequestId: string, deployedBy: string): Promise<boolean> {
    // Check if deployment is allowed
    const { data: canDeploy, error: checkError } = await this.supabase
      .rpc('can_deploy_ai_change', { p_change_request_id: changeRequestId });

    if (checkError) throw new Error(`Failed to check deployment: ${checkError.message}`);
    if (!canDeploy.can_deploy) {
      throw new Error(`Deployment blocked: ${canDeploy.reason}`);
    }

    // Get change request for audit
    const { data: change } = await this.supabase
      .from('ai_change_requests')
      .select('*')
      .eq('id', changeRequestId)
      .single();

    // Update status
    const { error } = await this.supabase
      .from('ai_change_requests')
      .update({
        status: 'deployed',
        deployed_at: new Date().toISOString(),
        approved_by: deployedBy,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', changeRequestId);

    if (error) throw new Error(`Failed to deploy change: ${error.message}`);

    await this.logGovernanceAction({
      action: 'deploy_change',
      category: 'deployment',
      resourceType: 'ai_change_request',
      resourceId: changeRequestId,
      beforeState: { status: change?.status },
      afterState: { status: 'deployed', deployed_at: new Date().toISOString() },
      actorId: deployedBy
    });

    return true;
  }

  async rollbackChange(
    changeRequestId: string, 
    reason: string, 
    rolledBackBy: string
  ): Promise<boolean> {
    const { data: change } = await this.supabase
      .from('ai_change_requests')
      .select('*')
      .eq('id', changeRequestId)
      .single();

    const { error } = await this.supabase
      .from('ai_change_requests')
      .update({
        status: 'rolled_back',
        rolled_back_at: new Date().toISOString(),
        rollback_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', changeRequestId);

    if (error) throw new Error(`Failed to rollback change: ${error.message}`);

    await this.logGovernanceAction({
      action: 'rollback_change',
      category: 'rollback',
      resourceType: 'ai_change_request',
      resourceId: changeRequestId,
      beforeState: { status: change?.status },
      afterState: { status: 'rolled_back', reason },
      justification: reason,
      actorId: rolledBackBy
    });

    return true;
  }

  // ============= Baseline Management =============

  async establishBaseline(
    baselineType: QualityBaseline['baselineType'],
    metrics: MetricsSnapshot,
    modelConfig: Record<string, unknown>,
    establishedBy: string
  ): Promise<QualityBaseline> {
    const { data, error } = await this.supabase
      .from('ai_quality_baselines')
      .insert({
        project_id: this.projectId,
        baseline_type: baselineType,
        metrics,
        sample_size: metrics.sampleSize,
        model_config: modelConfig,
        is_current: true,
        established_by: establishedBy
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to establish baseline: ${error.message}`);

    await this.logGovernanceAction({
      action: 'establish_baseline',
      category: 'baseline_update',
      resourceType: 'ai_quality_baseline',
      resourceId: data.id,
      afterState: { baselineType, metrics },
      actorId: establishedBy
    });

    return this.mapBaseline(data);
  }

  async getCurrentBaseline(
    baselineType: QualityBaseline['baselineType']
  ): Promise<QualityBaseline | null> {
    const { data, error } = await this.supabase
      .from('ai_quality_baselines')
      .select('*')
      .eq('project_id', this.projectId)
      .eq('baseline_type', baselineType)
      .eq('is_current', true)
      .single();

    if (error || !data) return null;
    return this.mapBaseline(data);
  }

  // ============= Regression Detection =============

  async detectRegressions(
    currentMetrics: MetricsSnapshot,
    baselineType: QualityBaseline['baselineType'] = 'retrieval'
  ): Promise<RegressionAlert[]> {
    const baseline = await this.getCurrentBaseline(baselineType);
    if (!baseline) return [];

    const alerts: RegressionAlert[] = [];
    const now = new Date().toISOString();

    // Check precision
    const precisionDelta = (currentMetrics.precision - baseline.metrics.precision) / baseline.metrics.precision;
    if (precisionDelta <= REGRESSION_THRESHOLDS.precision.critical) {
      alerts.push(await this.createRegressionAlert({
        alertType: 'precision_drop',
        severity: 'critical',
        metricName: 'precision',
        baselineValue: baseline.metrics.precision,
        currentValue: currentMetrics.precision,
        deltaPercent: precisionDelta * 100,
        thresholdExceeded: REGRESSION_THRESHOLDS.precision.critical * 100
      }));
    } else if (precisionDelta <= REGRESSION_THRESHOLDS.precision.warning) {
      alerts.push(await this.createRegressionAlert({
        alertType: 'precision_drop',
        severity: 'medium',
        metricName: 'precision',
        baselineValue: baseline.metrics.precision,
        currentValue: currentMetrics.precision,
        deltaPercent: precisionDelta * 100,
        thresholdExceeded: REGRESSION_THRESHOLDS.precision.warning * 100
      }));
    }

    // Check recall
    const recallDelta = (currentMetrics.recall - baseline.metrics.recall) / baseline.metrics.recall;
    if (recallDelta <= REGRESSION_THRESHOLDS.recall.critical) {
      alerts.push(await this.createRegressionAlert({
        alertType: 'recall_drop',
        severity: 'critical',
        metricName: 'recall',
        baselineValue: baseline.metrics.recall,
        currentValue: currentMetrics.recall,
        deltaPercent: recallDelta * 100,
        thresholdExceeded: REGRESSION_THRESHOLDS.recall.critical * 100
      }));
    } else if (recallDelta <= REGRESSION_THRESHOLDS.recall.warning) {
      alerts.push(await this.createRegressionAlert({
        alertType: 'recall_drop',
        severity: 'medium',
        metricName: 'recall',
        baselineValue: baseline.metrics.recall,
        currentValue: currentMetrics.recall,
        deltaPercent: recallDelta * 100,
        thresholdExceeded: REGRESSION_THRESHOLDS.recall.warning * 100
      }));
    }

    // Check latency
    const latencyRatio = currentMetrics.avgLatencyMs / baseline.metrics.avgLatencyMs;
    if (latencyRatio >= REGRESSION_THRESHOLDS.latency.critical) {
      alerts.push(await this.createRegressionAlert({
        alertType: 'latency_spike',
        severity: 'critical',
        metricName: 'latency_ms',
        baselineValue: baseline.metrics.avgLatencyMs,
        currentValue: currentMetrics.avgLatencyMs,
        deltaPercent: (latencyRatio - 1) * 100,
        thresholdExceeded: (REGRESSION_THRESHOLDS.latency.critical - 1) * 100
      }));
    } else if (latencyRatio >= REGRESSION_THRESHOLDS.latency.warning) {
      alerts.push(await this.createRegressionAlert({
        alertType: 'latency_spike',
        severity: 'medium',
        metricName: 'latency_ms',
        baselineValue: baseline.metrics.avgLatencyMs,
        currentValue: currentMetrics.avgLatencyMs,
        deltaPercent: (latencyRatio - 1) * 100,
        thresholdExceeded: (REGRESSION_THRESHOLDS.latency.warning - 1) * 100
      }));
    }

    // Check cost
    if (baseline.metrics.avgCostUsd > 0) {
      const costRatio = currentMetrics.avgCostUsd / baseline.metrics.avgCostUsd;
      if (costRatio >= REGRESSION_THRESHOLDS.cost.critical) {
        alerts.push(await this.createRegressionAlert({
          alertType: 'cost_anomaly',
          severity: 'high',
          metricName: 'cost_usd',
          baselineValue: baseline.metrics.avgCostUsd,
          currentValue: currentMetrics.avgCostUsd,
          deltaPercent: (costRatio - 1) * 100,
          thresholdExceeded: (REGRESSION_THRESHOLDS.cost.critical - 1) * 100
        }));
      } else if (costRatio >= REGRESSION_THRESHOLDS.cost.warning) {
        alerts.push(await this.createRegressionAlert({
          alertType: 'cost_anomaly',
          severity: 'medium',
          metricName: 'cost_usd',
          baselineValue: baseline.metrics.avgCostUsd,
          currentValue: currentMetrics.avgCostUsd,
          deltaPercent: (costRatio - 1) * 100,
          thresholdExceeded: (REGRESSION_THRESHOLDS.cost.warning - 1) * 100
        }));
      }
    }

    return alerts;
  }

  private async createRegressionAlert(input: {
    alertType: AlertType;
    severity: AlertSeverity;
    metricName: string;
    baselineValue: number;
    currentValue: number;
    deltaPercent: number;
    thresholdExceeded?: number;
  }): Promise<RegressionAlert> {
    const { data, error } = await this.supabase
      .from('ai_regression_alerts')
      .insert({
        project_id: this.projectId,
        alert_type: input.alertType,
        severity: input.severity,
        metric_name: input.metricName,
        baseline_value: input.baselineValue,
        current_value: input.currentValue,
        delta_percent: input.deltaPercent,
        threshold_exceeded: input.thresholdExceeded
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create regression alert: ${error.message}`);

    await this.logGovernanceAction({
      action: 'regression_detected',
      category: 'alert_handling',
      resourceType: 'ai_regression_alert',
      resourceId: data.id,
      afterState: input,
      actorId: 'system'
    });

    return this.mapRegressionAlert(data);
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    await this.supabase
      .from('ai_regression_alerts')
      .update({
        is_acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: acknowledgedBy
      })
      .eq('id', alertId);

    await this.logGovernanceAction({
      action: 'acknowledge_alert',
      category: 'alert_handling',
      resourceType: 'ai_regression_alert',
      resourceId: alertId,
      actorId: acknowledgedBy
    });
  }

  async resolveAlert(
    alertId: string, 
    resolutionNotes: string, 
    resolvedBy: string
  ): Promise<void> {
    await this.supabase
      .from('ai_regression_alerts')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
        resolution_notes: resolutionNotes
      })
      .eq('id', alertId);

    await this.logGovernanceAction({
      action: 'resolve_alert',
      category: 'alert_handling',
      resourceType: 'ai_regression_alert',
      resourceId: alertId,
      afterState: { resolutionNotes },
      actorId: resolvedBy
    });
  }

  // ============= Model Registry =============

  async registerModel(input: {
    modelType: ModelRegistryEntry['modelType'];
    modelName: string;
    modelVersion: string;
    config: Record<string, unknown>;
    createdBy: string;
  }): Promise<ModelRegistryEntry> {
    const { data, error } = await this.supabase
      .from('ai_model_registry')
      .insert({
        project_id: this.projectId,
        model_type: input.modelType,
        model_name: input.modelName,
        model_version: input.modelVersion,
        config: input.config,
        is_active: false,
        is_baseline: false,
        deployment_percentage: 0,
        created_by: input.createdBy
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to register model: ${error.message}`);

    await this.logGovernanceAction({
      action: 'register_model',
      category: 'model_registration',
      resourceType: 'ai_model_registry',
      resourceId: data.id,
      afterState: input,
      actorId: input.createdBy
    });

    return this.mapModelEntry(data);
  }

  async setModelDeploymentPercentage(
    modelId: string, 
    percentage: number, 
    updatedBy: string
  ): Promise<void> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Deployment percentage must be between 0 and 100');
    }

    const { data: before } = await this.supabase
      .from('ai_model_registry')
      .select('*')
      .eq('id', modelId)
      .single();

    await this.supabase
      .from('ai_model_registry')
      .update({
        deployment_percentage: percentage,
        is_active: percentage > 0,
        deployed_at: percentage > 0 ? new Date().toISOString() : null
      })
      .eq('id', modelId);

    await this.logGovernanceAction({
      action: 'update_deployment_percentage',
      category: 'deployment',
      resourceType: 'ai_model_registry',
      resourceId: modelId,
      beforeState: { percentage: before?.deployment_percentage },
      afterState: { percentage },
      actorId: updatedBy
    });
  }

  // ============= A/B Testing =============

  async createABExperiment(input: {
    experimentName: string;
    description?: string;
    controlModelId: string;
    treatmentModelId: string;
    controlPercentage: number;
    minSampleSize: number;
    createdBy: string;
  }): Promise<ABExperiment> {
    const { data, error } = await this.supabase
      .from('ai_ab_experiments')
      .insert({
        project_id: this.projectId,
        experiment_name: input.experimentName,
        description: input.description,
        control_model_id: input.controlModelId,
        treatment_model_id: input.treatmentModelId,
        control_percentage: input.controlPercentage,
        min_sample_size: input.minSampleSize,
        status: 'draft',
        created_by: input.createdBy
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create A/B experiment: ${error.message}`);

    return this.mapABExperiment(data);
  }

  async startExperiment(experimentId: string): Promise<void> {
    await this.supabase
      .from('ai_ab_experiments')
      .update({
        status: 'running',
        start_date: new Date().toISOString()
      })
      .eq('id', experimentId);
  }

  async recordExperimentSample(
    experimentId: string,
    isControl: boolean,
    metrics: MetricsSnapshot
  ): Promise<void> {
    const { data: experiment } = await this.supabase
      .from('ai_ab_experiments')
      .select('*')
      .eq('id', experimentId)
      .single();

    if (!experiment) return;

    const metricsField = isControl ? 'control_metrics' : 'treatment_metrics';
    const currentMetrics = experiment[metricsField] || { 
      precision: 0, recall: 0, ndcg: 0, avgLatencyMs: 0, avgCostUsd: 0, sampleSize: 0 
    };

    // Running average update
    const newSampleSize = currentMetrics.sampleSize + 1;
    const updatedMetrics = {
      precision: ((currentMetrics.precision * currentMetrics.sampleSize) + metrics.precision) / newSampleSize,
      recall: ((currentMetrics.recall * currentMetrics.sampleSize) + metrics.recall) / newSampleSize,
      ndcg: ((currentMetrics.ndcg * currentMetrics.sampleSize) + metrics.ndcg) / newSampleSize,
      avgLatencyMs: ((currentMetrics.avgLatencyMs * currentMetrics.sampleSize) + metrics.avgLatencyMs) / newSampleSize,
      avgCostUsd: ((currentMetrics.avgCostUsd * currentMetrics.sampleSize) + metrics.avgCostUsd) / newSampleSize,
      sampleSize: newSampleSize,
      timestamp: new Date().toISOString()
    };

    await this.supabase
      .from('ai_ab_experiments')
      .update({
        [metricsField]: updatedMetrics,
        current_sample_size: experiment.current_sample_size + 1
      })
      .eq('id', experimentId);
  }

  // ============= Audit Logging =============

  private async logGovernanceAction(input: {
    action: string;
    category: string;
    resourceType: string;
    resourceId?: string;
    beforeState?: Record<string, unknown>;
    afterState?: Record<string, unknown>;
    justification?: string;
    actorId: string;
  }): Promise<void> {
    try {
      await this.supabase
        .from('ai_governance_audit')
        .insert({
          project_id: this.projectId,
          actor_id: input.actorId,
          action: input.action,
          action_category: input.category,
          resource_type: input.resourceType,
          resource_id: input.resourceId,
          before_state: input.beforeState,
          after_state: input.afterState,
          justification: input.justification
        });
    } catch (e) {
      console.error('Failed to log governance action:', e);
    }
  }

  // ============= Mappers =============

  // deno-lint-ignore no-explicit-any
  private mapChangeRequest(row: any): ChangeRequest {
    return {
      id: row.id,
      projectId: row.project_id,
      changeType: row.change_type,
      proposedBy: row.proposed_by,
      title: row.title,
      description: row.description,
      currentConfig: row.current_config,
      proposedConfig: row.proposed_config,
      status: row.status,
      requiresApproval: row.requires_approval,
      isBreakingChange: row.is_breaking_change,
      createdAt: row.created_at,
      evaluatedAt: row.evaluated_at,
      approvedAt: row.approved_at,
      approvedBy: row.approved_by,
      deployedAt: row.deployed_at,
      rolledBackAt: row.rolled_back_at,
      rollbackReason: row.rollback_reason
    };
  }

  // deno-lint-ignore no-explicit-any
  private mapEvaluationGate(row: any): EvaluationGate {
    return {
      id: row.id,
      changeRequestId: row.change_request_id,
      baselineMetrics: row.baseline_metrics,
      proposedMetrics: row.proposed_metrics,
      passed: row.passed,
      failureReasons: row.failure_reasons || [],
      precisionDelta: row.precision_delta,
      recallDelta: row.recall_delta,
      ndcgDelta: row.ndcg_delta,
      latencyDeltaMs: row.latency_delta_ms,
      costDeltaUsd: row.cost_delta_usd,
      thresholdConfig: row.threshold_config,
      evaluatedAt: row.evaluated_at,
      evaluatedBy: row.evaluated_by
    };
  }

  // deno-lint-ignore no-explicit-any
  private mapBaseline(row: any): QualityBaseline {
    return {
      id: row.id,
      projectId: row.project_id,
      baselineType: row.baseline_type,
      metrics: row.metrics,
      sampleSize: row.sample_size,
      modelConfig: row.model_config,
      isCurrent: row.is_current,
      establishedAt: row.established_at,
      establishedBy: row.established_by
    };
  }

  // deno-lint-ignore no-explicit-any
  private mapRegressionAlert(row: any): RegressionAlert {
    return {
      id: row.id,
      projectId: row.project_id,
      alertType: row.alert_type,
      severity: row.severity,
      metricName: row.metric_name,
      baselineValue: row.baseline_value,
      currentValue: row.current_value,
      deltaPercent: row.delta_percent,
      thresholdExceeded: row.threshold_exceeded,
      isAcknowledged: row.is_acknowledged,
      isResolved: row.is_resolved,
      resolvedAt: row.resolved_at,
      resolutionNotes: row.resolution_notes,
      relatedChangeId: row.related_change_id,
      detectedAt: row.detected_at
    };
  }

  // deno-lint-ignore no-explicit-any
  private mapModelEntry(row: any): ModelRegistryEntry {
    return {
      id: row.id,
      projectId: row.project_id,
      modelType: row.model_type,
      modelName: row.model_name,
      modelVersion: row.model_version,
      isActive: row.is_active,
      isBaseline: row.is_baseline,
      config: row.config,
      performanceMetrics: row.performance_metrics,
      deploymentPercentage: row.deployment_percentage,
      deployedAt: row.deployed_at,
      deprecatedAt: row.deprecated_at,
      createdAt: row.created_at
    };
  }

  // deno-lint-ignore no-explicit-any
  private mapABExperiment(row: any): ABExperiment {
    return {
      id: row.id,
      projectId: row.project_id,
      experimentName: row.experiment_name,
      description: row.description,
      controlModelId: row.control_model_id,
      treatmentModelId: row.treatment_model_id,
      controlPercentage: row.control_percentage,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      minSampleSize: row.min_sample_size,
      currentSampleSize: row.current_sample_size,
      controlMetrics: row.control_metrics,
      treatmentMetrics: row.treatment_metrics,
      winner: row.winner,
      statisticalSignificance: row.statistical_significance,
      createdAt: row.created_at
    };
  }
}

// ============= Security Invariants =============
// These rules must NEVER be broken

export const GOVERNANCE_INVARIANTS = {
  // No AI change without evaluation
  MANDATORY_EVALUATION: 'Every AI configuration change MUST be evaluated against baselines before deployment',
  
  // No silent model changes
  AUDITED_CHANGES: 'Every model registration, deployment, and rollback MUST be logged in governance audit',
  
  // No regression deployment
  BLOCK_REGRESSIONS: 'Changes that degrade precision, recall, or NDCG below thresholds MUST be blocked',
  
  // Rollback capability
  REVERSIBLE_CHANGES: 'Every deployed change MUST be rollback-able without data loss',
  
  // Baseline freshness
  CURRENT_BASELINES: 'Quality baselines MUST be refreshed after every successful deployment'
};

// ============= Documentation =============
// Living documentation of AI architecture

export const AI_ARCHITECTURE_DOC = {
  version: '1.0.0',
  lastUpdated: '2026-01-12',
  
  activeModels: {
    embedding: {
      name: 'text-embedding-3-small',
      version: '2024-01',
      dimensions: 1536,
      provider: 'OpenAI'
    },
    chunking: {
      strategy: 'heuristic_semantic',
      version: 'v6.0',
      minChunkSize: 100,
      maxChunkSize: 1500
    },
    summarization: {
      model: 'gpt-4o-mini',
      maxTokens: 500
    }
  },
  
  evaluationMethodology: {
    metrics: ['Precision@10', 'Recall@10', 'NDCG@10', 'Latency', 'Cost'],
    minimumSampleSize: 50,
    significanceThreshold: 0.05
  },
  
  knownLimitations: [
    'Semantic chunking is heuristic-based, not true embedding-based',
    'NDCG calculation assumes binary relevance (relevant or not)',
    'Cost tracking is estimate-based on token counts',
    'A/B testing requires manual significance calculation'
  ],
  
  governanceRules: GOVERNANCE_INVARIANTS
};
