import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import { 
  RefreshCw, 
  Activity, 
  AlertTriangle, 
  DollarSign, 
  Zap, 
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useMonitoringDashboard, TimeRange } from '@/hooks/useMonitoringDashboard';
import { format } from 'date-fns';

export function MonitoringDashboard() {
  const { data, loading, error, timeRange, setTimeRange, refresh } = useMonitoringDashboard();

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (timeRange === '1h') {
      return format(date, 'HH:mm');
    } else if (timeRange === '24h') {
      return format(date, 'HH:mm');
    } else if (timeRange === '7d') {
      return format(date, 'MM/dd HH:mm');
    }
    return format(date, 'MM/dd');
  };

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '1h', label: '1 Hour' },
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
  ];

  const getSeverityColor = (severity: 'info' | 'warning' | 'critical') => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Error loading dashboard: {error}</p>
          </div>
          <Button onClick={refresh} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const overview = data?.overview;
  const timeseries = data?.timeseries || {};
  const alerts = data?.alerts || [];

  // Prepare chart data
  const apiCallsData = (timeseries['api.call'] || []).map(point => ({
    time: formatTimestamp(point.time_bucket),
    calls: point.count_value,
    avgDuration: point.avg_value,
  })).reverse();

  const errorData = (timeseries['api.error'] || []).map(point => ({
    time: formatTimestamp(point.time_bucket),
    errors: point.count_value,
  })).reverse();

  const aiOperationsData = (timeseries['ai.operation'] || []).map(point => ({
    time: formatTimestamp(point.time_bucket),
    operations: point.count_value,
  })).reverse();

  const aiCostData = (timeseries['ai.cost'] || []).map(point => ({
    time: formatTimestamp(point.time_bucket),
    cost: Number(point.sum_value.toFixed(4)),
  })).reverse();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Monitoring Dashboard</h2>
          <p className="text-muted-foreground">Real-time system metrics and alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-card">
            {timeRangeOptions.map((option) => (
              <Button
                key={option.value}
                variant={timeRange === option.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(option.value)}
                className="rounded-none first:rounded-l-lg last:rounded-r-lg"
              >
                {option.label}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={getSeverityColor(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <span className="text-sm">{alert.message}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(alert.timestamp), 'HH:mm:ss')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalApiCalls.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total requests in {timeRange}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.errorRate}%</div>
            <p className="text-xs text-muted-foreground">
              {overview?.totalApiErrors} errors / {overview?.totalApiCalls} calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Operations</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalAiOperations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total AI calls in {timeRange}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overview?.totalAiCost}</div>
            <p className="text-xs text-muted-foreground">
              Total AI spend in {timeRange}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="traffic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="ai">AI Usage</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="traffic">
          <Card>
            <CardHeader>
              <CardTitle>API Traffic</CardTitle>
              <CardDescription>Request volume over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {apiCallsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={apiCallsData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="time" 
                        className="text-xs"
                        tick={{ fill: 'currentColor' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'currentColor' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="calls" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary)/.2)"
                        name="API Calls"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No data available for this time range
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Error Tracking</CardTitle>
              <CardDescription>API and application errors over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {errorData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={errorData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="time" 
                        className="text-xs"
                        tick={{ fill: 'currentColor' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'currentColor' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="errors" 
                        fill="hsl(var(--destructive))"
                        name="Errors"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      <p className="text-muted-foreground">No errors in this time range</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI Operations</CardTitle>
              <CardDescription>AI model usage and operations over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {aiOperationsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={aiOperationsData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="time" 
                        className="text-xs"
                        tick={{ fill: 'currentColor' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'currentColor' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="operations" 
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        dot={false}
                        name="AI Operations"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No AI operations in this time range
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle>AI Costs</CardTitle>
              <CardDescription>AI spending over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {aiCostData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={aiCostData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="time" 
                        className="text-xs"
                        tick={{ fill: 'currentColor' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'currentColor' }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="cost" 
                        stroke="hsl(var(--chart-4))"
                        fill="hsl(var(--chart-4)/.2)"
                        name="AI Cost ($)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No cost data in this time range
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Metrics Summary Table */}
      {data?.summary && data.summary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Metrics Summary</CardTitle>
            <CardDescription>Aggregated metrics for the selected time range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Metric</th>
                    <th className="text-right py-2 px-3 font-medium">Count</th>
                    <th className="text-right py-2 px-3 font-medium">Avg</th>
                    <th className="text-right py-2 px-3 font-medium">Min</th>
                    <th className="text-right py-2 px-3 font-medium">Max</th>
                    <th className="text-right py-2 px-3 font-medium">Sum</th>
                  </tr>
                </thead>
                <tbody>
                  {data.summary.slice(0, 20).map((metric, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-2 px-3 font-mono text-xs">{metric.metric_name}</td>
                      <td className="text-right py-2 px-3">{metric.total_count.toLocaleString()}</td>
                      <td className="text-right py-2 px-3">{Number(metric.avg_value).toFixed(2)}</td>
                      <td className="text-right py-2 px-3">{Number(metric.min_value).toFixed(2)}</td>
                      <td className="text-right py-2 px-3">{Number(metric.max_value).toFixed(2)}</td>
                      <td className="text-right py-2 px-3">{Number(metric.sum_value).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
