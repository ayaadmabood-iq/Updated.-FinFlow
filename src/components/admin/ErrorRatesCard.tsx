import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, FileText, FileImage, FileCode, File } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FileTypeMetrics {
  mimeType: string;
  totalCount: number;
  errorCount: number;
  errorRate: number;
  avgProcessingTime: number;
}

interface ErrorRatesCardProps {
  data: FileTypeMetrics[] | undefined;
  isLoading: boolean;
}

const getMimeIcon = (mimeType: string) => {
  if (mimeType.includes('image')) return FileImage;
  if (mimeType.includes('text') || mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('html')) return FileCode;
  return File;
};

const formatMimeType = (mimeType: string): string => {
  const parts = mimeType.split('/');
  return parts[parts.length - 1].toUpperCase();
};

export function ErrorRatesCard({ data, isLoading }: ErrorRatesCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.metrics.errorRates')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const hasErrors = data?.some(item => item.errorCount > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          {t('admin.metrics.errorRates')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data?.length ? (
          <p className="text-center text-muted-foreground py-8">
            {t('admin.metrics.noData')}
          </p>
        ) : (
          <div className="space-y-4">
            {data.map((item, index) => {
              const Icon = getMimeIcon(item.mimeType);
              const isHighError = item.errorRate > 20;
              const isMediumError = item.errorRate > 5;
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {formatMimeType(item.mimeType)}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {item.totalCount.toLocaleString()} files
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        ~{item.avgProcessingTime}ms
                      </span>
                      <Badge 
                        variant={isHighError ? 'destructive' : isMediumError ? 'secondary' : 'outline'}
                        className="min-w-[60px] justify-center"
                      >
                        {item.errorRate}% err
                      </Badge>
                    </div>
                  </div>
                  <Progress 
                    value={100 - item.errorRate} 
                    className="h-2"
                  />
                  {item.errorCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {item.errorCount} error{item.errorCount !== 1 ? 's' : ''} out of {item.totalCount} processed
                    </p>
                  )}
                </div>
              );
            })}

            {!hasErrors && (
              <p className="text-center text-sm text-green-600 dark:text-green-400 py-4">
                ✓ {t('admin.metrics.noErrors')}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
