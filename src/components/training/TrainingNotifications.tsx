import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { CheckCircle2, AlertCircle, Loader2, TrendingUp } from 'lucide-react';
import { TrainingJob, TrainingJobStatus } from '@/services/autoTrainingService';

interface TrainingNotificationsProps {
  job: TrainingJob | null;
  enabled?: boolean;
}

const MILESTONE_PERCENTAGES = [25, 50, 75];

export function useTrainingNotifications(job: TrainingJob | null, enabled = true) {
  const previousStatusRef = useRef<TrainingJobStatus | null>(null);
  const previousProgressRef = useRef<number>(0);
  const shownMilestonesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!enabled || !job) return;

    const previousStatus = previousStatusRef.current;
    const previousProgress = previousProgressRef.current;
    const currentProgress = job.progressPercent || 0;

    // Training started notification
    if (previousStatus === null && job.status === 'training') {
      toast.info('Training Started', {
        description: `Fine-tuning job has started with ${job.baseModel}`,
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        duration: 5000,
      });
    }

    // Status change from pending to training
    if (previousStatus === 'pending' && job.status === 'training') {
      toast.info('Training In Progress', {
        description: `Your model is now being fine-tuned`,
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        duration: 5000,
      });
    }

    // Progress milestone notifications
    if (job.status === 'training') {
      for (const milestone of MILESTONE_PERCENTAGES) {
        if (
          previousProgress < milestone &&
          currentProgress >= milestone &&
          !shownMilestonesRef.current.has(milestone)
        ) {
          shownMilestonesRef.current.add(milestone);
          toast.success(`${milestone}% Complete`, {
            description: `Training is ${milestone}% done - keep going!`,
            icon: <TrendingUp className="h-4 w-4" />,
            duration: 4000,
          });
        }
      }
    }

    // Training completed notification with confetti
    if (previousStatus !== 'completed' && job.status === 'completed') {
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#22c55e', '#4ade80', '#86efac'],
      });

      toast.success('Training Complete! 🎉', {
        description: `Your fine-tuned model is ready: ${job.fineTunedModelId}`,
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        duration: 10000,
        action: {
          label: 'Copy Model ID',
          onClick: () => {
            if (job.fineTunedModelId) {
              navigator.clipboard.writeText(job.fineTunedModelId);
              toast.success('Model ID copied to clipboard');
            }
          },
        },
      });
    }

    // Training failed notification with retry option
    if (previousStatus !== 'failed' && job.status === 'failed') {
      toast.error('Training Failed', {
        description: job.errorMessage || 'An error occurred during training',
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
        duration: 10000,
      });
    }

    // Update refs
    previousStatusRef.current = job.status;
    previousProgressRef.current = currentProgress;
  }, [job, enabled]);

  // Reset when job changes
  useEffect(() => {
    if (job?.id) {
      shownMilestonesRef.current = new Set();
    }
  }, [job?.id]);
}

export function TrainingNotifications({ job, enabled = true }: TrainingNotificationsProps) {
  useTrainingNotifications(job, enabled);
  return null;
}
