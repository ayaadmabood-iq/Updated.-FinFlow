// ============= AI Governance Hooks v1.0 =============
// React hooks for AI governance, change management, and regression detection

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  deployedAt?: string;
}

export interface EvaluationGate {
  id: string;
  changeRequestId: string;
  passed: boolean;
  failureReasons: string[];
  precisionDelta: number;
  recallDelta: number;
  ndcgDelta: number;
  latencyDeltaMs: number;
  costDeltaUsd: number;
  evaluatedAt: string;
}

export interface QualityBaseline {
  id: string;
  projectId: string;
  baselineType: string;
  metrics: {
    precision: number;
    recall: number;
    ndcg: number;
    avgLatencyMs: number;
    avgCostUsd: number;
    sampleSize: number;
  };
  isCurrent: boolean;
  establishedAt: string;
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
  isAcknowledged: boolean;
  isResolved: boolean;
  detectedAt: string;
}

export interface ModelRegistryEntry {
  id: string;
  projectId?: string;
  modelType: string;
  modelName: string;
  modelVersion: string;
  isActive: boolean;
  isBaseline: boolean;
  deploymentPercentage: number;
  createdAt: string;
}

export interface GovernanceAuditEntry {
  id: string;
  projectId?: string;
  actorId: string;
  action: string;
  actionCategory: string;
  resourceType: string;
  resourceId?: string;
  createdAt: string;
}

// ============= Change Request Hooks =============

export function useChangeRequests(projectId: string, status?: ChangeStatus) {
  return useQuery({
    queryKey: ['changeRequests', projectId, status],
    queryFn: async (): Promise<ChangeRequest[]> => {
      let query = supabase
        .from('ai_change_requests')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        projectId: row.project_id as string,
        changeType: row.change_type as ChangeType,
        proposedBy: row.proposed_by as string,
        title: row.title as string,
        description: row.description as string | undefined,
        currentConfig: (row.current_config || {}) as Record<string, unknown>,
        proposedConfig: (row.proposed_config || {}) as Record<string, unknown>,
        status: row.status as ChangeStatus,
        requiresApproval: row.requires_approval as boolean,
        isBreakingChange: row.is_breaking_change as boolean,
        createdAt: row.created_at as string,
        evaluatedAt: row.evaluated_at as string | undefined,
        approvedAt: row.approved_at as string | undefined,
        deployedAt: row.deployed_at as string | undefined,
      }));
    },
    enabled: !!projectId,
  });
}

export function useCreateChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      projectId: string;
      changeType: ChangeType;
      title: string;
      description?: string;
      currentConfig: Record<string, unknown>;
      proposedConfig: Record<string, unknown>;
      isBreakingChange?: boolean;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) throw new Error('User not authenticated');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('ai_change_requests')
        .insert({
          project_id: input.projectId,
          change_type: input.changeType,
          proposed_by: userId,
          title: input.title,
          description: input.description,
          current_config: input.currentConfig,
          proposed_config: input.proposedConfig,
          is_breaking_change: input.isBreakingChange || false,
          requires_approval: input.isBreakingChange || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['changeRequests', variables.projectId] });
      toast.success('Change request created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create change request: ${error.message}`);
    },
  });
}

export function useDeployChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { changeRequestId: string; projectId: string }) => {
      // Check if deployment is allowed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: canDeploy, error: checkError } = await (supabase as any)
        .rpc('can_deploy_ai_change', { p_change_request_id: input.changeRequestId });

      if (checkError) throw checkError;
      const result = canDeploy as { can_deploy?: boolean; reason?: string } | null;
      if (!result?.can_deploy) {
        throw new Error(result?.reason || 'Deployment not allowed');
      }

      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      const { error } = await supabase
        .from('ai_change_requests')
        .update({
          status: 'deployed',
          deployed_at: new Date().toISOString(),
          approved_by: userId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', input.changeRequestId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['changeRequests', variables.projectId] });
      toast.success('Change deployed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Deployment failed: ${error.message}`);
    },
  });
}

export function useRollbackChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { changeRequestId: string; projectId: string; reason: string }) => {
      const { error } = await supabase
        .from('ai_change_requests')
        .update({
          status: 'rolled_back',
          rolled_back_at: new Date().toISOString(),
          rollback_reason: input.reason,
        })
        .eq('id', input.changeRequestId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['changeRequests', variables.projectId] });
      toast.success('Change rolled back');
    },
    onError: (error: Error) => {
      toast.error(`Rollback failed: ${error.message}`);
    },
  });
}

// ============= Quality Baseline Hooks =============

export function useQualityBaselines(projectId: string) {
  return useQuery({
    queryKey: ['qualityBaselines', projectId],
    queryFn: async (): Promise<QualityBaseline[]> => {
      const { data, error } = await supabase
        .from('ai_quality_baselines')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_current', true);

      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        projectId: row.project_id as string,
        baselineType: row.baseline_type as string,
        metrics: (row.metrics || {}) as QualityBaseline['metrics'],
        isCurrent: row.is_current as boolean,
        establishedAt: row.established_at as string,
      }));
    },
    enabled: !!projectId,
  });
}

export function useEstablishBaseline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      projectId: string;
      baselineType: string;
      metrics: QualityBaseline['metrics'];
      modelConfig: Record<string, unknown>;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) throw new Error('User not authenticated');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('ai_quality_baselines')
        .insert({
          project_id: input.projectId,
          baseline_type: input.baselineType,
          metrics: input.metrics,
          sample_size: input.metrics.sampleSize,
          model_config: input.modelConfig,
          is_current: true,
          established_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['qualityBaselines', variables.projectId] });
      toast.success('Baseline established');
    },
    onError: (error: Error) => {
      toast.error(`Failed to establish baseline: ${error.message}`);
    },
  });
}

// ============= Regression Alert Hooks =============

export function useRegressionAlerts(projectId: string, unresolvedOnly = true) {
  return useQuery({
    queryKey: ['regressionAlerts', projectId, unresolvedOnly],
    queryFn: async (): Promise<RegressionAlert[]> => {
      let query = supabase
        .from('ai_regression_alerts')
        .select('*')
        .eq('project_id', projectId)
        .order('detected_at', { ascending: false });

      if (unresolvedOnly) {
        query = query.eq('is_resolved', false);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        projectId: row.project_id as string,
        alertType: row.alert_type as AlertType,
        severity: row.severity as AlertSeverity,
        metricName: row.metric_name as string,
        baselineValue: row.baseline_value as number,
        currentValue: row.current_value as number,
        deltaPercent: row.delta_percent as number,
        isAcknowledged: row.is_acknowledged as boolean,
        isResolved: row.is_resolved as boolean,
        detectedAt: row.detected_at as string,
      }));
    },
    enabled: !!projectId,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { alertId: string; projectId: string }) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      const { error } = await supabase
        .from('ai_regression_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: userId,
        })
        .eq('id', input.alertId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['regressionAlerts', variables.projectId] });
      toast.success('Alert acknowledged');
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { alertId: string; projectId: string; resolutionNotes: string }) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      const { error } = await supabase
        .from('ai_regression_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: userId,
          resolution_notes: input.resolutionNotes,
        })
        .eq('id', input.alertId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['regressionAlerts', variables.projectId] });
      toast.success('Alert resolved');
    },
  });
}

// ============= Model Registry Hooks =============

export function useModelRegistry(projectId: string, modelType?: string) {
  return useQuery({
    queryKey: ['modelRegistry', projectId, modelType],
    queryFn: async (): Promise<ModelRegistryEntry[]> => {
      let query = supabase
        .from('ai_model_registry')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (modelType) {
        query = query.eq('model_type', modelType);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        projectId: row.project_id as string | undefined,
        modelType: row.model_type as string,
        modelName: row.model_name as string,
        modelVersion: row.model_version as string,
        isActive: row.is_active as boolean,
        isBaseline: row.is_baseline as boolean,
        deploymentPercentage: row.deployment_percentage as number,
        createdAt: row.created_at as string,
      }));
    },
    enabled: !!projectId,
  });
}

export function useRegisterModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      projectId: string;
      modelType: string;
      modelName: string;
      modelVersion: string;
      config: Record<string, unknown>;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) throw new Error('User not authenticated');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('ai_model_registry')
        .insert({
          project_id: input.projectId,
          model_type: input.modelType,
          model_name: input.modelName,
          model_version: input.modelVersion,
          config: input.config,
          is_active: false,
          is_baseline: false,
          deployment_percentage: 0,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['modelRegistry', variables.projectId] });
      toast.success('Model registered');
    },
    onError: (error: Error) => {
      toast.error(`Failed to register model: ${error.message}`);
    },
  });
}

// ============= Governance Audit Hooks =============

export function useGovernanceAudit(projectId: string, limit = 50) {
  return useQuery({
    queryKey: ['governanceAudit', projectId, limit],
    queryFn: async (): Promise<GovernanceAuditEntry[]> => {
      const { data, error } = await supabase
        .from('ai_governance_audit')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        projectId: row.project_id as string | undefined,
        actorId: row.actor_id as string,
        action: row.action as string,
        actionCategory: row.action_category as string,
        resourceType: row.resource_type as string,
        resourceId: row.resource_id as string | undefined,
        createdAt: row.created_at as string,
      }));
    },
    enabled: !!projectId,
  });
}

// ============= Summary Stats Hook =============

export function useGovernanceSummary(projectId: string) {
  return useQuery({
    queryKey: ['governanceSummary', projectId],
    queryFn: async () => {
      const [
        { count: pendingChanges },
        { count: unresolvedAlerts },
        { count: activeModels },
        baselines
      ] = await Promise.all([
        supabase
          .from('ai_change_requests')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('status', 'pending'),
        supabase
          .from('ai_regression_alerts')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('is_resolved', false),
        supabase
          .from('ai_model_registry')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('is_active', true),
        supabase
          .from('ai_quality_baselines')
          .select('baseline_type')
          .eq('project_id', projectId)
          .eq('is_current', true)
      ]);

      return {
        pendingChanges: pendingChanges || 0,
        unresolvedAlerts: unresolvedAlerts || 0,
        activeModels: activeModels || 0,
        baselineTypes: baselines.data?.map(b => b.baseline_type) || [],
        hasBaselines: (baselines.data?.length || 0) > 0
      };
    },
    enabled: !!projectId,
  });
}
