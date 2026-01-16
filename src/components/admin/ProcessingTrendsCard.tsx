import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

interface TrendData {
  date: string;
  processed: number;
  errors: number;
}

interface ProcessingTrendsCardProps {
  data: TrendData[] | undefined;
  isLoading: boolean;
}

export function ProcessingTrendsCard({ data, isLoading }: ProcessingTrendsCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>{t('admin.metrics.processingTrends')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data?.map(item => ({
    ...item,
    date: format(new Date(item.date), 'MMM dd'),
    success: item.processed - item.errors,
  })) || [];

  const totalProcessed = data?.reduce((sum, d) => sum + d.processed, 0) || 0;
  const totalErrors = data?.reduce((sum, d) => sum + d.errors, 0) || 0;

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('admin.metrics.processingTrends')}
          </div>
          <div className="flex gap-4 text-sm font-normal">
            <span className="text-muted-foreground">
              {t('admin.metrics.last7Days')}: 
              <span className="ml-1 font-medium text-foreground">
                {totalProcessed.toLocaleString()} processed
              </span>
            </span>
            {totalErrors > 0 && (
              <span className="text-destructive">
                {totalErrors} errors
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }} 
              className="text-muted-foreground"
            />
            <YAxis 
              tick={{ fontSize: 12 }} 
              className="text-muted-foreground"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-lg">
                    <p className="font-medium mb-2">{label}</p>
                    <div className="space-y-1 text-sm">
                      <p className="text-primary">
                        Processed: {payload[0]?.value}
                      </p>
                      <p className="text-destructive">
                        Errors: {payload[1]?.value}
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="success"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorSuccess)"
            />
            <Area
              type="monotone"
              dataKey="errors"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorErrors)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
