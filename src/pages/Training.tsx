import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useApiKeyGuard } from '@/hooks/useApiKeyGuard';
import { ApiKeyRequiredBanner } from '@/components/training/ApiKeyRequiredBanner';
import {
  Cpu,
  Plus,
  Loader2,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

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
}

const statusConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending' },
  queued: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Queued' },
  uploading: { icon: Loader2, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Uploading' },
  validating: { icon: Loader2, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Validating' },
  running: { icon: Play, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Running' },
  training: { icon: Play, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Training' },
  paused: { icon: Pause, color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Paused' },
  completed: { icon: CheckCircle2, color: 'bg-green-100 text-green-800 border-green-200', label: 'Completed' },
  failed: { icon: XCircle, color: 'bg-red-100 text-red-800 border-red-200', label: 'Failed' },
  cancelled: { icon: XCircle, color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Cancelled' },
};

export default function Training() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const { hasValidKey, isLoading: keyLoading } = useApiKeyGuard();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['training-jobs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('training_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TrainingJob[];
    },
  });

  const filteredJobs = jobs?.filter((job) =>
    job.base_model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.status.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || statusConfig.pending;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* API Key Required Banner */}
        <ApiKeyRequiredBanner show={!keyLoading && !hasValidKey} />

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Cpu className="h-6 w-6" />
              {t('training.title', 'Training Jobs')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('training.description', 'Manage and monitor your model training jobs')}
            </p>
          </div>
          <Button asChild disabled={!hasValidKey}>
            <Link to="/projects">
              <Plus className="h-4 w-4 me-2" />
              {t('training.newJob', 'New Training Job')}
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('training.searchPlaceholder', 'Search training jobs...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>

        {/* Jobs List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Cpu className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery
                  ? t('training.noResults', 'No training jobs found')
                  : t('training.noJobs', 'No Training Jobs Yet')}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-4">
                {searchQuery
                  ? t('training.tryDifferentSearch', 'Try a different search term')
                  : t('training.noJobsDesc', 'Create a training dataset in a project and start your first training job.')}
              </p>
              {!searchQuery && (
                <Button asChild>
                  <Link to="/projects">
                    <Plus className="h-4 w-4 me-2" />
                    {t('training.goToProjects', 'Go to Projects')}
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredJobs.map((job) => {
              const config = getStatusConfig(job.status);
              const StatusIcon = config.icon;

              return (
                <Card key={job.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base flex items-center gap-2">
                          <span className="truncate">{job.base_model}</span>
                          <Badge variant="outline" className={config.color}>
                            <StatusIcon className="h-3 w-3 me-1" />
                            {config.label}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {t('training.provider', 'Provider')}: {job.provider} • {t('training.created', 'Created')}: {format(new Date(job.created_at), 'PPp')}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/training/${job.id}`}>
                              <ExternalLink className="h-4 w-4 me-2" />
                              {t('training.viewDetails', 'View Details')}
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Progress */}
                    {job.status === 'running' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('training.progress', 'Progress')}</span>
                          <span className="font-medium">{job.progress_percent}%</span>
                        </div>
                        <Progress value={job.progress_percent} className="h-2" />
                      </div>
                    )}

                    {/* Error */}
                    {job.status === 'failed' && job.error_message && (
                      <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                        {job.error_message}
                      </div>
                    )}

                    {/* Completed Model ID */}
                    {job.status === 'completed' && job.fine_tuned_model_id && (
                      <div className="p-2 bg-muted/50 rounded-md">
                        <p className="text-xs text-muted-foreground mb-1">{t('training.modelId', 'Model ID')}</p>
                        <code className="text-xs font-mono truncate block">
                          {job.fine_tuned_model_id}
                        </code>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <Link to={`/training/${job.id}`}>
                          {t('training.viewDetails', 'View Details')}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
