// ============= Infrastructure Monitoring Dashboard =============
// Admin page for monitoring pipeline health, queue stats, and performance

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  RefreshCw,
  Server,
  Zap,
  TrendingUp,
  XCircle,
  Pause,
  Play,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import {
  useQueueStats,
  useStageMetrics,
  useCacheMetrics,
  usePipelineHealth,
  usePipelineRealtimeUpdates,
  usePipelineActions,
} from '@/hooks/usePipelineMonitoring';
import { cn } from '@/lib/utils';

export default function Infrastructure() {
  const { t } = useTranslation();
  const { data: queueStats, isLoading: queueLoading, refetch: refetchQueue } = useQueueStats();
  const { data: stageMetrics, isLoading: stageLoading, refetch: refetchStage } = useStageMetrics();
  const { data: cacheMetrics, isLoading: cacheLoading, refetch: refetchCache } = useCacheMetrics();
  const { data: health, isLoading: healthLoading } = usePipelineHealth();
  const { isConnected } = usePipelineRealtimeUpdates();
  const { retryFailedJobs, clearCompletedJobs, pauseQueue } = usePipelineActions();

  const handleRefreshAll = () => {
    refetchQueue();
    refetchStage();
    refetchCache();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Infrastructure Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time pipeline health, queue status, and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={isConnected ? 'default' : 'secondary'} className="gap-1">
            <Activity className={cn("h-3 w-3", isConnected && "animate-pulse")} />
            {isConnected ? 'Live' : 'Disconnected'}
          </Badge>
          <Button onClick={handleRefreshAll} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Overview */}
      <Card className={cn(
        "border-2",
        health?.status === 'healthy' && "border-green-500/50 bg-green-500/5",
        health?.status === 'degraded' && "border-yellow-500/50 bg-yellow-500/5",
        health?.status === 'critical' && "border-red-500/50 bg-red-500/5"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {health?.status === 'healthy' && <CheckCircle className="h-5 w-5 text-green-500" />}
              {health?.status === 'degraded' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
              {health?.status === 'critical' && <XCircle className="h-5 w-5 text-red-500" />}
              System Status: {health?.status?.toUpperCase() || 'Unknown'}
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => retryFailedJobs.mutate()}
                disabled={retryFailedJobs.isPending}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Retry Failed
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => clearCompletedJobs.mutate(24)}
                disabled={clearCompletedJobs.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clean Up
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <MetricCard 
              label="Queue Depth" 
              value={health?.queueDepth || 0} 
              threshold={100}
              unit="jobs"
              icon={Server}
            />
            <MetricCard 
              label="Error Rate" 
              value={health?.errorRate || 0} 
              threshold={5}
              unit="%"
              icon={AlertTriangle}
              invert
            />
            <MetricCard 
              label="Avg Latency" 
              value={(health?.avgLatency || 0) / 1000} 
              threshold={30}
              unit="s"
              icon={Clock}
              invert
            />
            <MetricCard 
              label="Cache Hit Rate" 
              value={health?.cacheHitRate || 0} 
              threshold={80}
              unit="%"
              icon={Zap}
            />
          </div>

          {/* Alerts */}
          {health?.alerts && health.alerts.length > 0 && (
            <div className="mt-4 space-y-2">
              {health.alerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={cn(
                    "p-3 rounded-lg flex items-center gap-3",
                    alert.severity === 'critical' && "bg-red-500/10 border border-red-500/30",
                    alert.severity === 'warning' && "bg-yellow-500/10 border border-yellow-500/30",
                    alert.severity === 'info' && "bg-blue-500/10 border border-blue-500/30"
                  )}
                >
                  <AlertTriangle className={cn(
                    "h-4 w-4",
                    alert.severity === 'critical' && "text-red-500",
                    alert.severity === 'warning' && "text-yellow-500",
                    alert.severity === 'info' && "text-blue-500"
                  )} />
                  <span className="flex-1">{alert.message}</span>
                  <Badge variant="outline">{alert.metric}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">Queue Stats</TabsTrigger>
          <TabsTrigger value="stages">Stage Performance</TabsTrigger>
          <TabsTrigger value="cache">Cache Metrics</TabsTrigger>
        </TabsList>

        {/* Queue Stats Tab */}
        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Queue Statistics
              </CardTitle>
              <CardDescription>Current job distribution and processing status</CardDescription>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-5 gap-4">
                    <QueueStatCard 
                      label="Pending" 
                      value={queueStats?.pending || 0} 
                      color="bg-blue-500" 
                    />
                    <QueueStatCard 
                      label="Processing" 
                      value={queueStats?.processing || 0} 
                      color="bg-yellow-500" 
                    />
                    <QueueStatCard 
                      label="Completed" 
                      value={queueStats?.completed || 0} 
                      color="bg-green-500" 
                    />
                    <QueueStatCard 
                      label="Failed" 
                      value={queueStats?.failed || 0} 
                      color="bg-red-500" 
                    />
                    <QueueStatCard 
                      label="Retrying" 
                      value={queueStats?.retrying || 0} 
                      color="bg-orange-500" 
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Queue Progress</span>
                      <span className="text-muted-foreground">
                        {queueStats?.completed || 0} / {queueStats?.totalJobs || 0} completed
                      </span>
                    </div>
                    <Progress 
                      value={queueStats?.totalJobs ? ((queueStats.completed || 0) / queueStats.totalJobs) * 100 : 0} 
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <div className="text-sm text-muted-foreground">Average Wait Time</div>
                      <div className="text-2xl font-bold">
                        {((queueStats?.avgWaitTime || 0) / 1000).toFixed(1)}s
                      </div>
                    </div>
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stage Performance Tab */}
        <TabsContent value="stages">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Stage Performance
              </CardTitle>
              <CardDescription>Execution time and success rates by pipeline stage</CardDescription>
            </CardHeader>
            <CardContent>
              {stageLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {stageMetrics?.map((stage) => (
                    <div key={stage.stage} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium capitalize">{stage.stage}</div>
                        <Badge variant={stage.successRate >= 95 ? 'default' : stage.successRate >= 80 ? 'secondary' : 'destructive'}>
                          {stage.successRate.toFixed(1)}% success
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Avg Duration</div>
                          <div className="font-medium">{(stage.avgDuration / 1000).toFixed(2)}s</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">P95 Duration</div>
                          <div className="font-medium">{(stage.p95Duration / 1000).toFixed(2)}s</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Executions</div>
                          <div className="font-medium">{stage.totalExecutions}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Recent Errors</div>
                          <div className="font-medium">{stage.recentErrors.length}</div>
                        </div>
                      </div>
                      {stage.recentErrors.length > 0 && (
                        <div className="mt-3 p-2 rounded bg-red-500/10 text-sm text-red-500">
                          Last error: {stage.recentErrors[stage.recentErrors.length - 1]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cache Metrics Tab */}
        <TabsContent value="cache">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Cache Performance
              </CardTitle>
              <CardDescription>Redis cache hit rates and storage statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {cacheLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Cache Hit Rate</span>
                        <span className={cn(
                          "font-medium",
                          (cacheMetrics?.hitRate || 0) >= 80 ? "text-green-500" : "text-yellow-500"
                        )}>
                          {(cacheMetrics?.hitRate || 0).toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={cacheMetrics?.hitRate || 0} className="h-3" />
                      <p className="text-xs text-muted-foreground">
                        Target: &gt;80%
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-green-500/10 text-center">
                        <div className="text-2xl font-bold text-green-500">{cacheMetrics?.totalHits || 0}</div>
                        <div className="text-sm text-muted-foreground">Cache Hits</div>
                      </div>
                      <div className="p-4 rounded-lg bg-red-500/10 text-center">
                        <div className="text-2xl font-bold text-red-500">{cacheMetrics?.totalMisses || 0}</div>
                        <div className="text-sm text-muted-foreground">Cache Misses</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border">
                      <div className="text-sm text-muted-foreground">Cache Size</div>
                      <div className="text-2xl font-bold">{cacheMetrics?.cacheSize || 0}</div>
                      <div className="text-xs text-muted-foreground">entries</div>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <div className="text-sm text-muted-foreground">Average TTL</div>
                      <div className="text-2xl font-bold">{((cacheMetrics?.avgTTL || 0) / 3600).toFixed(1)}h</div>
                      <div className="text-xs text-muted-foreground">time-to-live</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============= Sub-components =============

function MetricCard({ 
  label, 
  value, 
  threshold, 
  unit, 
  icon: Icon,
  invert = false 
}: { 
  label: string; 
  value: number; 
  threshold: number; 
  unit: string; 
  icon: React.ComponentType<{ className?: string }>;
  invert?: boolean;
}) {
  const isGood = invert ? value <= threshold : value >= threshold;
  
  return (
    <div className={cn(
      "p-4 rounded-lg border",
      isGood ? "bg-green-500/5 border-green-500/30" : "bg-yellow-500/5 border-yellow-500/30"
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", isGood ? "text-green-500" : "text-yellow-500")} />
      </div>
      <div className="text-2xl font-bold">
        {typeof value === 'number' ? value.toFixed(1) : value}{unit}
      </div>
      <div className="text-xs text-muted-foreground">
        Target: {invert ? '≤' : '≥'}{threshold}{unit}
      </div>
    </div>
  );
}

function QueueStatCard({ 
  label, 
  value, 
  color 
}: { 
  label: string; 
  value: number; 
  color: string;
}) {
  return (
    <div className="p-4 rounded-lg border bg-card text-center">
      <div className={cn("w-3 h-3 rounded-full mx-auto mb-2", color)} />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
