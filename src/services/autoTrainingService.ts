import { supabase } from '@/integrations/supabase/client';

export type TrainingJobStatus = 'pending' | 'uploading' | 'validating' | 'queued' | 'training' | 'completed' | 'failed';

export interface TrainingJob {
  id: string;
  datasetId: string;
  userId: string;
  projectId: string;
  provider: string;
  baseModel: string;
  fineTunedModelId?: string;
  providerJobId?: string;
  status: TrainingJobStatus;
  progressPercent: number;
  currentStep?: string;
  trainingConfig: Record<string, unknown>;
  resultMetrics?: Record<string, unknown>;
  errorMessage?: string;
  autoStarted: boolean;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StartTrainingInput {
  datasetId: string;
  baseModel: string;
  apiKey: string;
  trainingConfig?: {
    nEpochs?: number;
    batchSize?: number;
    learningRateMultiplier?: number;
  };
  autoStarted?: boolean;
}

export interface StartTrainingResult {
  success: boolean;
  jobId: string;
  status: string;
  message: string;
}

class AutoTrainingService {
  async startTraining(input: StartTrainingInput): Promise<StartTrainingResult> {
    const { data, error } = await supabase.functions.invoke('start-training', {
      body: input,
    });

    if (error) {
      console.error('Start training invoke error:', error);
      throw new Error(error.message || 'Failed to start training');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data as StartTrainingResult;
  }

  async getJobs(projectId?: string): Promise<TrainingJob[]> {
    let query = supabase
      .from('training_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(this.mapToJob);
  }

  async getJob(id: string): Promise<TrainingJob | null> {
    const { data, error } = await supabase
      .from('training_jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToJob(data) : null;
  }

  subscribeToJobUpdates(jobId: string, callback: (job: TrainingJob) => void) {
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
        (payload) => {
          callback(this.mapToJob(payload.new as Record<string, unknown>));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  subscribeToProjectJobs(projectId: string, callback: (jobs: TrainingJob[]) => void) {
    const channel = supabase
      .channel(`project-training-jobs-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'training_jobs',
          filter: `project_id=eq.${projectId}`,
        },
        async () => {
          // Refetch all jobs on any change
          const jobs = await this.getJobs(projectId);
          callback(jobs);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // API Key management - now uses server-side Edge Function for secure handling
  async getApiKeyStatus(): Promise<{ openaiKeySet: boolean; anthropicKeySet: boolean }> {
    const { data, error } = await supabase.functions.invoke('manage-api-keys', {
      body: { action: 'get-status' },
    });

    if (error) throw new Error(error.message || 'Failed to get API key status');
    
    return {
      openaiKeySet: data?.openaiKeySet || false,
      anthropicKeySet: data?.anthropicKeySet || false,
    };
  }

  async setApiKey(provider: 'openai' | 'anthropic', apiKey: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('manage-api-keys', {
      body: { action: 'set', provider, apiKey },
    });

    if (error) throw new Error(error.message || 'Failed to set API key');
    if (data?.error) throw new Error(data.error);
  }

  async getApiKey(provider: 'openai' | 'anthropic'): Promise<string | null> {
    const { data, error } = await supabase.functions.invoke('manage-api-keys', {
      body: { action: 'get-key', provider },
    });

    if (error) throw new Error(error.message || 'Failed to get API key');
    return data?.apiKey || null;
  }

  async removeApiKey(provider: 'openai' | 'anthropic'): Promise<void> {
    const { data, error } = await supabase.functions.invoke('manage-api-keys', {
      body: { action: 'remove', provider },
    });

    if (error) throw new Error(error.message || 'Failed to remove API key');
    if (data?.error) throw new Error(data.error);
  }

  // Project auto-train settings
  async getProjectSettings(projectId: string): Promise<{ autoTrainEnabled: boolean; autoTrainModel: string }> {
    const { data, error } = await supabase
      .from('projects')
      .select('auto_train_enabled, auto_train_model')
      .eq('id', projectId)
      .single();

    if (error) throw error;
    
    return {
      autoTrainEnabled: data?.auto_train_enabled || false,
      autoTrainModel: data?.auto_train_model || 'gpt-4o-mini-2024-07-18',
    };
  }

  async updateProjectSettings(projectId: string, settings: { autoTrainEnabled?: boolean; autoTrainModel?: string }): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (settings.autoTrainEnabled !== undefined) updates.auto_train_enabled = settings.autoTrainEnabled;
    if (settings.autoTrainModel !== undefined) updates.auto_train_model = settings.autoTrainModel;

    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId);

    if (error) throw error;
  }

  private mapToJob(data: Record<string, unknown>): TrainingJob {
    return {
      id: data.id as string,
      datasetId: data.dataset_id as string,
      userId: data.user_id as string,
      projectId: data.project_id as string,
      provider: data.provider as string,
      baseModel: data.base_model as string,
      fineTunedModelId: data.fine_tuned_model_id as string | undefined,
      providerJobId: data.provider_job_id as string | undefined,
      status: data.status as TrainingJobStatus,
      progressPercent: (data.progress_percent as number) || 0,
      currentStep: data.current_step as string | undefined,
      trainingConfig: (data.training_config as Record<string, unknown>) || {},
      resultMetrics: data.result_metrics as Record<string, unknown> | undefined,
      errorMessage: data.error_message as string | undefined,
      autoStarted: (data.auto_started as boolean) || false,
      startedAt: data.started_at as string | undefined,
      completedAt: data.completed_at as string | undefined,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}

export const autoTrainingService = new AutoTrainingService();
