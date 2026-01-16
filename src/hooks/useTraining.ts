import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { trainingService, type GenerateDatasetInput } from '@/services/trainingService';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function useTrainingDatasets(projectId: string) {
  return useQuery({
    queryKey: ['trainingDatasets', projectId],
    queryFn: () => trainingService.getDatasets(projectId),
    enabled: !!projectId,
  });
}

// Hook for real-time training job updates
export function useTrainingRealtime(jobId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`training-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'training_jobs',
          filter: `id=eq.${jobId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['training-job', jobId] });
          queryClient.invalidateQueries({ queryKey: ['trainingJobs'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'training_checkpoints',
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['checkpoints', jobId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, queryClient]);
}

export function useTrainingDataset(datasetId: string) {
  return useQuery({
    queryKey: ['trainingDataset', datasetId],
    queryFn: () => trainingService.getDataset(datasetId),
    enabled: !!datasetId,
  });
}

export function useTrainingPairs(datasetId: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['trainingPairs', datasetId, page, pageSize],
    queryFn: () => trainingService.getPairs(datasetId, page, pageSize),
    enabled: !!datasetId,
  });
}

export function useGenerateDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: GenerateDatasetInput) => trainingService.generateDataset(input),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trainingDatasets', variables.projectId] });
      toast({
        title: 'Dataset generated',
        description: `Created ${result.totalPairs} training pairs (${result.totalTokens} tokens)`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Generation failed',
        description: error.message,
      });
    },
  });
}

export function useUpdateTrainingPair(datasetId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { userMessage?: string; assistantMessage?: string; systemMessage?: string } }) =>
      trainingService.updatePair(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingPairs', datasetId] });
      toast({
        title: 'Pair updated',
        description: 'Training pair has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: error.message,
      });
    },
  });
}

export function useDeleteTrainingPair(datasetId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => trainingService.deletePair(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingPairs', datasetId] });
      queryClient.invalidateQueries({ queryKey: ['trainingDataset', datasetId] });
      toast({
        title: 'Pair deleted',
        description: 'Training pair has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error.message,
      });
    },
  });
}

export function useDeleteDataset(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => trainingService.deleteDataset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingDatasets', projectId] });
      toast({
        title: 'Dataset deleted',
        description: 'Training dataset has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error.message,
      });
    },
  });
}

export function useDownloadJsonl() {
  return useMutation({
    mutationFn: (datasetId: string) => trainingService.downloadJsonl(datasetId),
    onSuccess: (result) => {
      const blob = new Blob([result.content], { type: 'application/jsonl' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download started',
        description: `Downloading ${result.filename}`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: error.message,
      });
    },
  });
}
