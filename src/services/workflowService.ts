import { supabase } from '@/integrations/supabase/client';

export type WorkflowTriggerType = 
  | 'document_uploaded'
  | 'document_processed'
  | 'content_detected'
  | 'date_approaching'
  | 'amount_threshold'
  | 'keyword_match'
  | 'ai_classification'
  | 'manual';

export type WorkflowActionType = 
  | 'move_to_folder'
  | 'add_tag'
  | 'assign_user'
  | 'generate_summary'
  | 'create_task'
  | 'send_email'
  | 'send_slack'
  | 'call_webhook'
  | 'update_field';

export type WorkflowStatus = 'active' | 'paused' | 'draft' | 'archived';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'exists' | 'not_exists';
  value: unknown;
}

export interface WorkflowAction {
  type: WorkflowActionType;
  config: Record<string, unknown>;
}

export interface WorkflowRule {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  description?: string;
  trigger_type: WorkflowTriggerType;
  trigger_config: Record<string, unknown>;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  status: WorkflowStatus;
  priority: number;
  max_executions_per_day: number;
  cooldown_seconds: number;
  last_triggered_at?: string;
  execution_count: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  user_id: string;
  document_id?: string;
  workflow_rule_id?: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string;
  assigned_to?: string;
  tags: string[];
  source_text?: string;
  external_id?: string;
  external_provider?: string;
  metadata: Record<string, unknown>;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_rule_id: string;
  project_id: string;
  user_id: string;
  trigger_event: Record<string, unknown>;
  document_id?: string;
  status: ExecutionStatus;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  actions_executed: Record<string, unknown>[];
  error_message?: string;
  retry_count: number;
  parent_execution_id?: string;
  created_at: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  trigger_type: WorkflowTriggerType;
  trigger_config: Record<string, unknown>;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  icon?: string;
  is_featured: boolean;
  use_count: number;
  created_at: string;
}

// Workflow Rules CRUD
export async function getWorkflowRules(projectId: string): Promise<WorkflowRule[]> {
  const { data, error } = await supabase
    .from('workflow_rules')
    .select('*')
    .eq('project_id', projectId)
    .order('priority', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as WorkflowRule[];
}

export async function createWorkflowRule(
  projectId: string,
  rule: Omit<WorkflowRule, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'execution_count' | 'last_triggered_at'>
): Promise<WorkflowRule> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('workflow_rules')
    .insert({
      project_id: projectId,
      user_id: user.id,
      name: rule.name,
      description: rule.description,
      trigger_type: rule.trigger_type,
      trigger_config: rule.trigger_config as unknown as Record<string, unknown>,
      conditions: rule.conditions as unknown as Record<string, unknown>[],
      actions: rule.actions as unknown as Record<string, unknown>[],
      status: rule.status,
      priority: rule.priority,
      max_executions_per_day: rule.max_executions_per_day,
      cooldown_seconds: rule.cooldown_seconds,
      is_system: rule.is_system,
    } as never)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as WorkflowRule;
}

export async function updateWorkflowRule(
  ruleId: string,
  updates: Partial<WorkflowRule>
): Promise<WorkflowRule> {
  const { data, error } = await supabase
    .from('workflow_rules')
    .update(updates as never)
    .eq('id', ruleId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as WorkflowRule;
}

export async function deleteWorkflowRule(ruleId: string): Promise<void> {
  const { error } = await supabase
    .from('workflow_rules')
    .delete()
    .eq('id', ruleId);

  if (error) throw error;
}

export async function toggleWorkflowStatus(ruleId: string, status: WorkflowStatus): Promise<WorkflowRule> {
  return updateWorkflowRule(ruleId, { status });
}

// Project Tasks CRUD
export async function getProjectTasks(projectId: string, filters?: {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
}): Promise<ProjectTask[]> {
  let query = supabase
    .from('project_tasks')
    .select('*')
    .eq('project_id', projectId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ProjectTask[];
}

export async function createTask(
  projectId: string,
  task: Omit<ProjectTask, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<ProjectTask> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('project_tasks')
    .insert({
      project_id: projectId,
      user_id: user.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      due_date: task.due_date,
      tags: task.tags,
      metadata: task.metadata as never,
    } as never)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as ProjectTask;
}

export async function updateTask(
  taskId: string,
  updates: Partial<ProjectTask>
): Promise<ProjectTask> {
  const { data, error } = await supabase
    .from('project_tasks')
    .update({
      ...updates,
      metadata: updates.metadata as never,
      completed_at: updates.status === 'completed' ? new Date().toISOString() : updates.completed_at,
    } as never)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as ProjectTask;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('project_tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw error;
}

// Workflow Executions
export async function getWorkflowExecutions(
  projectId: string,
  options?: { workflowId?: string; limit?: number }
): Promise<WorkflowExecution[]> {
  let query = supabase
    .from('workflow_executions')
    .select('*')
    .eq('project_id', projectId);

  if (options?.workflowId) {
    query = query.eq('workflow_rule_id', options.workflowId);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(options?.limit || 50);

  if (error) throw error;
  return (data || []) as WorkflowExecution[];
}

// Workflow Templates
export async function getWorkflowTemplates(category?: string): Promise<WorkflowTemplate[]> {
  let query = supabase.from('workflow_templates').select('*');
  if (category) query = query.eq('category', category);
  const { data, error } = await query.order('is_featured', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as WorkflowTemplate[];
}

// Placeholder to maintain structure
function _getTemplates(data: unknown[]): WorkflowTemplate[] {
  return (data || []).map(row => {
    const r = row as Record<string, unknown>;
    return {
      ...r,
      conditions: Array.isArray(r.conditions) ? r.conditions : [],
      actions: Array.isArray(r.actions) ? r.actions : [],
      trigger_config: (r.trigger_config || {}) as Record<string, unknown>,
    } as WorkflowTemplate;
  });
}

export async function createWorkflowFromTemplate(
  projectId: string,
  templateId: string,
  name: string
): Promise<WorkflowRule> {
  const { data: template, error: templateError } = await supabase
    .from('workflow_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError) throw templateError;

  // Increment template use count
  await supabase
    .from('workflow_templates')
    .update({ use_count: (template.use_count || 0) + 1 })
    .eq('id', templateId);

  return createWorkflowRule(projectId, {
    project_id: projectId,
    name,
    description: template.description,
    trigger_type: template.trigger_type as WorkflowTriggerType,
    trigger_config: (template.trigger_config || {}) as unknown as Record<string, unknown>,
    conditions: (template.conditions || []) as unknown as WorkflowCondition[],
    actions: (template.actions || []) as unknown as WorkflowAction[],
    status: 'draft',
    priority: 0,
    max_executions_per_day: 100,
    cooldown_seconds: 60,
    is_system: false,
  });
}

// Trigger workflow manually
export async function triggerWorkflow(
  workflowId: string,
  eventData: Record<string, unknown>
): Promise<{ success: boolean; executionId?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('execute-workflow', {
    body: { workflowId, eventData, manual: true },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, executionId: data?.executionId };
}

// Test workflow (dry run)
export async function testWorkflow(
  workflow: Partial<WorkflowRule>,
  testData: Record<string, unknown>
): Promise<{ 
  wouldTrigger: boolean; 
  matchedConditions: string[]; 
  actionsToExecute: WorkflowAction[];
  errors: string[];
}> {
  const errors: string[] = [];
  const matchedConditions: string[] = [];
  
  // Evaluate conditions
  const conditions = workflow.conditions || [];
  let allConditionsMet = true;

  for (const condition of conditions) {
    const value = testData[condition.field];
    let met = false;

    switch (condition.operator) {
      case 'equals':
        met = value === condition.value;
        break;
      case 'not_equals':
        met = value !== condition.value;
        break;
      case 'contains':
        met = String(value).includes(String(condition.value));
        break;
      case 'greater_than':
        met = Number(value) > Number(condition.value);
        break;
      case 'less_than':
        met = Number(value) < Number(condition.value);
        break;
      case 'exists':
        met = value !== undefined && value !== null;
        break;
      case 'not_exists':
        met = value === undefined || value === null;
        break;
      default:
        errors.push(`Unknown operator: ${condition.operator}`);
    }

    if (met) {
      matchedConditions.push(`${condition.field} ${condition.operator} ${condition.value}`);
    } else {
      allConditionsMet = false;
    }
  }

  return {
    wouldTrigger: conditions.length === 0 || allConditionsMet,
    matchedConditions,
    actionsToExecute: allConditionsMet ? (workflow.actions || []) : [],
    errors,
  };
}

// Get workflow statistics
export async function getWorkflowStats(projectId: string): Promise<{
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalTasks: number;
  pendingTasks: number;
}> {
  const [workflows, executions, tasks] = await Promise.all([
    supabase.from('workflow_rules').select('id, status').eq('project_id', projectId),
    supabase.from('workflow_executions').select('id, status').eq('project_id', projectId),
    supabase.from('project_tasks').select('id, status').eq('project_id', projectId),
  ]);

  const workflowData = workflows.data || [];
  const executionData = executions.data || [];
  const taskData = tasks.data || [];

  return {
    totalWorkflows: workflowData.length,
    activeWorkflows: workflowData.filter(w => w.status === 'active').length,
    totalExecutions: executionData.length,
    successfulExecutions: executionData.filter(e => e.status === 'completed').length,
    failedExecutions: executionData.filter(e => e.status === 'failed').length,
    totalTasks: taskData.length,
    pendingTasks: taskData.filter(t => t.status === 'pending').length,
  };
}
