// Dashboard page - Main overview with onboarding
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProjects } from '@/hooks/useProjects';
import { useActivitySummary } from '@/hooks/useAuditLogs';
import { useQuotaStatus } from '@/hooks/useQuota';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { FolderOpen, FileText, Activity, TrendingUp, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { QuotaCard } from '@/components/quota/QuotaCard';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { EmptyState } from '@/components/ui/EmptyState';

export default function Dashboard() {
  const { data: projectsData, isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { data: activityData, isLoading: activityLoading } = useActivitySummary();
  const { data: quotaStatus, isLoading: quotaLoading } = useQuotaStatus();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const {
    currentStep,
    isComplete: onboardingComplete,
    isLoading: onboardingLoading,
    setStep,
    completeOnboarding,
    skipOnboarding,
    refreshState,
  } = useOnboarding(user?.id);

  const stats = [
    {
      title: t('dashboard.totalProjects'),
      value: projectsData?.total || 0,
      icon: FolderOpen,
      description: t('projects.active'),
    },
    {
      title: t('dashboard.totalDocuments'),
      value: projectsData?.data.reduce((sum, p) => sum + p.documentCount, 0) || 0,
      icon: FileText,
      description: t('projects.title'),
    },
    {
      title: t('dashboard.recentActivity'),
      value: activityData?.todayCount || 0,
      icon: Activity,
      description: 'Today',
    },
    {
      title: 'This Week',
      value: activityData?.weekCount || 0,
      icon: TrendingUp,
      description: 'Activities',
    },
  ];

  const hasProjects = (projectsData?.total || 0) > 0;

  const handleOnboardingComplete = () => {
    completeOnboarding();
    refetchProjects();
    refreshState();
  };

  return (
    <DashboardLayout title={t('nav.dashboard')} description={t('dashboard.welcome')}>
      {/* Onboarding Wizard for new users */}
      {user && !onboardingLoading && !onboardingComplete && (
        <OnboardingWizard
          userId={user.id}
          currentStep={currentStep}
          onStepChange={setStep}
          onComplete={handleOnboardingComplete}
          onSkip={skipOnboarding}
        />
      )}
      
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, idx) => (
            <Card key={idx}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {projectsLoading || activityLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Action CTA for empty state */}
        {!projectsLoading && !hasProjects && onboardingComplete && (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <EmptyState
                icon={FolderOpen}
                title="No projects yet"
                description="Create your first project to start uploading and processing documents."
                action={{
                  label: 'Create Project',
                  onClick: () => navigate('/projects'),
                  icon: Plus,
                }}
                variant="compact"
              />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Quota Card */}
          {quotaLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ) : quotaStatus ? (
            <QuotaCard
              tier={quotaStatus.tier}
              documents={quotaStatus.documents}
              processing={quotaStatus.processing}
              storage={quotaStatus.storage}
            />
          ) : null}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : activityData?.recentActions.length ? (
                <div className="space-y-3">
                  {activityData.recentActions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {action.action.charAt(0).toUpperCase() + action.action.slice(1)}{' '}
                          <span className="text-muted-foreground">{action.resourceName}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(action.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Activity className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Activity will appear here as you use FineFlow
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
