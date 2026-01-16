import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OverviewMetrics {
  totalProcessed: number;
  totalErrors: number;
  overallSuccessRate: number;
  avgProcessingTimeMs: number;
}

interface OverviewMetricsCardProps {
  data: OverviewMetrics | undefined;
  isLoading: boolean;
}

export function OverviewMetricsCard({ data, isLoading }: OverviewMetricsCardProps) {
  const { t } = useTranslation();

  const metrics = [
    {
      label: t('admin.metrics.totalProcessed'),
      value: data?.totalProcessed.toLocaleString() || '0',
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: t('admin.metrics.successRate'),
      value: `${data?.overallSuccessRate || 0}%`,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: t('admin.metrics.totalErrors'),
      value: data?.totalErrors.toLocaleString() || '0',
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      label: t('admin.metrics.avgProcessingTime'),
      value: `${data?.avgProcessingTimeMs || 0}ms`,
      icon: Clock,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-bold mt-1">{metric.value}</p>
                </div>
                <div className={`p-3 rounded-full ${metric.bgColor}`}>
                  <Icon className={`h-5 w-5 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
