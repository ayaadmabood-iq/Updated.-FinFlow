import { useTranslation } from 'react-i18next';
import { GitBranch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDatasetVersions } from '@/hooks/useVersions';

interface VersionBadgeProps {
  datasetId: string;
  className?: string;
}

export function VersionBadge({ datasetId, className }: VersionBadgeProps) {
  const { t } = useTranslation();
  const { data: versions } = useDatasetVersions(datasetId);

  const latestVersion = versions?.[0];
  const versionCount = versions?.length || 0;

  if (versionCount === 0) {
    return null;
  }

  return (
    <Badge variant="outline" className={className}>
      <GitBranch className="h-3 w-3 mr-1" />
      {t('versions.versionNumber', 'v{{number}}', { number: latestVersion?.version_number || 1 })}
      {versionCount > 1 && (
        <span className="text-muted-foreground ml-1">
          ({versionCount} {t('versions.total', 'total')})
        </span>
      )}
    </Badge>
  );
}
