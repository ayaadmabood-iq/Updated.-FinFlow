import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TrendChart } from '@/components/analytics/TrendChart';
import { AnomalyAlerts } from '@/components/analytics/AnomalyAlerts';
import { ExecutiveBriefingPanel } from '@/components/analytics/ExecutiveBriefingPanel';
import { NaturalLanguageQuery } from '@/components/analytics/NaturalLanguageQuery';
import { AnalyticsSummaryCard } from '@/components/analytics/AnalyticsSummaryCard';
import {
  useDocumentTrends,
  useDetectTrends,
  useDocumentAnomalies,
  useDetectAnomalies,
  useResolveAnomaly,
  useExecutiveBriefings,
  useGenerateBriefing,
  useDeleteBriefing,
  useAnalyticsQueryHistory,
  useExecuteAnalyticsQuery,
  useAnalyticsSummary,
} from '@/hooks/usePredictiveAnalytics';
import { AnalyticsQuery } from '@/services/analyticsService';

export default function ProjectAnalytics() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const [lastQueryResult, setLastQueryResult] = useState<AnalyticsQuery | null>(null);

  // Hooks
  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary(projectId || '');
  const { data: trends = [], isLoading: trendsLoading } = useDocumentTrends(projectId || '');
  const { data: anomalies = [], isLoading: anomaliesLoading } = useDocumentAnomalies(projectId || '');
  const { data: briefings = [], isLoading: briefingsLoading } = useExecutiveBriefings(projectId || '');
  const { data: queryHistory = [], isLoading: historyLoading } = useAnalyticsQueryHistory(projectId || '');

  const detectTrendsMutation = useDetectTrends();
  const detectAnomaliesMutation = useDetectAnomalies();
  const resolveAnomalyMutation = useResolveAnomaly();
  const generateBriefingMutation = useGenerateBriefing();
  const deleteBriefingMutation = useDeleteBriefing();
  const executeQueryMutation = useExecuteAnalyticsQuery();

  const handleExecuteQuery = async (query: string) => {
    if (!projectId) return;
    const result = await executeQueryMutation.mutateAsync({ projectId, query });
    setLastQueryResult(result);
  };

  if (!projectId) {
    return (
      <DashboardLayout title="Analytics" description="Select a project to view analytics">
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No project selected
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={t('analytics.title', 'Predictive Analytics')}
      description={t('analytics.description', 'AI-powered insights and trend detection across your documents')}
    >
      <div className="space-y-6">
        {/* Summary Overview */}
        <AnalyticsSummaryCard summary={summary} isLoading={summaryLoading} />

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cross-Document Trends */}
          <TrendChart
            trends={trends}
            isLoading={trendsLoading}
            onRefresh={() => detectTrendsMutation.mutate(projectId)}
            isRefreshing={detectTrendsMutation.isPending}
          />

          {/* Anomaly Alerts */}
          <AnomalyAlerts
            anomalies={anomalies}
            isLoading={anomaliesLoading}
            onDetect={() => detectAnomaliesMutation.mutate(projectId)}
            onResolve={(anomalyId, notes) =>
              resolveAnomalyMutation.mutate({ anomalyId, resolutionNotes: notes, projectId })
            }
            isDetecting={detectAnomaliesMutation.isPending}
          />
        </div>

        {/* Executive Briefings */}
        <ExecutiveBriefingPanel
          briefings={briefings}
          isLoading={briefingsLoading}
          onGenerate={(periodStart, periodEnd, title) =>
            generateBriefingMutation.mutate({ projectId, periodStart, periodEnd, title })
          }
          onDelete={(briefingId) => deleteBriefingMutation.mutate({ briefingId, projectId })}
          isGenerating={generateBriefingMutation.isPending}
        />

        {/* Natural Language Query */}
        <NaturalLanguageQuery
          history={queryHistory}
          isLoading={historyLoading}
          onExecute={handleExecuteQuery}
          isExecuting={executeQueryMutation.isPending}
          lastResult={lastQueryResult}
        />
      </div>
    </DashboardLayout>
  );
}
