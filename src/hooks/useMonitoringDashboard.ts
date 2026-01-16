import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type TimeRange = '1h' | '24h' | '7d' | '30d';

interface MetricSummary {
  metric_name: string;
  total_count: number;
  avg_value: number;
  min_value: number;
  max_value: number;
  sum_value: number;
}

interface Overview {
  totalApiCalls: number;
  totalApiErrors: number;
  errorRate: string;
  totalAiOperations: number;
  totalAiCost: string;
  totalErrors: number;
}

interface TimeseriesPoint {
  time_bucket: string;
  avg_value: number;
  min_value: number;
  max_value: number;
  sum_value: number;
  count_value: number;
}

interface Alert {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
}

interface DashboardData {
  summary: MetricSummary[];
  overview: Overview;
  timeseries: Record<string, TimeseriesPoint[]>;
  alerts: Alert[];
}

export function useMonitoringDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const { toast } = useToast();

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Fetch summary
      const summaryResponse = await supabase.functions.invoke('metrics-dashboard', {
        body: { action: 'summary', timeRange }
      });

      if (summaryResponse.error) {
        throw new Error(summaryResponse.error.message);
      }

      // Fetch timeseries for key metrics
      const metricsToFetch = ['api.call', 'api.error', 'ai.operation', 'ai.cost', 'error'];
      const timeseriesPromises = metricsToFetch.map(metricName =>
        supabase.functions.invoke('metrics-dashboard', {
          body: { action: 'timeseries', timeRange, metricName }
        })
      );

      const timeseriesResults = await Promise.all(timeseriesPromises);
      const timeseries: Record<string, TimeseriesPoint[]> = {};
      
      metricsToFetch.forEach((metric, index) => {
        const result = timeseriesResults[index];
        if (!result.error && result.data?.data) {
          timeseries[metric] = result.data.data;
        } else {
          timeseries[metric] = [];
        }
      });

      // Fetch alerts
      const alertsResponse = await supabase.functions.invoke('metrics-dashboard', {
        body: { action: 'alerts', timeRange }
      });

      setData({
        summary: summaryResponse.data?.summary || [],
        overview: summaryResponse.data?.overview || {
          totalApiCalls: 0,
          totalApiErrors: 0,
          errorRate: '0',
          totalAiOperations: 0,
          totalAiCost: '0',
          totalErrors: 0,
        },
        timeseries,
        alerts: alertsResponse.data?.alerts || [],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [timeRange, toast]);

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  return {
    data,
    loading,
    error,
    timeRange,
    setTimeRange,
    refresh: fetchDashboardData,
  };
}
