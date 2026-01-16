import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { History, GitBranch, RotateCcw, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDatasetVersions, DatasetVersion } from '@/hooks/useVersions';
import { Skeleton } from '@/components/ui/skeleton';

interface VersionHistoryProps {
  datasetId: string;
  onRestore?: (version: DatasetVersion) => void;
  onCompare?: (version: DatasetVersion) => void;
}

export function VersionHistory({ datasetId, onRestore, onCompare }: VersionHistoryProps) {
  const { t } = useTranslation();
  const { data: versions, isLoading } = useDatasetVersions(datasetId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('versions.history', 'Version History')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          {t('versions.history', 'Version History')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!versions || versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('versions.noVersions', 'No versions saved yet')}</p>
            <p className="text-sm mt-1">
              {t('versions.createFirst', 'Create a version to track changes')}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-4">
                {versions.map((version, index) => (
                  <div key={version.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 ${
                        index === 0
                          ? 'bg-primary border-primary'
                          : 'bg-background border-muted-foreground'
                      }`}
                    />

                    <Card className={index === 0 ? 'border-primary' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {version.name || `Version ${version.version_number}`}
                              </span>
                              {index === 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {t('versions.latest', 'Latest')}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {format(new Date(version.created_at), 'PPp')}
                            </p>
                            {version.description && (
                              <p className="text-sm mt-2">{version.description}</p>
                            )}
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                              <span>
                                {version.pairs_count} {t('versions.pairs', 'pairs')}
                              </span>
                              <span>
                                {version.tokens_count?.toLocaleString()} {t('versions.tokens', 'tokens')}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {onCompare && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onCompare(version)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {onRestore && index !== 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRestore(version)}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
