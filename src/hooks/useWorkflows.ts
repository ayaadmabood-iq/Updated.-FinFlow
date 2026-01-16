import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWorkflowRules,
  createWorkflowRule,
  updateWorkflowRule,
  deleteWorkflowRule,
  toggleWorkflowStatus,
  getProjectTasks,
  createTask,
  updateTask,
  deleteTask,
  getWorkflowExecutions,
  getWorkflowTemplates,
  createWorkflowFromTemplate,
  triggerWorkflow,
  testWorkflow,
  getWorkflowStats,
  WorkflowRule,
  ProjectTask,
  WorkflowStatus,
  TaskStatus,
  TaskPriority,
  WorkflowAction,
} from '@/services/workflowService';
import { toast } from 'sonner';

// Workflow Rules Hooks
export function useWorkflowRules(projectId: string) {
  return useQuery({
    queryKey: ['workflow-rules', projectId],
    queryFn: () => getWorkflowRules(projectId),
    enabled: !!projectId,
  });
}

export function useCreateWorkflowRule(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rule: Omit<WorkflowRule, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'execution_count' | 'last_triggered_at'>) =>
      createWorkflowRule(projectId, rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-rules', projectId] });
      toast.success('Workflow created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create workflow: ${error.message}`);
    },
  });
}

export function useUpdateWorkflowRule(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, updates }: { ruleId: string; updates: Partial<WorkflowRule> }) =>
      updateWorkflowRule(ruleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-rules', projectId] });
      toast.success('Workflow updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update workflow: ${error.message}`);
    },
  });
}

export function useDeleteWorkflowRule(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleId: string) => deleteWorkflowRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-rules', projectId] });
      toast.success('Workflow deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete workflow: ${error.message}`);
    },
  });
}

export function useToggleWorkflowStatus(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, status }: { ruleId: string; status: WorkflowStatus }) =>
      toggleWorkflowStatus(ruleId, status),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-rules', projectId] });
      toast.success(`Workflow ${status === 'active' ? 'activated' : 'paused'}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update workflow status: ${error.message}`);
    },
  });
}

// Project Tasks Hooks
export function useProjectTasks(projectId: string, filters?: {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
}) {
  return useQuery({
    queryKey: ['project-tasks', projectId, filters],
    queryFn: () => getProjectTasks(projectId, filters),
    enabled: !!projectId,
  });
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: Omit<ProjectTask, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
      createTask(projectId, task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      toast.success('Task created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<ProjectTask> }) =>
      updateTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      toast.success('Task deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete task: ${error.message}`);
    },
  });
}

// Workflow Executions Hook
export function useWorkflowExecutions(projectId: string, options?: { workflowId?: string; limit?: number }) {
  return useQuery({
    queryKey: ['workflow-executions', projectId, options],
    queryFn: () => getWorkflowExecutions(projectId, options),
    enabled: !!projectId,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

// Workflow Templates Hook
export function useWorkflowTemplates(category?: string) {
  return useQuery({
    queryKey: ['workflow-templates', category],
    queryFn: () => getWorkflowTemplates(category),
  });
}

export function useCreateFromTemplate(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, name }: { templateId: string; name: string }) =>
      createWorkflowFromTemplate(projectId, templateId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-rules', projectId] });
      toast.success('Workflow created from template');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create from template: ${error.message}`);
    },
  });
}

// Trigger Workflow Hook
export function useTriggerWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workflowId, eventData }: { workflowId: string; eventData: Record<string, unknown> }) =>
      triggerWorkflow(workflowId, eventData),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['workflow-executions'] });
        toast.success('Workflow triggered successfully');
      } else {
        toast.error(`Workflow failed: ${result.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to trigger workflow: ${error.message}`);
    },
  });
}

// Test Workflow Hook
export function useTestWorkflow() {
  return useMutation({
    mutationFn: ({ workflow, testData }: { 
      workflow: Partial<WorkflowRule>; 
      testData: Record<string, unknown>;
    }) => testWorkflow(workflow, testData),
  });
}

// Workflow Stats Hook
export function useWorkflowStats(projectId: string) {
  return useQuery({
    queryKey: ['workflow-stats', projectId],
    queryFn: () => getWorkflowStats(projectId),
    enabled: !!projectId,
    refetchInterval: 30000,
  });
}
