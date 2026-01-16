import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { GitCompare, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DatasetVersion } from '@/hooks/useVersions';

interface VersionCompareProps {
  version: DatasetVersion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TrainingPair {
  user_message: string;
  assistant_message: string;
  system_message?: string;
}

export function VersionCompare({ version, open, onOpenChange }: VersionCompareProps) {
  const { t } = useTranslation();

  if (!version) return null;

  const snapshot = version.snapshot as { pairs?: TrainingPair[] };
  const pairs = snapshot?.pairs || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            {version.name || `Version ${version.version_number}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Version info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{format(new Date(version.created_at), 'PPp')}</span>
            <Badge variant="secondary">{version.pairs_count} pairs</Badge>
            <Badge variant="outline">{version.tokens_count?.toLocaleString()} tokens</Badge>
          </div>

          {version.description && (
            <p className="text-sm bg-muted p-3 rounded-md">{version.description}</p>
          )}

          {/* Pairs preview */}
          <div className="border rounded-lg">
            <div className="p-3 border-b bg-muted/50">
              <h4 className="font-medium">{t('versions.trainingPairs', 'Training Pairs')}</h4>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="divide-y">
                {pairs.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {t('versions.noPairs', 'No training pairs in this version')}
                  </div>
                ) : (
                  pairs.slice(0, 20).map((pair, index) => (
                    <div key={index} className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="shrink-0">
                          {t('training.user', 'User')}
                        </Badge>
                        <p className="text-sm">{pair.user_message}</p>
                      </div>
                      <div className="flex items-center justify-center">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge variant="secondary" className="shrink-0">
                          {t('training.assistant', 'Assistant')}
                        </Badge>
                        <p className="text-sm">{pair.assistant_message}</p>
                      </div>
                    </div>
                  ))
                )}
                {pairs.length > 20 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {t('versions.andMore', 'And {{count}} more pairs...', { count: pairs.length - 20 })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
