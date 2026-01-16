import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentService, type ResearchTask, type AgentActivityLog, type AgentStreamEvent } from '@/services/agentService';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useCallback } from 'react';

export function useResearchTasks(projectId: string) {
  return useQuery({
    queryKey: ['research-tasks', projectId],
    queryFn: () => agentService.getTasks(projectId),
    enabled: !!projectId,
  });
}

export function useResearchTask(taskId: string | undefined) {
  const [task, setTask] = useState<ResearchTask | null>(null);

  const query = useQuery({
    queryKey: ['research-task', taskId],
    queryFn: () => agentService.getTask(taskId!),
    enabled: !!taskId,
  });

  useEffect(() => {
    if (query.data) {
      setTask(query.data);
    }
  }, [query.data]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!taskId) return;

    const unsubscribe = agentService.subscribeToTask(taskId, (updatedTask) => {
      setTask(updatedTask);
    });

    return unsubscribe;
  }, [taskId]);

  return {
    ...query,
    data: task,
  };
}

export function useActivityLogs(taskId: string | undefined) {
  const [logs, setLogs] = useState<AgentActivityLog[]>([]);

  const query = useQuery({
    queryKey: ['agent-logs', taskId],
    queryFn: () => agentService.getActivityLogs(taskId!),
    enabled: !!taskId,
  });

  useEffect(() => {
    if (query.data) {
      setLogs(query.data);
    }
  }, [query.data]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!taskId) return;

    const unsubscribe = agentService.subscribeToActivityLogs(taskId, (newLog) => {
      setLogs((prev) => [...prev, newLog]);
    });

    return unsubscribe;
  }, [taskId]);

  return {
    ...query,
    data: logs,
  };
}

export function useCreateResearchTask() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      title,
      goal,
      sourceDocumentIds,
    }: {
      projectId: string;
      title: string;
      goal: string;
      sourceDocumentIds?: string[];
    }) => agentService.createTask(projectId, title, goal, sourceDocumentIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['research-tasks', variables.projectId] });
      toast({
        title: 'Research task created',
        description: 'Your research task has been queued.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create task',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useStartResearchTask() {
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<AgentStreamEvent[]>([]);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const startTask = useCallback(async (taskId: string) => {
    setIsRunning(true);
    setEvents([]);
    setCurrentPhase(null);
    setProgress(0);
    setActiveAgent(null);
    setActiveTool(null);

    try {
      await agentService.startTask(
        taskId,
        (event) => {
          setEvents((prev) => [...prev, event]);

          // Update UI based on event type
          if (event.event === 'phase_change') {
            const data = event.data as { phase: string; progress: number };
            setCurrentPhase(data.phase);
            setProgress(data.progress);
          } else if (event.event === 'agent_thinking') {
            const data = event.data as { role: string };
            setActiveAgent(data.role);
            setActiveTool(null);
          } else if (event.event === 'agent_tool_use') {
            const data = event.data as { tool: string };
            setActiveTool(data.tool);
          } else if (event.event === 'agent_complete') {
            setActiveAgent(null);
            setActiveTool(null);
          } else if (event.event === 'task_complete') {
            toast({
              title: 'Research complete',
              description: 'Your research task has been completed successfully.',
            });
          } else if (event.event === 'error') {
            const data = event.data as { message: string };
            toast({
              title: 'Research error',
              description: data.message,
              variant: 'destructive',
            });
          }
        },
        (error) => {
          toast({
            title: 'Task failed',
            description: error.message,
            variant: 'destructive',
          });
        },
        () => {
          setIsRunning(false);
          queryClient.invalidateQueries({ queryKey: ['research-task', taskId] });
          queryClient.invalidateQueries({ queryKey: ['agent-logs', taskId] });
        }
      );
    } catch (error) {
      setIsRunning(false);
      toast({
        title: 'Failed to start task',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [toast, queryClient]);

  const reset = useCallback(() => {
    setEvents([]);
    setCurrentPhase(null);
    setProgress(0);
    setActiveAgent(null);
    setActiveTool(null);
  }, []);

  return {
    startTask,
    reset,
    isRunning,
    events,
    currentPhase,
    progress,
    activeAgent,
    activeTool,
  };
}

export function useSendIntervention() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      taskId,
      interventionType,
      message,
    }: {
      taskId: string;
      interventionType: 'feedback' | 'redirect' | 'pause' | 'resume' | 'cancel';
      message?: string;
    }) => agentService.sendIntervention(taskId, interventionType, message),
    onSuccess: (_, variables) => {
      if (variables.interventionType === 'cancel') {
        toast({
          title: 'Task cancelled',
          description: 'The research task has been cancelled.',
        });
      } else {
        toast({
          title: 'Intervention sent',
          description: 'Your feedback has been submitted.',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Failed to send intervention',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}
