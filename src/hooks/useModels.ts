import { useQuery, useMutation } from '@tanstack/react-query';
import { autoTrainingService, type TrainingJob } from '@/services/autoTrainingService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useCompletedModels() {
  const query = useQuery({
    queryKey: ['completedModels'],
    queryFn: async (): Promise<TrainingJob[]> => {
      const jobs = await autoTrainingService.getJobs();
      // Filter to only completed jobs with a fine-tuned model ID
      return jobs.filter(
        (job) => job.status === 'completed' && job.fineTunedModelId
      );
    },
  });

  return {
    models: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useProjectModels(projectId: string) {
  const query = useQuery({
    queryKey: ['projectModels', projectId],
    queryFn: async (): Promise<TrainingJob[]> => {
      const jobs = await autoTrainingService.getJobs(projectId);
      return jobs.filter(
        (job) => job.status === 'completed' && job.fineTunedModelId
      );
    },
    enabled: !!projectId,
  });

  return {
    models: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

interface TestModelInput {
  modelId: string;
  systemPrompt: string;
  userMessage: string;
}

export function useTestModel() {
  return useMutation({
    mutationFn: async ({ modelId, systemPrompt, userMessage }: TestModelInput): Promise<string> => {
      const { data, error } = await supabase.functions.invoke('test-model', {
        body: { modelId, systemPrompt, userMessage },
      });

      if (error) {
        console.error('Test model error:', error);
        throw new Error(error.message || 'Failed to test model');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data.response;
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Test failed',
        description: error.message,
      });
    },
  });
}