import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

interface StageMetrics {
  stage: string;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  avg_duration_ms: number;
  p95_duration_ms: number;
  last_run_at: string | null;
}

export function StageMetricsDashboard() {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['stage-metrics'],
    queryFn: async (): Promise<StageMetrics[]> => {
      const { data, error } = await supabase
        .from('v_stage_failure_rates')
        .select('*');
      
      if (error) throw error;
      return (data || []) as StageMetrics[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stage Metrics</CardTitle>
          <CardDescription>Loading metrics...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stage Metrics</CardTitle>
          <CardDescription className="text-destructive">Failed to load metrics</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const stageLabels: Record<string, string> = {
    ingestion: 'Ingestion',
    text_extraction: 'Extraction',
    language_detection: 'Language',
    chunking: 'Chunking',
    summarization: 'Summary',
    indexing: 'Indexing',
  };

  const getSuccessRate = (m: StageMetrics) => 
    m.total_runs > 0 ? (m.successful_runs / m.total_runs) * 100 : 0;

  const chartData = (metrics || []).map(m => ({
    stage: stageLabels[m.stage] || m.stage,
    successRate: getSuccessRate(m),
    avgDuration: m.avg_duration_ms / 1000,
    p95Duration: m.p95_duration_ms / 1000,
    totalRuns: m.total_runs,
    failures: m.failed_runs,
  }));

  const overallSuccessRate = metrics && metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.successful_runs, 0) / 
      metrics.reduce((sum, m) => sum + m.total_runs, 0) * 100
    : 0;

  const totalProcessed = metrics?.reduce((sum, m) => sum + m.total_runs, 0) || 0;
  const totalFailures = metrics?.reduce((sum, m) => sum + m.failed_runs, 0) || 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Runs (30d)</p>
                <p className="text-2xl font-bold">{totalProcessed.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{overallSuccessRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Total Failures</p>
                <p className="text-2xl font-bold">{totalFailures.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Processing</p>
                <p className="text-2xl font-bold">
                  {metrics && metrics.length > 0
                    ? ((metrics.reduce((sum, m) => sum + m.avg_duration_ms, 0) / metrics.length) / 1000).toFixed(1)
                    : '—'}s
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stage Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Stage Performance</CardTitle>
          <CardDescription>Success rate and latency by processing stage (last 30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis dataKey="stage" type="category" width={80} />
                <RechartsTooltip
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'successRate') return [`${value.toFixed(1)}%`, 'Success Rate'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="successRate" name="Success Rate" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.successRate >= 95 
                        ? 'hsl(var(--chart-1))' 
                        : entry.successRate >= 80 
                          ? 'hsl(var(--chart-2))' 
                          : 'hsl(var(--destructive))'
                      } 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No metrics data available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Stage Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Stage Details</CardTitle>
          <CardDescription>Detailed metrics per processing stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(metrics || []).map(m => {
              const successRate = getSuccessRate(m);
              return (
                <div key={m.stage} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{stageLabels[m.stage] || m.stage}</h4>
                      <Badge variant={successRate >= 95 ? 'secondary' : successRate >= 80 ? 'outline' : 'destructive'}>
                        {successRate.toFixed(1)}% success
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {m.total_runs} total runs
                    </span>
                  </div>
                  
                  <Progress value={successRate} className="h-2 mb-2" />
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Successful:</span>
                      <span className="ml-1 font-medium text-green-600">{m.successful_runs}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Failed:</span>
                      <span className="ml-1 font-medium text-destructive">{m.failed_runs}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg Duration:</span>
                      <span className="ml-1 font-medium">{(m.avg_duration_ms / 1000).toFixed(2)}s</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">P95 Duration:</span>
                      <span className="ml-1 font-medium">{(m.p95_duration_ms / 1000).toFixed(2)}s</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
