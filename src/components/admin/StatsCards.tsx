import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, FileText, HardDrive, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AdminStats } from '@/services/adminService';

interface StatsCardsProps {
  stats?: AdminStats;
  isLoading: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const { t } = useTranslation();

  const cards = [
    {
      title: t('admin.dashboard.users'),
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      title: t('admin.dashboard.documents'),
      value: stats?.totalDocuments ?? 0,
      icon: FileText,
      color: 'text-green-500',
    },
    {
      title: t('admin.dashboard.storage'),
      value: formatBytes(stats?.totalStorageBytes ?? 0),
      icon: HardDrive,
      color: 'text-purple-500',
    },
    {
      title: t('admin.dashboard.processing'),
      value: stats?.totalProcessingCount ?? 0,
      icon: Zap,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{card.value}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
