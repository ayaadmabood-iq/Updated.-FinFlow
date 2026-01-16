import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTranslation } from 'react-i18next';

interface ProcessingStageMetrics {
  stage: string;
  avgDurationMs: number;
  totalExecutions: number;
  successRate: number;
  errorCount: number;
}

interface ProcessingMetricsCardProps {
  data: ProcessingStageMetrics[] | undefined;
  isLoading: boolean;
}

const STAGE_COLORS: Record<string, string> = {
  ingestion: 'hsl(var(--chart-1))',
  text_extraction: 'hsl(var(--chart-2))',
  language_detection: 'hsl(var(--chart-3))',
  chunking: 'hsl(var(--chart-4))',
  summarization: 'hsl(var(--chart-5))',
  indexing: 'hsl(var(--primary))',
};

const formatStageName = (stage: string): string => {
  return stage
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function ProcessingMetricsCard({ data, isLoading }: ProcessingMetricsCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.metrics.processingStages')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data?.map(item => ({
    name: formatStageName(item.stage),
    avgTime: item.avgDurationMs,
    executions: item.totalExecutions,
    successRate: item.successRate,
    stage: item.stage,
  })) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('admin.metrics.processingStages')}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {t('admin.metrics.avgExecutionTime')}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
            <XAxis type="number" tickFormatter={(v) => `${v}ms`} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-lg">
                    <p className="font-medium">{data.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Avg: {data.avgTime}ms
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Executions: {data.executions.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Success: {data.successRate}%
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="avgTime" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={STAGE_COLORS[entry.stage] || 'hsl(var(--muted))'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
          {data?.map((item, index) => (
            <div 
              key={index} 
              className="flex items-center gap-2 rounded-lg border p-2 text-sm"
            >
              <div 
                className="h-3 w-3 rounded-full" 
                style={{ backgroundColor: STAGE_COLORS[item.stage] || 'hsl(var(--muted))' }}
              />
              <div className="flex-1 truncate">
                <p className="truncate font-medium">{formatStageName(item.stage)}</p>
                <p className="text-xs text-muted-foreground">
                  {item.successRate}% success
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
