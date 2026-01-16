import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminRoute } from '@/components/admin/AdminRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { Settings as SettingsIcon, Shield, Bell, Database } from 'lucide-react';

export default function AdminSettings() {
  const { t } = useTranslation();

  const settingsSections = [
    {
      icon: Shield,
      title: t('admin.settings.security'),
      description: t('admin.settings.securityDesc'),
    },
    {
      icon: Bell,
      title: t('admin.settings.notifications'),
      description: t('admin.settings.notificationsDesc'),
    },
    {
      icon: Database,
      title: t('admin.settings.storage'),
      description: t('admin.settings.storageDesc'),
    },
  ];

  return (
    <AdminRoute requireSuperAdmin>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{t('admin.settings.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('admin.settings.subtitle')}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {settingsSections.map((section, index) => (
              <Card key={index} className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <section.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{section.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <SettingsIcon className="h-5 w-5 text-muted-foreground" />
                <CardTitle>{t('admin.settings.comingSoon')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('admin.settings.comingSoonDesc')}
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AdminRoute>
  );
}
