import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { GitCompare, Plus, Minus, Equal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { DatasetVersion } from '@/hooks/useVersions';
import { format } from 'date-fns';

interface VersionCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: DatasetVersion | null;
  datasetId: string;
}

interface TrainingPair {
  user_message: string;
  assistant_message: string;
  system_message?: string;
}

export function VersionCompareDialog({ 
  open, 
  onOpenChange, 
  version, 
  datasetId 
}: VersionCompareDialogProps) {
  const { t } = useTranslation();

  // Fetch current dataset state
  const { data: currentData } = useQuery({
    queryKey: ['dataset-current', datasetId],
    queryFn: async () => {
      const [datasetRes, pairsRes] = await Promise.all([
        supabase
          .from('training_datasets')
          .select('id, name, total_pairs, total_tokens')
          .eq('id', datasetId)
          .single(),
        supabase
          .from('training_pairs')
          .select('user_message, assistant_message, system_message')
          .eq('dataset_id', datasetId)
          .limit(20)
      ]);

      return {
        dataset: datasetRes.data,
        pairs: pairsRes.data || [],
        pairsCount: datasetRes.data?.total_pairs || 0,
        tokensCount: datasetRes.data?.total_tokens || 0,
      };
    },
    enabled: open && !!datasetId
  });

  // Parse version snapshot
  const versionData = useMemo(() => {
    if (!version) return null;
    const snapshot = version.snapshot as { pairs?: TrainingPair[] };
    return {
      pairs: snapshot?.pairs || [],
      pairsCount: version.pairs_count || 0,
      tokensCount: version.tokens_count || 0,
    };
  }, [version]);

  // Calculate diff
  const diff = useMemo(() => {
    if (!currentData || !versionData) return null;
    
    const pairsDiff = currentData.pairsCount - versionData.pairsCount;
    const tokensDiff = currentData.tokensCount - versionData.tokensCount;
    
    return {
      pairsAdded: pairsDiff,
      tokensAdded: tokensDiff,
    };
  }, [currentData, versionData]);

  if (!version) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            {t('versions.compare', 'Compare Versions')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Current Version */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {t('versions.current', 'Current')}
                <Badge variant="default">{t('versions.latest', 'Latest')}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('versions.pairs', 'Pairs')}:</span>
                <span className="font-medium">{currentData?.pairsCount || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('versions.tokens', 'Tokens')}:</span>
                <span className="font-medium">{currentData?.tokensCount?.toLocaleString() || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Compare Version */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                v{version.version_number} - {version.name || t('versions.unnamed', 'Unnamed')}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {format(new Date(version.created_at), 'PPp')}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('versions.pairs', 'Pairs')}:</span>
                <span className="font-medium">{versionData?.pairsCount || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('versions.tokens', 'Tokens')}:</span>
                <span className="font-medium">{versionData?.tokensCount?.toLocaleString() || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Diff Summary */}
        {diff && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-3">{t('versions.changes', 'Changes')}</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {diff.pairsAdded !== 0 && (
                <div className={`flex items-center gap-2 ${diff.pairsAdded > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {diff.pairsAdded > 0 ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                  <span>{Math.abs(diff.pairsAdded)} {t('versions.pairs', 'pairs')} {diff.pairsAdded > 0 ? t('versions.added', 'added') : t('versions.removed', 'removed')}</span>
                </div>
              )}
              {diff.tokensAdded !== 0 && (
                <div className={`flex items-center gap-2 ${diff.tokensAdded > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {diff.tokensAdded > 0 ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                  <span>{Math.abs(diff.tokensAdded).toLocaleString()} {t('versions.tokens', 'tokens')} {diff.tokensAdded > 0 ? t('versions.added', 'added') : t('versions.removed', 'removed')}</span>
                </div>
              )}
              {diff.pairsAdded === 0 && diff.tokensAdded === 0 && (
                <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                  <Equal className="h-4 w-4" />
                  <span>{t('versions.noChanges', 'No changes detected')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Training Pairs Comparison */}
        <div className="mt-4 border rounded-lg">
          <div className="p-3 border-b bg-muted/50">
            <h4 className="font-medium">{t('versions.samplePairs', 'Sample Training Pairs')}</h4>
          </div>
          <div className="grid grid-cols-2 divide-x">
            {/* Current Pairs */}
            <ScrollArea className="h-[250px]">
              <div className="p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">{t('versions.current', 'Current')}</p>
                {currentData?.pairs.slice(0, 5).map((pair, i) => (
                  <div key={i} className="text-xs p-2 bg-background rounded border">
                    <p className="font-medium text-primary">Q: {pair.user_message.slice(0, 100)}...</p>
                    <p className="text-muted-foreground mt-1">A: {pair.assistant_message.slice(0, 100)}...</p>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Version Pairs */}
            <ScrollArea className="h-[250px]">
              <div className="p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">v{version.version_number}</p>
                {versionData?.pairs.slice(0, 5).map((pair, i) => (
                  <div key={i} className="text-xs p-2 bg-background rounded border">
                    <p className="font-medium text-primary">Q: {pair.user_message.slice(0, 100)}...</p>
                    <p className="text-muted-foreground mt-1">A: {pair.assistant_message.slice(0, 100)}...</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
