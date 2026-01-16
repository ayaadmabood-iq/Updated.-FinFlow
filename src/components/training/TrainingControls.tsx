import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  StopCircle, 
  Loader2, 
  AlertTriangle,
  CheckCircle2,
  Settings2 
} from 'lucide-react';
import type { TrainingJob } from '@/services/autoTrainingService';

interface Props {
  job: TrainingJob | null;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop?: () => void;
  isLoading: boolean;
  canStart: boolean;
  startError?: string;
}

export function TrainingControls({ 
  job, 
  onStart, 
  onPause, 
  onResume, 
  onStop,
  isLoading, 
  canStart,
  startError 
}: Props) {
  const { t } = useTranslation();

  const status = job?.status || 'pending';
  const isTraining = status === 'training';
  const isPaused = status === 'pending' && job?.currentStep?.includes('Paused');
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const canPause = isTraining;
  const trainingConfig = job?.trainingConfig as { checkpoint?: { autoResume?: boolean } } | undefined;
  const canResume = isPaused || (isFailed && trainingConfig?.checkpoint?.autoResume);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          {t('training.controls', 'Training Controls')}
        </CardTitle>
        <CardDescription>
          {t('training.controlsDesc', 'Start, pause, or resume training')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {startError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{startError}</AlertDescription>
          </Alert>
        )}

        {isCompleted && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              {t('training.completed', 'Training completed successfully!')}
            </AlertDescription>
          </Alert>
        )}

        {isFailed && job?.errorMessage && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{job.errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-3">
          {/* Start button - only show when no job or job is idle */}
          {(!job || status === 'pending') && !isPaused && (
            <Button 
              onClick={onStart} 
              disabled={isLoading || !canStart}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {t('training.startTraining', 'Start Training')}
            </Button>
          )}

          {/* Pause button - only during active training */}
          {canPause && (
            <Button 
              onClick={onPause} 
              variant="outline"
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
              {t('training.pause', 'Pause')}
            </Button>
          )}

          {/* Resume button - when paused or failed with auto-resume */}
          {canResume && (
            <Button 
              onClick={onResume} 
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              {isPaused 
                ? t('training.resume', 'Resume') 
                : t('training.resumeFromCheckpoint', 'Resume from Checkpoint')}
            </Button>
          )}

          {/* Stop button - during training or paused */}
          {onStop && (isTraining || isPaused) && (
            <Button 
              onClick={onStop} 
              variant="destructive"
              disabled={isLoading}
              className="gap-2"
            >
              <StopCircle className="h-4 w-4" />
              {t('training.stop', 'Stop')}
            </Button>
          )}
        </div>

        {/* Status info */}
        {job && (
          <div className="text-sm text-muted-foreground pt-2 border-t">
            <p>
              {t('training.status', 'Status')}: <span className="font-medium capitalize">{status}</span>
            </p>
            {job.currentStep && (
              <p>
                {t('training.currentStep', 'Current Step')}: <span className="font-medium">{job.currentStep}</span>
              </p>
            )}
            {job.progressPercent > 0 && (
              <p>
                {t('training.progress', 'Progress')}: <span className="font-medium">{job.progressPercent}%</span>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
