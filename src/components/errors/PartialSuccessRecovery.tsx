import { AlertCircle, RefreshCw, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProcessingStep, PipelineStage } from '@/types';
import { cn } from '@/lib/utils';

interface PartialSuccessRecoveryProps {
  documentId: string;
  documentName: string;
  processingSteps: ProcessingStep[];
  onResume: (fromStage: PipelineStage) => void;
  onRetry: () => void;
  isResuming?: boolean;
}

const STAGE_ORDER: PipelineStage[] = [
  'ingestion',
  'text_extraction',
  'language_detection',
  'chunking',
  'summarization',
  'indexing',
];

const STAGE_LABELS: Record<PipelineStage, string> = {
  ingestion: 'File Ingestion',
  text_extraction: 'Text Extraction',
  language_detection: 'Language Detection',
  chunking: 'Chunking',
  summarization: 'Summarization',
  indexing: 'Indexing',
};

export function PartialSuccessRecovery({
  documentId,
  documentName,
  processingSteps,
  onResume,
  onRetry,
  isResuming = false,
}: PartialSuccessRecoveryProps) {
  // Find the first failed stage
  const failedStep = processingSteps.find(s => s.status === 'failed');
  const failedStageIndex = failedStep 
    ? STAGE_ORDER.indexOf(failedStep.stage)
    : -1;
  
  // Count completed vs failed
  const completedSteps = processingSteps.filter(s => s.status === 'completed').length;
  const totalSteps = STAGE_ORDER.length;
  
  // Determine if we can resume
  const canResume = failedStep && failedStageIndex > 0;
  const resumeFromStage = failedStep?.stage;
  
  // Calculate preserved work
  const preservedWork = completedSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  
  const getStepStatus = (stage: PipelineStage) => {
    const step = processingSteps.find(s => s.stage === stage);
    return step?.status || 'pending';
  };
  
  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Clock className="h-4 w-4 text-primary animate-pulse" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };
  
  return (
    <Card className="border-warning/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Processing Partially Complete
            </CardTitle>
            <CardDescription className="mt-1">
              "{documentName}" encountered an issue but some work was preserved.
            </CardDescription>
          </div>
          {preservedWork > 0 && (
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
              {preservedWork}% preserved
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Pipeline Progress */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Processing Pipeline</p>
          <div className="flex items-center gap-1">
            {STAGE_ORDER.map((stage, index) => {
              const status = getStepStatus(stage);
              const isLast = index === STAGE_ORDER.length - 1;
              
              return (
                <div key={stage} className="flex items-center">
                  <div 
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded text-xs",
                      status === 'completed' && "bg-success/10 text-success",
                      status === 'failed' && "bg-destructive/10 text-destructive",
                      status === 'running' && "bg-primary/10 text-primary",
                      status === 'pending' && "bg-muted text-muted-foreground",
                    )}
                    title={STAGE_LABELS[stage]}
                  >
                    {getStepIcon(status)}
                    <span className="hidden sm:inline">{STAGE_LABELS[stage]}</span>
                  </div>
                  {!isLast && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Error Message */}
        {failedStep && (
          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <p className="text-sm font-medium text-destructive mb-1">
              Failed at: {STAGE_LABELS[failedStep.stage]}
            </p>
            <p className="text-xs text-muted-foreground">
              {failedStep.error || 'An unknown error occurred during this stage.'}
            </p>
          </div>
        )}
        
        {/* What's preserved */}
        {completedSteps > 0 && (
          <div className="p-3 bg-success/5 rounded-lg border border-success/20">
            <p className="text-sm font-medium text-success mb-1">
              Work Preserved
            </p>
            <p className="text-xs text-muted-foreground">
              {completedSteps === 1 
                ? `The ${STAGE_LABELS[STAGE_ORDER[0]]} stage was completed successfully.`
                : `${completedSteps} stages completed successfully. You won't be charged again for these steps.`
              }
            </p>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          {canResume && resumeFromStage ? (
            <Button 
              onClick={() => onResume(resumeFromStage)}
              disabled={isResuming}
              className="gap-2"
            >
              {isResuming ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Resuming...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Resume from {STAGE_LABELS[resumeFromStage]}
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={onRetry}
              disabled={isResuming}
              className="gap-2"
            >
              {isResuming ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Retry from Start
                </>
              )}
            </Button>
          )}
          
          <p className="text-xs text-muted-foreground">
            Resuming will only process the remaining steps.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
