import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { CheckpointList, Checkpoint } from '@/components/training/CheckpointList';
import { DatasetQualityCard, DatasetQualityData } from '@/components/training/DatasetQualityCard';
import { ApiKeyRequiredBanner } from '@/components/training/ApiKeyRequiredBanner';
import { TrainingPipelineStepper, getStageFromStatus, TrainingTimeEstimate } from '@/components/training/TrainingPipelineStepper';
import { useApiKeyGuard } from '@/hooks/useApiKeyGuard';
import { useTrainingRealtime } from '@/hooks/useTraining';
import {
  ArrowLeft,
  Cpu,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Calendar,
  Zap,
  Database,
  Copy,
  RotateCcw,
  StopCircle,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface TrainingJob {
  id: string;
  base_model: string;
  status: string;
  progress_percent: number;
  provider: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  fine_tuned_model_id: string | null;
  dataset_id: string;
  project_id: string;
  current_step: string | null;
  total_steps: number | null;
  training_config: Record<string, unknown> | null;
  result_metrics: Record<string, unknown> | null;
}

const statusConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending' },
  queued: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Queued' },
  uploading: { icon: Loader2, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Uploading' },
  validating: { icon: FileText, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Validating' },
  running: { icon: Play, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Running' },
  training: { icon: Cpu, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Training' },
  paused: { icon: Pause, color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Paused' },
  completed: { icon: CheckCircle2, color: 'bg-green-100 text-green-800 border-green-200', label: 'Completed' },
  failed: { icon: XCircle, color: 'bg-red-100 text-red-800 border-red-200', label: 'Failed' },
  cancelled: { icon: StopCircle, color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Cancelled' },
};

export default function TrainingDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isControlLoading, setIsControlLoading] = useState(false);
  const { hasValidKey, isLoading: keyLoading, guardTraining } = useApiKeyGuard();
  
  // Enable real-time updates for this training job
  useTrainingRealtime(id);

  // Cancel training mutation
  const cancelMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke('cancel-training', {
        body: { jobId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-job', id] });
      toast.success(t('training.cancelSuccess', 'Training job cancelled'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('training.cancelError', 'Failed to cancel training'));
    },
  });

  const { data: job, isLoading, refetch } = useQuery({
    queryKey: ['training-job', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_jobs')
        .select('*')
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as TrainingJob;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data as TrainingJob | undefined;
      return data?.status === 'running' ? 5000 : false;
    },
  });

  // Fetch checkpoints
  const { data: checkpoints = [], isLoading: checkpointsLoading } = useQuery({
    queryKey: ['checkpoints', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_checkpoints')
        .select('*')
        .eq('job_id', id!)
        .order('step', { ascending: false });
      if (error) throw error;
      return data as Checkpoint[];
    },
    enabled: !!id,
  });

  // Fetch dataset quality (mock for now)
  const { data: validation, isLoading: validationLoading } = useQuery({
    queryKey: ['dataset-validation', job?.dataset_id],
    queryFn: async (): Promise<DatasetQualityData> => {
      // In real app, this would fetch from validation endpoint
      const { data: dataset } = await supabase
        .from('training_datasets')
        .select('total_pairs, total_tokens, validation_result')
        .eq('id', job!.dataset_id)
        .single();

      const result = dataset?.validation_result as Record<string, unknown> | null;
      return {
        totalSamples: dataset?.total_pairs || 0,
        issues: (result?.issues as string[]) || [],
        qualityScore: (result?.qualityScore as number) || 0.75,
        recommendations: (result?.recommendations as string[]) || [],
        suggestedSplit: {
          train: Math.floor((dataset?.total_pairs || 0) * 0.8),
          validation: Math.floor((dataset?.total_pairs || 0) * 0.1),
          test: Math.floor((dataset?.total_pairs || 0) * 0.1),
        },
      };
    },
    enabled: !!job?.dataset_id,
  });

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || statusConfig.pending;
  };

  const copyModelId = () => {
    if (job?.fine_tuned_model_id) {
      navigator.clipboard.writeText(job.fine_tuned_model_id);
      toast.success(t('training.copiedToClipboard', 'Model ID copied to clipboard'));
    }
  };

  const handleControl = async (action: 'pause' | 'resume' | 'stop') => {
    if (!job) return;
    
    // Guard resume action with API key check
    if (action === 'resume') {
      guardTraining(async () => {
        await executeControl(action);
      });
      return;
    }
    
    await executeControl(action);
  };

  const executeControl = async (action: 'pause' | 'resume' | 'stop') => {
    if (!job) return;
    setIsControlLoading(true);
    try {
      const newStatus = action === 'pause' ? 'paused' : action === 'resume' ? 'running' : 'failed';
      const { error } = await supabase
        .from('training_jobs')
        .update({ status: newStatus })
        .eq('id', job.id);
      if (error) throw error;
      await refetch();
      toast.success(t(`training.${action}Success`, `Training ${action}ed successfully`));
    } catch (error) {
      toast.error(t('training.controlError', 'Failed to update training status'));
    } finally {
      setIsControlLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout>
        <Card className="flex flex-col items-center justify-center py-12">
          <Cpu className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">{t('training.jobNotFound', 'Training job not found')}</p>
          <Button asChild>
            <Link to="/training">
              <ArrowLeft className="h-4 w-4 me-2" />
              {t('common.back', 'Back')}
            </Link>
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  const jobConfig = getStatusConfig(job.status);
  const StatusIcon = jobConfig.icon;
  
  // Get pipeline stage from job status
  const { stage, stageStatus } = getStageFromStatus(job.status);

  const handleCancelTraining = () => {
    if (confirm(t('training.confirmCancel', 'Are you sure you want to cancel this training job?'))) {
      cancelMutation.mutate(job.id);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* API Key Required Banner - show when paused and no key */}
        {job.status === 'paused' && (
          <ApiKeyRequiredBanner show={!keyLoading && !hasValidKey} />
        )}
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ms-2"
              onClick={() => navigate('/training')}
            >
              <ArrowLeft className="h-4 w-4 me-2" />
              {t('training.backToJobs', 'Back to Jobs')}
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Cpu className="h-6 w-6" />
              {job.base_model}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Job ID: {job.id}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={jobConfig.color}>
              <StatusIcon className="h-3 w-3 me-1" />
              {jobConfig.label}
            </Badge>
            {/* Training Controls */}
            <div className="flex gap-2">
              {job.status === 'running' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleControl('pause')}
                  disabled={isControlLoading}
                >
                  {isControlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                </Button>
              )}
              {job.status === 'paused' && (
                <Button
                  size="sm"
                  onClick={() => handleControl('resume')}
                  disabled={isControlLoading}
                >
                  {isControlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                </Button>
              )}
              {(job.status === 'running' || job.status === 'paused' || job.status === 'uploading' || job.status === 'queued' || job.status === 'training') && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCancelTraining}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />}
                  <span className="ms-1 hidden sm:inline">{t('training.cancel', 'Cancel')}</span>
                </Button>
              )}
              {job.dataset_id && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/datasets/${job.dataset_id}`}>
                    <FileText className="h-4 w-4" />
                    <span className="ms-1 hidden sm:inline">{t('training.viewDataset', 'Dataset')}</span>
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Training Pipeline Stepper */}
        {!['completed', 'failed', 'cancelled'].includes(job.status) && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6 pb-4">
              <TrainingPipelineStepper currentStage={stage} stageStatus={stageStatus} />
            </CardContent>
          </Card>
        )}

        {/* Progress Card */}
        {(job.status === 'running' || job.status === 'paused' || job.status === 'training') && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('training.progress', 'Progress')}</CardTitle>
                <TrainingTimeEstimate totalTokens={validation?.totalSamples || 0} status={job.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{job.current_step || t('training.initializing', 'Initializing...')}</span>
                <span className="font-medium">{job.progress_percent}%</span>
              </div>
              <Progress value={job.progress_percent} className="h-3" />
              {job.total_steps && (
                <p className="text-xs text-muted-foreground">
                  {t('training.stepsProgress', 'Step {{current}} of {{total}}', {
                    current: Math.round((job.progress_percent / 100) * job.total_steps),
                    total: job.total_steps,
                  })}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Card */}
        {job.status === 'failed' && job.error_message && (
          <Card className="border-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-destructive flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {t('training.error', 'Error')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-destructive">{job.error_message}</p>
            </CardContent>
          </Card>
        )}

        {/* Completed Model */}
        {job.status === 'completed' && job.fine_tuned_model_id && (
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-green-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t('training.modelReady', 'Model Ready')}
              </CardTitle>
              <CardDescription>{t('training.modelReadyDesc', 'Your fine-tuned model is ready to use')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-white rounded border text-sm font-mono truncate">
                  {job.fine_tuned_model_id}
                </code>
                <Button variant="outline" size="icon" onClick={copyModelId}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('training.provider', 'Provider')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold capitalize">{job.provider}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('training.created', 'Created')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-sm">{format(new Date(job.created_at), 'PPp')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('training.started', 'Started')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-sm">
                  {job.started_at ? format(new Date(job.started_at), 'PPp') : '-'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('training.completed', 'Completed')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-sm">
                  {job.completed_at ? format(new Date(job.completed_at), 'PPp') : '-'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dataset & Checkpoints */}
        <div className="grid gap-6 lg:grid-cols-2">
          <DatasetQualityCard validation={validation} isLoading={validationLoading} />
          <CheckpointList checkpoints={checkpoints} isLoading={checkpointsLoading} />
        </div>

        {/* Training Config */}
        {job.training_config && Object.keys(job.training_config).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                {t('training.configuration', 'Configuration')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-muted rounded-md text-xs overflow-auto">
                {JSON.stringify(job.training_config, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Result Metrics */}
        {job.result_metrics && Object.keys(job.result_metrics).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('training.resultMetrics', 'Result Metrics')}</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-muted rounded-md text-xs overflow-auto">
                {JSON.stringify(job.result_metrics, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
