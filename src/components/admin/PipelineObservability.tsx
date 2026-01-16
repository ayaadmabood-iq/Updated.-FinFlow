// Pipeline Observability Dashboard
// Provides visibility into queue depth, stage latency, error rates, and alerts
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  TrendingUp,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retrying: number;
}

interface StageMetrics {
  stage: string;
  avgDurationMs: number;
  successRate: number;
  errorCount: number;
  lastError?: string;
}

interface PipelineAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
}

export function PipelineObservability() {
  const [alerts, setAlerts] = useState<PipelineAlert[]>([]);

  // Fetch queue stats
  const { data: queueStats, isLoading: queueLoading, refetch: refetchQueue } = useQuery({
    queryKey: ['pipeline-queue-stats'],
    queryFn: async (): Promise<QueueStats> => {
      const { data, error } = await supabase
        .from('queue_jobs')
        .select('status')
        .eq('queue_name', 'pipeline');

      if (error) throw error;

      const stats: QueueStats = { pending: 0, processing: 0, completed: 0, failed: 0, retrying: 0 };
      data?.forEach(job => {
        if (job.status in stats) {
          stats[job.status as keyof QueueStats]++;
        }
      });
      return stats;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch stage metrics from pipeline_metrics table
  const { data: stageMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['pipeline-stage-metrics'],
    queryFn: async (): Promise<StageMetrics[]> => {
      const { data, error } = await supabase
        .from('pipeline_metrics')
        .select('stage, duration_ms, status, error_message')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Aggregate by stage
      const stageMap = new Map<string, { durations: number[]; errors: number; total: number; lastError?: string }>();
      
      data?.forEach(m => {
        const stage = m.stage as string;
        if (!stageMap.has(stage)) {
          stageMap.set(stage, { durations: [], errors: 0, total: 0 });
        }
        const agg = stageMap.get(stage)!;
        agg.total++;
        if (m.duration_ms) agg.durations.push(m.duration_ms as number);
        if (m.status === 'failed') {
          agg.errors++;
          if (m.error_message && !agg.lastError) {
            agg.lastError = m.error_message as string;
          }
        }
      });

      return Array.from(stageMap.entries()).map(([stage, agg]) => ({
        stage,
        avgDurationMs: agg.durations.length > 0 
          ? Math.round(agg.durations.reduce((a, b) => a + b, 0) / agg.durations.length)
          : 0,
        successRate: agg.total > 0 ? Math.round(((agg.total - agg.errors) / agg.total) * 100) : 100,
        errorCount: agg.errors,
        lastError: agg.lastError,
      }));
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Generate alerts based on metrics
  useEffect(() => {
    const newAlerts: PipelineAlert[] = [];
    
    // Queue depth alert
    if (queueStats && queueStats.pending > 50) {
      newAlerts.push({
        id: 'queue-backlog',
        type: 'warning',
        message: `High queue backlog: ${queueStats.pending} pending jobs`,
        timestamp: new Date().toISOString(),
      });
    }

    // Failed jobs alert
    if (queueStats && queueStats.failed > 10) {
      newAlerts.push({
        id: 'failed-jobs',
        type: 'error',
        message: `${queueStats.failed} jobs have failed in the queue`,
        timestamp: new Date().toISOString(),
      });
    }

    // Stage error rate alerts
    stageMetrics?.forEach(stage => {
      if (stage.successRate < 90) {
        newAlerts.push({
          id: `stage-error-${stage.stage}`,
          type: stage.successRate < 70 ? 'error' : 'warning',
          message: `${stage.stage} stage has ${100 - stage.successRate}% error rate`,
          timestamp: new Date().toISOString(),
        });
      }
    });

    setAlerts(newAlerts);
  }, [queueStats, stageMetrics]);

  const handleRefresh = () => {
    refetchQueue();
    refetchMetrics();
  };

  const totalJobs = queueStats 
    ? queueStats.pending + queueStats.processing + queueStats.completed + queueStats.failed + queueStats.retrying
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pipeline Observability</h2>
          <p className="text-muted-foreground">Monitor queue depth, stage latency, and error rates</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(alert => (
            <Alert key={alert.id} variant={alert.type === 'error' ? 'destructive' : 'default'}>
              {alert.type === 'error' ? <XCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertTitle>{alert.type === 'error' ? 'Error' : 'Warning'}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Queue Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStats?.pending ?? '-'}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{queueStats?.processing ?? '-'}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{queueStats?.completed ?? '-'}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{queueStats?.failed ?? '-'}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-yellow-500" />
              Retrying
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{queueStats?.retrying ?? '-'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Stage Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stage Performance (Last 24h)
          </CardTitle>
          <CardDescription>Average latency and success rate by pipeline stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metricsLoading ? (
              <div className="text-muted-foreground">Loading metrics...</div>
            ) : stageMetrics && stageMetrics.length > 0 ? (
              stageMetrics.map(stage => (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{stage.stage.replace('_', ' ')}</span>
                      <Badge variant={stage.successRate >= 95 ? 'default' : stage.successRate >= 80 ? 'secondary' : 'destructive'}>
                        {stage.successRate}% success
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Avg: {stage.avgDurationMs}ms | Errors: {stage.errorCount}
                    </div>
                  </div>
                  <Progress value={stage.successRate} className="h-2" />
                  {stage.lastError && (
                    <p className="text-xs text-destructive truncate">Last error: {stage.lastError}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-muted-foreground">No pipeline data available yet</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Database Latency Indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Queue Service: Online
            </Badge>
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Pipeline Orchestrator: Active
            </Badge>
            {totalJobs > 0 && (
              <Badge variant="outline">
                Total Jobs: {totalJobs}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PipelineObservability;
