import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRestoreVersion, DatasetVersion } from '@/hooks/useVersions';

interface RestoreVersionDialogProps {
  version: DatasetVersion | null;
  datasetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RestoreVersionDialog({
  version,
  datasetId,
  open,
  onOpenChange,
}: RestoreVersionDialogProps) {
  const { t } = useTranslation();
  const restoreVersion = useRestoreVersion();

  const handleRestore = async () => {
    if (!version) return;
    await restoreVersion.mutateAsync({ versionId: version.id, datasetId });
    onOpenChange(false);
  };

  if (!version) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            {t('versions.restoreVersion', 'Restore Version')}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>
                {t(
                  'versions.restoreWarning',
                  'This will replace all current training pairs with the data from this version. This action cannot be undone.'
                )}
              </span>
            </div>
            <div className="text-foreground">
              <p className="font-medium">
                {t('versions.restoringTo', 'Restoring to:')} {version.name || `Version ${version.version_number}`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {version.pairs_count} {t('versions.pairs', 'pairs')} •{' '}
                {version.tokens_count?.toLocaleString()} {t('versions.tokens', 'tokens')}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRestore}
            disabled={restoreVersion.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {restoreVersion.isPending
              ? t('versions.restoring', 'Restoring...')
              : t('versions.restore', 'Restore')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
