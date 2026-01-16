import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminRoute } from '@/components/admin/AdminRoute';
import { StatsCards } from '@/components/admin/StatsCards';
import { useAdminStats } from '@/hooks/useAdmin';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useAdminStats();

  const tierData = stats?.usersByTier
    ? Object.entries(stats.usersByTier).map(([name, value]) => ({ name, value }))
    : [];

  const roleData = stats?.usersByRole
    ? Object.entries(stats.usersByRole).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <AdminRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{t('admin.dashboard.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('admin.dashboard.subtitle')}
            </p>
          </div>

          <StatsCards stats={stats} isLoading={isLoading} />

          {!isLoading && (tierData.length > 0 || roleData.length > 0) && (
            <div className="grid gap-6 md:grid-cols-2">
              {tierData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('admin.dashboard.usersByTier')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={tierData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {tierData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {roleData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('admin.dashboard.usersByRole')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={roleData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {roleData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AdminRoute>
  );
}
