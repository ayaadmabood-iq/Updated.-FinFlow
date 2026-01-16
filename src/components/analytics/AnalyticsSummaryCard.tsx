import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  AlertTriangle,
  TrendingUp,
  Activity,
  Flag,
  Target,
} from 'lucide-react';
import { AnalyticsSummary } from '@/services/analyticsService';

interface AnalyticsSummaryCardProps {
  summary: AnalyticsSummary | undefined;
  isLoading: boolean;
}

export function AnalyticsSummaryCard({ summary, isLoading }: AnalyticsSummaryCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Analytics Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const metrics = [
    {
      label: 'Total Documents',
      value: summary.total_documents,
      icon: FileText,
      color: 'text-primary',
    },
    {
      label: 'Scored Documents',
      value: summary.scored_documents,
      icon: Target,
      color: 'text-blue-500',
    },
    {
      label: 'High Risk',
      value: summary.high_risk_count,
      icon: AlertTriangle,
      color: 'text-destructive',
      showZero: true,
    },
    {
      label: 'High Opportunity',
      value: summary.high_opportunity_count,
      icon: TrendingUp,
      color: 'text-green-500',
    },
    {
      label: 'Active Trends',
      value: summary.active_trends,
      icon: Activity,
      color: 'text-purple-500',
    },
    {
      label: 'Unresolved Flags',
      value: summary.unresolved_anomalies,
      icon: Flag,
      color: summary.unresolved_anomalies > 0 ? 'text-yellow-500' : 'text-muted-foreground',
      showZero: true,
    },
    {
      label: 'Avg Risk Score',
      value: summary.avg_risk_score !== null ? `${summary.avg_risk_score}%` : '-',
      color:
        summary.avg_risk_score !== null && summary.avg_risk_score >= 50
          ? 'text-destructive'
          : 'text-muted-foreground',
    },
    {
      label: 'Avg Opportunity',
      value: summary.avg_opportunity_score !== null ? `${summary.avg_opportunity_score}%` : '-',
      color:
        summary.avg_opportunity_score !== null && summary.avg_opportunity_score >= 50
          ? 'text-green-500'
          : 'text-muted-foreground',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Analytics Overview
            </CardTitle>
            <CardDescription>
              Key metrics and insights from your document analysis
            </CardDescription>
          </div>
          {summary.critical_anomalies > 0 && (
            <Badge variant="destructive">
              {summary.critical_anomalies} critical issue{summary.critical_anomalies !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                {metric.icon && <metric.icon className={`h-4 w-4 ${metric.color}`} />}
                <span className="text-xs text-muted-foreground">{metric.label}</span>
              </div>
              <div className={`text-2xl font-bold ${metric.color}`}>
                {metric.value === 0 && !metric.showZero ? '-' : metric.value}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
