import { supabase } from '@/integrations/supabase/client';

export type ResearchTaskStatus = 
  | 'pending' 
  | 'planning' 
  | 'researching' 
  | 'analyzing' 
  | 'verifying' 
  | 'synthesizing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type AgentRole = 'manager' | 'researcher' | 'analyst' | 'critic';

export interface ResearchTask {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  goal: string;
  sourceDocumentIds: string[];
  status: ResearchTaskStatus;
  currentPhase: string | null;
  progressPercent: number;
  sharedWorkspace: Record<string, unknown>;
  finalResult: Record<string, unknown> | null;
  finalReportMarkdown: string | null;
  conflictsFound: Conflict[];
  totalIterations: number;
  maxIterations: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Conflict {
  field: string;
  document1: { id: string; name: string; value: string };
  document2: { id: string; name: string; value: string };
  description: string;
}

export interface AgentActivityLog {
  id: string;
  taskId: string;
  agentRole: AgentRole;
  action: string;
  inputSummary: string | null;
  outputSummary: string | null;
  toolUsed: string | null;
  toolInput: unknown;
  toolOutput: unknown;
  reasoning: string | null;
  tokensUsed: number;
  costUsd: number;
  durationMs: number | null;
  iterationNumber: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

export interface UserIntervention {
  id: string;
  taskId: string;
  userId: string;
  interventionType: 'feedback' | 'redirect' | 'pause' | 'resume' | 'cancel';
  message: string | null;
  appliedAt: string | null;
  createdAt: string;
}

export interface AgentStreamEvent {
  event: string;
  data: unknown;
}

class AgentService {
  // Create a new research task
  async createTask(
    projectId: string,
    title: string,
    goal: string,
    sourceDocumentIds?: string[]
  ): Promise<ResearchTask> {
    const response = await supabase.functions.invoke('task-orchestrator', {
      body: {
        action: 'create',
        projectId,
        title,
        goal,
        sourceDocumentIds,
      },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to create task');
    }

    return this.mapTask(response.data.task);
  }

  // Start a research task with streaming
  async startTask(
    taskId: string,
    onEvent: (event: AgentStreamEvent) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/task-orchestrator`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'start',
          taskId,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start task');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              onComplete();
              return;
            }
            try {
              const event = JSON.parse(data) as AgentStreamEvent;
              onEvent(event);
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Stream error'));
    }
  }

  // Send user intervention
  async sendIntervention(
    taskId: string,
    interventionType: UserIntervention['interventionType'],
    message?: string
  ): Promise<void> {
    const response = await supabase.functions.invoke('task-orchestrator', {
      body: {
        action: 'intervene',
        taskId,
        intervention: {
          type: interventionType,
          message,
        },
      },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to send intervention');
    }
  }

  // Get research tasks for a project
  async getTasks(projectId: string): Promise<ResearchTask[]> {
    const { data, error } = await supabase
      .from('research_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapTask);
  }

  // Get a single task
  async getTask(taskId: string): Promise<ResearchTask | null> {
    const { data, error } = await supabase
      .from('research_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return this.mapTask(data);
  }

  // Get activity logs for a task
  async getActivityLogs(taskId: string): Promise<AgentActivityLog[]> {
    const response = await supabase.functions.invoke('task-orchestrator', {
      body: {
        action: 'get_logs',
        taskId,
      },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to get logs');
    }

    return (response.data.logs || []).map(this.mapActivityLog);
  }

  // Subscribe to task updates
  subscribeToTask(
    taskId: string,
    onUpdate: (task: ResearchTask) => void
  ): () => void {
    const channel = supabase
      .channel(`research-task-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'research_tasks',
          filter: `id=eq.${taskId}`,
        },
        (payload) => {
          onUpdate(this.mapTask(payload.new as Record<string, unknown>));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Subscribe to activity logs
  subscribeToActivityLogs(
    taskId: string,
    onNewLog: (log: AgentActivityLog) => void
  ): () => void {
    const channel = supabase
      .channel(`agent-logs-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_activity_logs',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          onNewLog(this.mapActivityLog(payload.new as Record<string, unknown>));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  private mapTask(row: Record<string, unknown>): ResearchTask {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      userId: row.user_id as string,
      title: row.title as string,
      goal: row.goal as string,
      sourceDocumentIds: (row.source_document_ids as string[]) || [],
      status: row.status as ResearchTaskStatus,
      currentPhase: row.current_phase as string | null,
      progressPercent: (row.progress_percent as number) || 0,
      sharedWorkspace: (row.shared_workspace as Record<string, unknown>) || {},
      finalResult: row.final_result as Record<string, unknown> | null,
      finalReportMarkdown: row.final_report_markdown as string | null,
      conflictsFound: (row.conflicts_found as Conflict[]) || [],
      totalIterations: (row.total_iterations as number) || 0,
      maxIterations: (row.max_iterations as number) || 20,
      totalTokensUsed: (row.total_tokens_used as number) || 0,
      totalCostUsd: (row.total_cost_usd as number) || 0,
      startedAt: row.started_at as string | null,
      completedAt: row.completed_at as string | null,
      errorMessage: row.error_message as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapActivityLog(row: Record<string, unknown>): AgentActivityLog {
    return {
      id: row.id as string,
      taskId: row.task_id as string,
      agentRole: row.agent_role as AgentRole,
      action: row.action as string,
      inputSummary: row.input_summary as string | null,
      outputSummary: row.output_summary as string | null,
      toolUsed: row.tool_used as string | null,
      toolInput: row.tool_input,
      toolOutput: row.tool_output,
      reasoning: row.reasoning as string | null,
      tokensUsed: (row.tokens_used as number) || 0,
      costUsd: (row.cost_usd as number) || 0,
      durationMs: row.duration_ms as number | null,
      iterationNumber: (row.iteration_number as number) || 1,
      status: row.status as string,
      errorMessage: row.error_message as string | null,
      createdAt: row.created_at as string,
    };
  }
}

export const agentService = new AgentService();
