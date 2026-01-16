import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminRoute } from '@/components/admin/AdminRoute';
import { useAdminMetrics } from '@/hooks/useAdmin';
import { useTranslation } from 'react-i18next';
import { OverviewMetricsCard } from '@/components/admin/OverviewMetricsCard';
import { ProcessingMetricsCard } from '@/components/admin/ProcessingMetricsCard';
import { ErrorRatesCard } from '@/components/admin/ErrorRatesCard';
import { ActiveUsersCard } from '@/components/admin/ActiveUsersCard';
import { ActiveProjectsCard } from '@/components/admin/ActiveProjectsCard';
import { ProcessingTrendsCard } from '@/components/admin/ProcessingTrendsCard';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminMetrics() {
  const { t } = useTranslation();
  const { data, isLoading, refetch, isFetching } = useAdminMetrics();

  return (
    <AdminRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{t('admin.metrics.title')}</h1>
              <p className="text-muted-foreground mt-1">
                {t('admin.metrics.subtitle')}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
          </div>

          {/* Overview Metrics */}
          <OverviewMetricsCard data={data?.overview} isLoading={isLoading} />

          {/* Processing Trends */}
          <ProcessingTrendsCard data={data?.processingTrends} isLoading={isLoading} />

          {/* Two column layout for stage metrics and error rates */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ProcessingMetricsCard 
              data={data?.processingStageMetrics} 
              isLoading={isLoading} 
            />
            <ErrorRatesCard 
              data={data?.fileTypeMetrics} 
              isLoading={isLoading} 
            />
          </div>

          {/* Active Users and Projects */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ActiveUsersCard 
              data={data?.mostActiveUsers} 
              isLoading={isLoading} 
            />
            <ActiveProjectsCard 
              data={data?.mostActiveProjects} 
              isLoading={isLoading} 
            />
          </div>
        </div>
      </DashboardLayout>
    </AdminRoute>
  );
}