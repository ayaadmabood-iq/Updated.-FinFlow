import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle, Target, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DocumentTrend } from '@/services/analyticsService';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface TrendChartProps {
  trends: DocumentTrend[];
  isLoading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const trendTypeConfig = {
  theme: { icon: Target, color: 'hsl(var(--primary))', label: 'Theme' },
  risk: { icon: AlertTriangle, color: 'hsl(var(--destructive))', label: 'Risk' },
  pattern: { icon: BarChart3, color: 'hsl(var(--accent))', label: 'Pattern' },
  metric: { icon: TrendingUp, color: 'hsl(var(--secondary))', label: 'Metric' },
};

export function TrendChart({ trends, isLoading, onRefresh, isRefreshing }: TrendChartProps) {
  const chartData = useMemo(() => {
    // Aggregate time series data from all trends
    const dataMap = new Map<string, Record<string, number>>();

    trends.forEach((trend) => {
      if (trend.time_series_data && Array.isArray(trend.time_series_data)) {
        trend.time_series_data.forEach((point: any) => {
          const date = point.date || point.period;
          if (!dataMap.has(date)) {
            dataMap.set(date, { date });
          }
          const entry = dataMap.get(date)!;
          entry[trend.title] = point.value || point.count || 0;
        });
      }
    });

    return Array.from(dataMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [trends]);

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    trends.forEach((trend, index) => {
      const colors = [
        'hsl(var(--primary))',
        'hsl(var(--destructive))',
        'hsl(var(--accent))',
        'hsl(var(--secondary))',
        'hsl(221.2 83.2% 53.3%)',
        'hsl(142.1 76.2% 36.3%)',
      ];
      config[trend.title] = {
        label: trend.title,
        color: colors[index % colors.length],
      };
    });
    return config;
  }, [trends]);

  const getTrendDirection = (trend: DocumentTrend) => {
    if (!trend.time_series_data || trend.time_series_data.length < 2) return 'stable';
    const data = trend.time_series_data as any[];
    const last = data[data.length - 1]?.value || 0;
    const prev = data[data.length - 2]?.value || 0;
    if (last > prev) return 'up';
    if (last < prev) return 'down';
    return 'stable';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Cross-Document Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading trends...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Cross-Document Trends
            </CardTitle>
            <CardDescription>
              Detected patterns and themes across your documents
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Detect Trends
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {trends.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
            <p>No trends detected yet</p>
            <p className="text-sm">Click "Detect Trends" to analyze your documents</p>
          </div>
        ) : (
          <>
            {chartData.length > 0 && (
              <div className="h-[300px] mb-6">
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        className="text-muted-foreground"
                      />
                      <YAxis className="text-muted-foreground" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      {trends.map((trend, index) => (
                        <Line
                          key={trend.id}
                          type="monotone"
                          dataKey={trend.title}
                          stroke={chartConfig[trend.title]?.color || 'hsl(var(--primary))'}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            )}

            <div className="space-y-3">
              {trends.map((trend) => {
                const direction = getTrendDirection(trend);
                const config = trendTypeConfig[trend.trend_type];
                const Icon = config.icon;

                return (
                  <div
                    key={trend.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="p-2 rounded-md"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: config.color }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{trend.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {config.label}
                          </Badge>
                          {trend.confidence_score && (
                            <Badge variant="secondary" className="text-xs">
                              {trend.confidence_score}% confidence
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {trend.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Affects {trend.affected_document_ids?.length || 0} documents
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {direction === 'up' && (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      )}
                      {direction === 'down' && (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      {direction === 'stable' && (
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
