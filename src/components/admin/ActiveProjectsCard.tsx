import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, FileText, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';

interface ActiveProjectMetrics {
  projectId: string;
  projectName: string;
  ownerName: string;
  documentCount: number;
  lastUpdated: string;
}

interface ActiveProjectsCardProps {
  data: ActiveProjectMetrics[] | undefined;
  isLoading: boolean;
}

export function ActiveProjectsCard({ data, isLoading }: ActiveProjectsCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.metrics.activeProjects')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          {t('admin.metrics.activeProjects')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data?.length ? (
          <p className="text-center text-muted-foreground py-8">
            {t('admin.metrics.noData')}
          </p>
        ) : (
          <div className="space-y-3">
            {data.map((project, index) => (
              <div 
                key={project.projectId} 
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{project.projectName}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('admin.metrics.ownedBy')} {project.ownerName}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {project.documentCount}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(project.lastUpdated), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
