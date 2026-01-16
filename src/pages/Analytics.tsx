import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import {
  BarChart3,
  TrendingUp,
  Database,
  Cpu,
  Coins,
  Calendar,
  Download,
  RefreshCw,
  Radio,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnalytics } from '@/hooks/useAnalytics';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function Analytics() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState('6m');

  const getDateRange = () => {
    const end = endOfMonth(new Date());
    const months = dateRange === '3m' ? 3 : dateRange === '6m' ? 6 : 12;
    const start = startOfMonth(subMonths(new Date(), months - 1));
    return { start, end };
  };

  const { data: analytics, isLoading, isLive, lastUpdated, refresh } = useAnalytics(getDateRange());

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              {t('analytics.title', 'Analytics')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('analytics.description', 'Track your training performance and usage')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-2 text-sm">
              <Radio className={`h-3 w-3 ${isLive ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
              <span className={isLive ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                {isLive ? t('analytics.live', 'Live') : t('analytics.connecting', 'Connecting...')}
              </span>
            </div>

            {/* Last updated */}
            <span className="text-xs text-muted-foreground hidden md:inline">
              {t('analytics.lastUpdated', 'Last updated')}: {format(lastUpdated, 'HH:mm:ss')}
            </span>

            {/* Refresh button */}
            <Button variant="ghost" size="icon" onClick={refresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">{t('analytics.last3Months', 'Last 3 months')}</SelectItem>
                <SelectItem value="6m">{t('analytics.last6Months', 'Last 6 months')}</SelectItem>
                <SelectItem value="12m">{t('analytics.lastYear', 'Last year')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              {t('analytics.export', 'Export')}
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Database className="h-4 w-4" />
                    <span className="text-sm">{t('analytics.projects', 'Projects')}</span>
                  </div>
                  <p className="text-2xl font-bold">{analytics?.overview.totalProjects || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Database className="h-4 w-4" />
                    <span className="text-sm">{t('analytics.datasets', 'Datasets')}</span>
                  </div>
                  <p className="text-2xl font-bold">{analytics?.overview.totalDatasets || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Cpu className="h-4 w-4" />
                    <span className="text-sm">{t('analytics.trainingJobs', 'Training Jobs')}</span>
                  </div>
                  <p className="text-2xl font-bold">{analytics?.overview.totalTrainingJobs || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Coins className="h-4 w-4" />
                    <span className="text-sm">{t('analytics.totalTokens', 'Total Tokens')}</span>
                  </div>
                  <p className="text-2xl font-bold">{formatNumber(analytics?.overview.totalTokens || 0)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">{t('analytics.successRate', 'Success Rate')}</span>
                  </div>
                  <p className="text-2xl font-bold">{(analytics?.overview.successRate || 0).toFixed(1)}%</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Training Trends */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.trainingTrends', 'Training Trends')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics?.trainingTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="completed" name={t('analytics.completed', 'Completed')} fill="hsl(var(--primary))" />
                    <Bar dataKey="failed" name={t('analytics.failed', 'Failed')} fill="hsl(var(--destructive))" />
                    <Bar dataKey="pending" name={t('analytics.pending', 'Pending')} fill="hsl(var(--muted-foreground))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Token Usage */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.tokenUsage', 'Token Usage')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics?.tokenUsage || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={formatNumber} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                      formatter={(value: number) => [formatNumber(value), 'Tokens']}
                    />
                    <Area
                      type="monotone"
                      dataKey="tokens"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.2)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Cost by Project */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.costByProject', 'Cost by Project')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics?.costByProject || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" tickFormatter={(v) => `$${v.toFixed(2)}`} />
                    <YAxis type="category" dataKey="projectName" className="text-xs" width={100} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                      formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
                    />
                    <Bar dataKey="cost" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Model Performance */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.modelPerformance', 'Model Performance')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : analytics?.modelPerformance && analytics.modelPerformance.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('analytics.model', 'Model')}</TableHead>
                      <TableHead className="text-center">{t('analytics.jobs', 'Jobs')}</TableHead>
                      <TableHead className="text-center">{t('analytics.successRate', 'Success')}</TableHead>
                      <TableHead className="text-center">{t('analytics.avgLoss', 'Avg Loss')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.modelPerformance.map((model) => (
                      <TableRow key={model.model}>
                        <TableCell className="font-medium text-sm">{model.model}</TableCell>
                        <TableCell className="text-center">{model.jobCount}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={model.successRate >= 80 ? 'default' : model.successRate >= 50 ? 'secondary' : 'destructive'}>
                            {model.successRate.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {model.avgLoss > 0 ? model.avgLoss.toFixed(4) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {t('analytics.noData', 'No training data available')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
