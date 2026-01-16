// ============= Pipeline Monitoring Hook =============
// Real-time monitoring of queue and pipeline metrics
// Provides: queue stats, stage latencies, cache metrics, alerts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

// ============= Types =============

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retrying: number;
  totalJobs: number;
  avgWaitTime: number;
}

export interface StageMetrics {
  stage: string;
  avgDuration: number;
  p95Duration: number;
  successRate: number;
  totalExecutions: number;
  recentErrors: string[];
}

export interface CacheMetrics {
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  cacheSize: number;
  avgTTL: number;
}

export interface PipelineHealth {
  status: 'healthy' | 'degraded' | 'critical';
  queueDepth: number;
  errorRate: number;
  avgLatency: number;
  cacheHitRate: number;
  alerts: PipelineAlert[];
}

export interface PipelineAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metric: string;
  threshold: number;
  currentValue: number;
  timestamp: string;
}

// ============= Queue Stats Hook =============

export function useQueueStats() {
  return useQuery({
    queryKey: ['queue-stats'],
    queryFn: async (): Promise<QueueStats> => {
      // Get queue job counts by status
      const { data: jobs, error } = await supabase
        .from('queue_jobs')
        .select('status, created_at, started_at')
        .eq('queue_name', 'pipeline');

      if (error) throw error;

      const stats = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        retrying: 0,
        totalJobs: jobs?.length || 0,
        avgWaitTime: 0,
      };

      let totalWaitTime = 0;
      let waitTimeCount = 0;

      for (const job of jobs || []) {
        const status = job.status as keyof typeof stats;
        if (status in stats && typeof stats[status] === 'number') {
          (stats as Record<string, number>)[status]++;
        }

        // Calculate wait time for jobs that have started
        if (job.started_at && job.created_at) {
          const wait = new Date(job.started_at).getTime() - new Date(job.created_at).getTime();
          totalWaitTime += wait;
          waitTimeCount++;
        }
      }

      stats.avgWaitTime = waitTimeCount > 0 ? totalWaitTime / waitTimeCount : 0;

      return stats;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

// ============= Stage Metrics Hook =============

export function useStageMetrics() {
  return useQuery({
    queryKey: ['stage-metrics'],
    queryFn: async (): Promise<StageMetrics[]> => {
      // Get recent pipeline metrics
      const { data: metrics, error } = await supabase
        .from('pipeline_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Aggregate by stage
      const stageMap = new Map<string, {
        durations: number[];
        successes: number;
        failures: number;
        errors: string[];
      }>();

      for (const m of metrics || []) {
        const stage = m.stage;
        if (!stageMap.has(stage)) {
          stageMap.set(stage, { durations: [], successes: 0, failures: 0, errors: [] });
        }
        const data = stageMap.get(stage)!;
        
        if (m.duration_ms) data.durations.push(m.duration_ms);
        if (m.status === 'completed') data.successes++;
        else if (m.status === 'failed') {
          data.failures++;
          if (m.error_message) data.errors.push(m.error_message);
        }
      }

      const result: StageMetrics[] = [];
      for (const [stage, data] of stageMap) {
        const sorted = [...data.durations].sort((a, b) => a - b);
        const total = data.successes + data.failures;
        
        result.push({
          stage,
          avgDuration: data.durations.length > 0 
            ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length 
            : 0,
          p95Duration: sorted.length > 0 
            ? sorted[Math.floor(sorted.length * 0.95)] 
            : 0,
          successRate: total > 0 ? (data.successes / total) * 100 : 100,
          totalExecutions: total,
          recentErrors: data.errors.slice(-5),
        });
      }

      return result.sort((a, b) => {
        const order = ['ingestion', 'extraction', 'language', 'chunking', 'summarization', 'indexing'];
        return order.indexOf(a.stage) - order.indexOf(b.stage);
      });
    },
    refetchInterval: 10000,
  });
}

// ============= Cache Metrics Hook =============

export function useCacheMetrics() {
  return useQuery({
    queryKey: ['cache-metrics'],
    queryFn: async (): Promise<CacheMetrics> => {
      // Get cache entries stats
      const { data: entries, error } = await supabase
        .from('cache_entries')
        .select('hit_count, ttl_seconds, created_at, expires_at');

      if (error) throw error;

      const totalHits = entries?.reduce((sum, e) => sum + (e.hit_count || 0), 0) || 0;
      const cacheSize = entries?.length || 0;
      
      // Estimate misses based on pipeline metrics without cache hits
      const { count: totalOperations } = await supabase
        .from('pipeline_metrics')
        .select('*', { count: 'exact', head: true });

      const estimatedMisses = Math.max(0, (totalOperations || 0) - totalHits);
      const hitRate = (totalHits + estimatedMisses) > 0 
        ? (totalHits / (totalHits + estimatedMisses)) * 100 
        : 0;

      const avgTTL = entries?.length 
        ? entries.reduce((sum, e) => sum + (e.ttl_seconds || 3600), 0) / entries.length 
        : 3600;

      return {
        hitRate,
        totalHits,
        totalMisses: estimatedMisses,
        cacheSize,
        avgTTL,
      };
    },
    refetchInterval: 30000,
  });
}

// ============= Pipeline Health Hook =============

export function usePipelineHealth() {
  const { data: queueStats } = useQueueStats();
  const { data: stageMetrics } = useStageMetrics();
  const { data: cacheMetrics } = useCacheMetrics();

  return useQuery({
    queryKey: ['pipeline-health', queueStats, stageMetrics, cacheMetrics],
    queryFn: async (): Promise<PipelineHealth> => {
      const alerts: PipelineAlert[] = [];
      
      // Calculate overall metrics
      const queueDepth = (queueStats?.pending || 0) + (queueStats?.retrying || 0);
      const errorRate = stageMetrics?.length 
        ? 100 - (stageMetrics.reduce((sum, s) => sum + s.successRate, 0) / stageMetrics.length)
        : 0;
      const avgLatency = stageMetrics?.length
        ? stageMetrics.reduce((sum, s) => sum + s.avgDuration, 0) / stageMetrics.length
        : 0;
      const cacheHitRate = cacheMetrics?.hitRate || 0;

      // Generate alerts based on thresholds
      if (queueDepth > 100) {
        alerts.push({
          id: 'queue-backlog',
          severity: queueDepth > 200 ? 'critical' : 'warning',
          message: `Queue backlog is high: ${queueDepth} pending jobs`,
          metric: 'queue_depth',
          threshold: 100,
          currentValue: queueDepth,
          timestamp: new Date().toISOString(),
        });
      }

      if (errorRate > 5) {
        alerts.push({
          id: 'error-rate',
          severity: errorRate > 10 ? 'critical' : 'warning',
          message: `Error rate is elevated: ${errorRate.toFixed(1)}%`,
          metric: 'error_rate',
          threshold: 5,
          currentValue: errorRate,
          timestamp: new Date().toISOString(),
        });
      }

      if (avgLatency > 30000) {
        alerts.push({
          id: 'latency',
          severity: avgLatency > 60000 ? 'critical' : 'warning',
          message: `Average latency is high: ${(avgLatency / 1000).toFixed(1)}s`,
          metric: 'avg_latency',
          threshold: 30000,
          currentValue: avgLatency,
          timestamp: new Date().toISOString(),
        });
      }

      if (cacheHitRate < 80 && cacheMetrics && cacheMetrics.totalHits > 100) {
        alerts.push({
          id: 'cache-hit-rate',
          severity: cacheHitRate < 50 ? 'critical' : 'warning',
          message: `Cache hit rate is low: ${cacheHitRate.toFixed(1)}%`,
          metric: 'cache_hit_rate',
          threshold: 80,
          currentValue: cacheHitRate,
          timestamp: new Date().toISOString(),
        });
      }

      // Determine overall status
      let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (alerts.some(a => a.severity === 'critical')) {
        status = 'critical';
      } else if (alerts.some(a => a.severity === 'warning')) {
        status = 'degraded';
      }

      return {
        status,
        queueDepth,
        errorRate,
        avgLatency,
        cacheHitRate,
        alerts,
      };
    },
    enabled: !!(queueStats && stageMetrics && cacheMetrics),
    refetchInterval: 5000,
  });
}

// ============= Real-time Metrics Subscription =============

export function usePipelineRealtimeUpdates() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel('pipeline-metrics-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pipeline_metrics',
        },
        () => {
          // Invalidate metrics queries on any change
          queryClient.invalidateQueries({ queryKey: ['stage-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['pipeline-health'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_jobs',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['queue-stats'] });
          queryClient.invalidateQueries({ queryKey: ['pipeline-health'] });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { isConnected };
}

// ============= Pipeline Actions =============

export function usePipelineActions() {
  const queryClient = useQueryClient();

  const retryFailedJobs = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('pipeline-orchestrator', {
        body: { action: 'retry-all-failed' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] });
    },
  });

  const clearCompletedJobs = useMutation({
    mutationFn: async (olderThanHours: number = 24) => {
      const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('queue_jobs')
        .delete()
        .eq('status', 'completed')
        .lt('completed_at', cutoff);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] });
    },
  });

  const pauseQueue = useMutation({
    mutationFn: async () => {
      // Set all pending jobs to a paused status
      const { error } = await supabase
        .from('queue_jobs')
        .update({ status: 'retrying', scheduled_at: new Date(Date.now() + 86400000).toISOString() })
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] });
    },
  });

  return {
    retryFailedJobs,
    clearCompletedJobs,
    pauseQueue,
  };
}
