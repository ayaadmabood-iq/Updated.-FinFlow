import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useTrainingJob } from '@/hooks/useAutoTraining';
import { TrainingCompleteModal } from './TrainingCompleteModal';
import { useTrainingNotifications } from './TrainingNotifications';
import type { TrainingJob, TrainingJobStatus } from '@/services/autoTrainingService';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Copy,
  ExternalLink,
  Brain,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface TrainingProgressProps {
  jobId: string;
  onComplete?: (modelId: string) => void;
  showCompleteModal?: boolean;
}

const statusConfig: Record<TrainingJobStatus, { color: string; icon: React.ReactNode; label: string; pulse?: boolean }> = {
  pending: { color: 'bg-muted text-muted-foreground', icon: <Clock className="h-4 w-4" />, label: 'Pending' },
  uploading: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', icon: <Loader2 className="h-4 w-4 animate-spin" />, label: 'Uploading', pulse: true },
  validating: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300', icon: <Loader2 className="h-4 w-4 animate-spin" />, label: 'Validating', pulse: true },
  queued: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300', icon: <Clock className="h-4 w-4" />, label: 'Queued' },
  training: { color: 'bg-primary/20 text-primary', icon: <Zap className="h-4 w-4" />, label: 'Training', pulse: true },
  completed: { color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300', icon: <CheckCircle2 className="h-4 w-4" />, label: 'Completed' },
  failed: { color: 'bg-destructive/20 text-destructive', icon: <XCircle className="h-4 w-4" />, label: 'Failed' },
};

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export function TrainingProgress({ jobId, onComplete, showCompleteModal = true }: TrainingProgressProps) {
  const { t } = useTranslation();
  const { job, isLoading } = useTrainingJob(jobId);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const hasShownModal = useRef(false);

  // Enable training notifications (toast + confetti)
  useTrainingNotifications(job, true);

  // Track elapsed time for active jobs
  useEffect(() => {
    if (!job?.startedAt || job.status === 'completed' || job.status === 'failed') {
      return;
    }

    const startTime = new Date(job.startedAt).getTime();
    
    const updateElapsed = () => {
      const now = Date.now();
      setElapsedTime(Math.floor((now - startTime) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [job?.startedAt, job?.status]);

  // Show completion modal when job completes
  useEffect(() => {
    if (job?.status === 'completed' && job.fineTunedModelId) {
      if (showCompleteModal && !hasShownModal.current) {
        setShowModal(true);
        hasShownModal.current = true;
      }
      onComplete?.(job.fineTunedModelId);
    }
  }, [job?.status, job?.fineTunedModelId, onComplete, showCompleteModal]);

  const copyModelId = () => {
    if (job?.fineTunedModelId) {
      navigator.clipboard.writeText(job.fineTunedModelId);
      toast.success('Model ID copied to clipboard');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!job) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('training.jobNotFound', 'Training job not found')}
        </CardContent>
      </Card>
    );
  }

  const config = statusConfig[job.status];
  const isActive = ['pending', 'uploading', 'validating', 'queued', 'training'].includes(job.status);

  return (
    <Card className={config.pulse ? 'ring-2 ring-primary/20 animate-pulse-subtle' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            {t('training.trainingProgress', 'Training Progress')}
          </CardTitle>
          <Badge className={`${config.color} gap-1`}>
            {config.icon}
            <span>{config.label}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Live Progress Indicator */}
        {isActive && (
          <div className="flex items-center justify-center py-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-muted flex items-center justify-center">
                <svg className="absolute w-24 h-24 -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="4"
                    strokeDasharray={`${(job.progressPercent / 100) * 276.46} 276.46`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="text-2xl font-bold">{job.progressPercent}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{job.currentStep || 'Processing...'}</span>
            <span className="font-medium">{job.progressPercent}%</span>
          </div>
          <Progress value={job.progressPercent} className="h-3" />
        </div>

        {/* Elapsed Time */}
        {isActive && job.startedAt && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Timer className="h-4 w-4" />
            <span>{t('training.elapsed', 'Elapsed')}: {formatDuration(elapsedTime)}</span>
          </div>
        )}

        {/* Model info */}
        <div className="grid gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('training.baseModel', 'Base Model')}</span>
            <span className="font-medium">{job.baseModel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('training.provider', 'Provider')}</span>
            <span className="font-medium capitalize">{job.provider}</span>
          </div>
          {job.startedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('training.startedAt', 'Started')}</span>
              <span className="font-medium">
                {new Date(job.startedAt).toLocaleString()}
              </span>
            </div>
          )}
          {job.completedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('training.completedAt', 'Completed')}</span>
              <span className="font-medium">
                {new Date(job.completedAt).toLocaleString()}
              </span>
            </div>
          )}
          {job.completedAt && job.startedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('training.duration', 'Duration')}</span>
              <span className="font-medium">
                {formatDuration(Math.floor((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000))}
              </span>
            </div>
          )}
        </div>

        {/* Completed - Show model ID */}
        {job.status === 'completed' && job.fineTunedModelId && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t('training.fineTunedModel', 'Fine-tuned Model ID')}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={copyModelId}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a
                    href="https://platform.openai.com/finetune"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <code className="block p-2 bg-white dark:bg-gray-800 rounded text-sm font-mono break-all">
              {job.fineTunedModelId}
            </code>
            <p className="text-xs text-green-700 dark:text-green-300 mt-2">
              {t('training.useModelHint', 'Use this model ID in your API calls to access your fine-tuned model.')}
            </p>
          </div>
        )}

        {/* Failed - Show error */}
        {job.status === 'failed' && job.errorMessage && (
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <span className="text-sm font-medium text-destructive flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              {t('training.error', 'Error')}
            </span>
            <p className="text-sm text-destructive/80 mt-1">
              {job.errorMessage}
            </p>
          </div>
        )}

        {/* Training metrics */}
        {job.resultMetrics && Object.keys(job.resultMetrics).length > 0 && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('training.metrics', 'Training Metrics')}
            </span>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {Object.entries(job.resultMetrics).map(([key, value]) => (
                <div key={key} className="p-2 bg-background rounded border">
                  <p className="text-xs text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                  </p>
                  <p className="font-medium">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Training Complete Modal */}
      {job && (
        <TrainingCompleteModal
          open={showModal}
          onOpenChange={setShowModal}
          job={job}
        />
      )}
    </Card>
  );
}
