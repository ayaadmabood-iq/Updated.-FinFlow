import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { autoTrainingService, type TrainingJob, type StartTrainingInput } from '@/services/autoTrainingService';
import { toast } from '@/hooks/use-toast';

export function useTrainingJobs(projectId?: string) {
  return useQuery({
    queryKey: ['trainingJobs', projectId],
    queryFn: () => autoTrainingService.getJobs(projectId),
    enabled: true,
  });
}

export function useTrainingJob(jobId: string) {
  const [job, setJob] = useState<TrainingJob | null>(null);

  const { data: initialJob, isLoading } = useQuery({
    queryKey: ['trainingJob', jobId],
    queryFn: () => autoTrainingService.getJob(jobId),
    enabled: !!jobId,
  });

  useEffect(() => {
    if (initialJob) {
      setJob(initialJob);
    }
  }, [initialJob]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!jobId) return;

    const unsubscribe = autoTrainingService.subscribeToJobUpdates(jobId, (updatedJob) => {
      setJob(updatedJob);
    });

    return unsubscribe;
  }, [jobId]);

  return { job, isLoading };
}

export function useRealtimeTrainingJobs(projectId: string) {
  const queryClient = useQueryClient();
  const [jobs, setJobs] = useState<TrainingJob[]>([]);

  const { data: initialJobs, isLoading } = useQuery({
    queryKey: ['trainingJobs', projectId],
    queryFn: () => autoTrainingService.getJobs(projectId),
    enabled: !!projectId,
  });

  useEffect(() => {
    if (initialJobs) {
      setJobs(initialJobs);
    }
  }, [initialJobs]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = autoTrainingService.subscribeToProjectJobs(projectId, (updatedJobs) => {
      setJobs(updatedJobs);
      queryClient.setQueryData(['trainingJobs', projectId], updatedJobs);
    });

    return unsubscribe;
  }, [projectId, queryClient]);

  return { jobs, isLoading };
}

export function useStartTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StartTrainingInput) => autoTrainingService.startTraining(input),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['trainingJobs'] });
      toast({
        title: 'Training started',
        description: result.message,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Training failed to start',
        description: error.message,
      });
    },
  });
}

export function useApiKeyStatus() {
  return useQuery({
    queryKey: ['apiKeyStatus'],
    queryFn: () => autoTrainingService.getApiKeyStatus(),
  });
}

export function useSetApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ provider, apiKey }: { provider: 'openai' | 'anthropic'; apiKey: string }) =>
      autoTrainingService.setApiKey(provider, apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeyStatus'] });
      toast({
        title: 'API key saved',
        description: 'Your API key has been securely saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to save API key',
        description: error.message,
      });
    },
  });
}

export function useRemoveApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: 'openai' | 'anthropic') => autoTrainingService.removeApiKey(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeyStatus'] });
      toast({
        title: 'API key removed',
        description: 'Your API key has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to remove API key',
        description: error.message,
      });
    },
  });
}

export function useProjectTrainingSettings(projectId: string) {
  return useQuery({
    queryKey: ['projectTrainingSettings', projectId],
    queryFn: () => autoTrainingService.getProjectSettings(projectId),
    enabled: !!projectId,
  });
}

export function useUpdateProjectTrainingSettings(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: { autoTrainEnabled?: boolean; autoTrainModel?: string }) =>
      autoTrainingService.updateProjectSettings(projectId, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTrainingSettings', projectId] });
      toast({
        title: 'Settings updated',
        description: 'Training settings have been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update settings',
        description: error.message,
      });
    },
  });
}

export function useGetStoredApiKey() {
  return useCallback(async (provider: 'openai' | 'anthropic') => {
    return autoTrainingService.getApiKey(provider);
  }, []);
}
