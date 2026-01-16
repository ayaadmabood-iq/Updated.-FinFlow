import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  Database,
  CheckCircle2,
  FileCheck,
  Upload,
  Cpu,
  Rocket,
  Clock,
  XCircle,
  Loader2,
} from 'lucide-react';

export type TrainingStage = 
  | 'data_prep'
  | 'validation'
  | 'uploading'
  | 'training'
  | 'deployed';

export type StageStatus = 'pending' | 'active' | 'completed' | 'failed';

interface StageConfig {
  id: TrainingStage;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}

const stages: StageConfig[] = [
  {
    id: 'data_prep',
    icon: Database,
    label: 'training.stageDataPrep',
    description: 'training.stageDataPrepDesc',
  },
  {
    id: 'validation',
    icon: FileCheck,
    label: 'training.stageValidation',
    description: 'training.stageValidationDesc',
  },
  {
    id: 'uploading',
    icon: Upload,
    label: 'training.stageUploading',
    description: 'training.stageUploadingDesc',
  },
  {
    id: 'training',
    icon: Cpu,
    label: 'training.stageTraining',
    description: 'training.stageTrainingDesc',
  },
  {
    id: 'deployed',
    icon: Rocket,
    label: 'training.stageDeployed',
    description: 'training.stageDeployedDesc',
  },
];

// Map training job status to pipeline stage
export function getStageFromStatus(status: string): { stage: TrainingStage; stageStatus: StageStatus } {
  switch (status) {
    case 'pending':
      return { stage: 'data_prep', stageStatus: 'active' };
    case 'validating':
      return { stage: 'validation', stageStatus: 'active' };
    case 'uploading':
      return { stage: 'uploading', stageStatus: 'active' };
    case 'running':
    case 'training':
      return { stage: 'training', stageStatus: 'active' };
    case 'completed':
    case 'succeeded':
      return { stage: 'deployed', stageStatus: 'completed' };
    case 'failed':
    case 'cancelled':
      return { stage: 'training', stageStatus: 'failed' };
    default:
      return { stage: 'data_prep', stageStatus: 'pending' };
  }
}

interface TrainingPipelineStepperProps {
  currentStage: TrainingStage;
  stageStatus: StageStatus;
  className?: string;
  compact?: boolean;
}

export function TrainingPipelineStepper({
  currentStage,
  stageStatus,
  className,
  compact = false,
}: TrainingPipelineStepperProps) {
  const { t } = useTranslation();
  
  const currentIndex = stages.findIndex(s => s.id === currentStage);

  const getStageState = (index: number): StageStatus => {
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return stageStatus;
    return 'pending';
  };

  const getStageIcon = (stage: StageConfig, state: StageStatus) => {
    const StageIcon = stage.icon;
    
    switch (state) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-primary" />;
      case 'active':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <StageIcon className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {stages.map((stage, index) => {
          const state = getStageState(index);
          return (
            <div
              key={stage.id}
              className={cn(
                "flex items-center gap-1",
                state === 'pending' && "opacity-50"
              )}
            >
              {getStageIcon(stage, state)}
              {index < stages.length - 1 && (
                <div 
                  className={cn(
                    "w-8 h-0.5 rounded",
                    state === 'completed' ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const state = getStageState(index);
          const StageIcon = stage.icon;
          
          return (
            <div key={stage.id} className="flex flex-col items-center flex-1">
              {/* Icon */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                  state === 'completed' && "bg-primary border-primary",
                  state === 'active' && "border-primary bg-primary/10",
                  state === 'failed' && "border-destructive bg-destructive/10",
                  state === 'pending' && "border-muted bg-muted/50"
                )}
              >
                {state === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                ) : state === 'active' ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : state === 'failed' ? (
                  <XCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <StageIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              
              {/* Label */}
              <p 
                className={cn(
                  "text-xs font-medium mt-2 text-center",
                  state === 'completed' && "text-primary",
                  state === 'active' && "text-primary",
                  state === 'failed' && "text-destructive",
                  state === 'pending' && "text-muted-foreground"
                )}
              >
                {t(stage.label, stage.id.replace('_', ' '))}
              </p>
              
              {/* Description (only for active stage) */}
              {state === 'active' && (
                <p className="text-xs text-muted-foreground mt-1 text-center max-w-[100px]">
                  {t(stage.description, '')}
                </p>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Progress bar */}
      <div className="relative h-1 bg-muted rounded-full mt-4 mx-5">
        <div 
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
            stageStatus === 'failed' ? "bg-destructive" : "bg-primary"
          )}
          style={{
            width: `${((currentIndex + (stageStatus === 'completed' ? 1 : 0.5)) / stages.length) * 100}%`
          }}
        />
      </div>
    </div>
  );
}

// Utility component for showing time estimate
export function TrainingTimeEstimate({ 
  totalTokens, 
  status 
}: { 
  totalTokens: number; 
  status: string;
}) {
  const { t } = useTranslation();
  
  // Rough estimate: ~1000 tokens per minute for fine-tuning
  const estimatedMinutes = Math.max(1, Math.ceil(totalTokens / 1000));
  
  if (status === 'completed' || status === 'failed') {
    return null;
  }
  
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>
        {t('training.estimatedTime', 'Est. {{time}} min', { time: estimatedMinutes })}
      </span>
    </div>
  );
}
