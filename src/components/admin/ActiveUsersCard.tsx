import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';

interface ActiveUserMetrics {
  userId: string;
  userName: string;
  email: string;
  documentsCount: number;
  processingCount: number;
  lastActivity: string;
}

interface ActiveUsersCardProps {
  data: ActiveUserMetrics[] | undefined;
  isLoading: boolean;
}

export function ActiveUsersCard({ data, isLoading }: ActiveUsersCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.metrics.activeUsers')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          {t('admin.metrics.activeUsers')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data?.length ? (
          <p className="text-center text-muted-foreground py-8">
            {t('admin.metrics.noData')}
          </p>
        ) : (
          <div className="space-y-4">
            {data.map((user, index) => (
              <div 
                key={user.userId} 
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user.userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {index < 3 && (
                    <Badge 
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                      variant={index === 0 ? 'default' : 'secondary'}
                    >
                      {index + 1}
                    </Badge>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span>{user.documentsCount}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Zap className="h-3 w-3" />
                    <span>{user.processingCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
