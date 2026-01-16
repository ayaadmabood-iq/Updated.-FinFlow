import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useRealtimeTrainingJobs } from '@/hooks/useAutoTraining';
import type { TrainingJob, TrainingJobStatus } from '@/services/autoTrainingService';
import { TrainingProgress } from './TrainingProgress';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Brain,
  ChevronRight,
} from 'lucide-react';

interface TrainingJobsListProps {
  projectId: string;
}

const statusConfig: Record<TrainingJobStatus, { color: string; icon: React.ReactNode }> = {
  pending: { color: 'bg-gray-100 text-gray-700', icon: <Clock className="h-3 w-3" /> },
  uploading: { color: 'bg-blue-100 text-blue-700', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  validating: { color: 'bg-yellow-100 text-yellow-700', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  queued: { color: 'bg-purple-100 text-purple-700', icon: <Clock className="h-3 w-3" /> },
  training: { color: 'bg-blue-100 text-blue-700', icon: <Zap className="h-3 w-3 animate-pulse" /> },
  completed: { color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
};

export function TrainingJobsList({ projectId }: TrainingJobsListProps) {
  const { t } = useTranslation();
  const { jobs, isLoading } = useRealtimeTrainingJobs(projectId);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (selectedJobId) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedJobId(null)}
          className="mb-2"
        >
          ← {t('training.backToList', 'Back to all jobs')}
        </Button>
        <TrainingProgress jobId={selectedJobId} />
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {t('training.noJobs', 'No Training Jobs')}
          </h3>
          <p className="text-muted-foreground">
            {t('training.noJobsDesc', 'Training jobs will appear here when you start training a dataset.')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          {t('training.trainingJobs', 'Training Jobs')} ({jobs.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onClick={() => setSelectedJobId(job.id)} />
        ))}
      </CardContent>
    </Card>
  );
}

function JobCard({ job, onClick }: { job: TrainingJob; onClick: () => void }) {
  const config = statusConfig[job.status];
  const isActive = ['pending', 'uploading', 'validating', 'queued', 'training'].includes(job.status);

  return (
    <div
      className="p-4 border rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{job.baseModel}</span>
            <Badge className={`${config.color} text-xs`}>
              {config.icon}
              <span className="ml-1 capitalize">{job.status}</span>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {job.currentStep || 'Processing...'}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>

      {isActive && (
        <Progress value={job.progressPercent} className="h-2" />
      )}

      {job.status === 'completed' && job.fineTunedModelId && (
        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs font-mono truncate">
          {job.fineTunedModelId}
        </div>
      )}

      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span>
          {new Date(job.createdAt).toLocaleDateString()}
        </span>
        {job.autoStarted && (
          <Badge variant="outline" className="text-xs">Auto</Badge>
        )}
      </div>
    </div>
  );
}
