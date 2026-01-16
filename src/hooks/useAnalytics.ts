import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface AnalyticsData {
  overview: {
    totalProjects: number;
    totalDatasets: number;
    totalTrainingJobs: number;
    totalTokens: number;
    successRate: number;
  };
  trainingTrends: {
    date: string;
    completed: number;
    failed: number;
    pending: number;
  }[];
  costByProject: {
    projectName: string;
    cost: number;
    tokens: number;
  }[];
  tokenUsage: {
    date: string;
    tokens: number;
  }[];
  modelPerformance: {
    model: string;
    jobCount: number;
    avgAccuracy: number;
    avgLoss: number;
    successRate: number;
  }[];
}

export function useAnalytics(dateRange: { start: Date; end: Date }) {
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel('analytics-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'training_jobs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['analytics'] });
          setLastUpdated(new Date());
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'training_datasets' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['analytics'] });
          setLastUpdated(new Date());
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
    setLastUpdated(new Date());
  }, [queryClient]);

  const query = useQuery({
    queryKey: ['analytics', dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async (): Promise<AnalyticsData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch all data in parallel
      const [projectsRes, datasetsRes, jobsRes, metricsRes] = await Promise.all([
        supabase.from('projects').select('id, name, created_at').eq('owner_id', user.id),
        supabase.from('training_datasets').select('id, project_id, total_tokens, created_at, status').eq('user_id', user.id),
        supabase.from('training_jobs').select('id, project_id, base_model, status, created_at, completed_at, result_metrics').eq('user_id', user.id),
        supabase.from('training_metrics').select('job_id, accuracy, loss'),
      ]);

      const projects = projectsRes.data || [];
      const datasets = datasetsRes.data || [];
      const jobs = jobsRes.data || [];
      const metrics = metricsRes.data || [];

      // Calculate overview
      const totalTokens = datasets.reduce((sum, d) => sum + (d.total_tokens || 0), 0);
      const completedJobs = jobs.filter(j => j.status === 'completed').length;
      const failedJobs = jobs.filter(j => j.status === 'failed').length;
      const successRate = jobs.length > 0 ? (completedJobs / jobs.length) * 100 : 0;

      // Training trends by month
      const trendsByMonth: Record<string, { completed: number; failed: number; pending: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const key = format(date, 'yyyy-MM');
        trendsByMonth[key] = { completed: 0, failed: 0, pending: 0 };
      }

      jobs.forEach(job => {
        const key = format(new Date(job.created_at), 'yyyy-MM');
        if (trendsByMonth[key]) {
          if (job.status === 'completed') trendsByMonth[key].completed++;
          else if (job.status === 'failed') trendsByMonth[key].failed++;
          else trendsByMonth[key].pending++;
        }
      });

      const trainingTrends = Object.entries(trendsByMonth).map(([date, data]) => ({
        date: format(new Date(date + '-01'), 'MMM yyyy'),
        ...data,
      }));

      // Cost by project (estimated)
      const projectMap = new Map(projects.map(p => [p.id, p.name]));
      const costByProjectMap: Record<string, { cost: number; tokens: number }> = {};

      datasets.forEach(dataset => {
        const projectName = projectMap.get(dataset.project_id) || 'Unknown';
        if (!costByProjectMap[projectName]) {
          costByProjectMap[projectName] = { cost: 0, tokens: 0 };
        }
        const tokens = dataset.total_tokens || 0;
        costByProjectMap[projectName].tokens += tokens;
        // Rough estimate: $0.008 per 1K tokens
        costByProjectMap[projectName].cost += (tokens / 1000) * 0.008;
      });

      const costByProject = Object.entries(costByProjectMap)
        .map(([projectName, data]) => ({ projectName, ...data }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 10);

      // Token usage by month
      const tokensByMonth: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const key = format(date, 'yyyy-MM');
        tokensByMonth[key] = 0;
      }

      datasets.forEach(dataset => {
        const key = format(new Date(dataset.created_at), 'yyyy-MM');
        if (tokensByMonth[key] !== undefined) {
          tokensByMonth[key] += dataset.total_tokens || 0;
        }
      });

      const tokenUsage = Object.entries(tokensByMonth).map(([date, tokens]) => ({
        date: format(new Date(date + '-01'), 'MMM yyyy'),
        tokens,
      }));

      // Model performance
      const modelStats: Record<string, { jobs: number; successCount: number; accuracies: number[]; losses: number[] }> = {};

      jobs.forEach(job => {
        const model = job.base_model;
        if (!modelStats[model]) {
          modelStats[model] = { jobs: 0, successCount: 0, accuracies: [], losses: [] };
        }
        modelStats[model].jobs++;
        if (job.status === 'completed') {
          modelStats[model].successCount++;
          const jobMetrics = metrics.filter(m => m.job_id === job.id);
          if (jobMetrics.length > 0) {
            const lastMetric = jobMetrics[jobMetrics.length - 1];
            if (lastMetric.accuracy != null) modelStats[model].accuracies.push(Number(lastMetric.accuracy));
            if (lastMetric.loss != null) modelStats[model].losses.push(Number(lastMetric.loss));
          }
        }
      });

      const modelPerformance = Object.entries(modelStats)
        .map(([model, stats]) => ({
          model,
          jobCount: stats.jobs,
          avgAccuracy: stats.accuracies.length > 0
            ? stats.accuracies.reduce((a, b) => a + b, 0) / stats.accuracies.length
            : 0,
          avgLoss: stats.losses.length > 0
            ? stats.losses.reduce((a, b) => a + b, 0) / stats.losses.length
            : 0,
          successRate: stats.jobs > 0 ? (stats.successCount / stats.jobs) * 100 : 0,
        }))
        .sort((a, b) => b.jobCount - a.jobCount);

      return {
        overview: {
          totalProjects: projects.length,
          totalDatasets: datasets.length,
          totalTrainingJobs: jobs.length,
          totalTokens,
          successRate,
        },
        trainingTrends,
        costByProject,
        tokenUsage,
        modelPerformance,
      };
    },
    refetchInterval: 30000, // Fallback polling every 30 seconds
  });

  return {
    ...query,
    isLive,
    lastUpdated,
    refresh,
  };
}
