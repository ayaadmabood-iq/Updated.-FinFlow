import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  GitBranch,
  Plus,
  MoreVertical,
  History,
  RotateCcw,
  FileText,
  Loader2,
  CheckCircle2,
  Tag,
} from 'lucide-react';

interface DatasetVersion {
  id: string;
  datasetId: string;
  versionNumber: number;
  name: string | null;
  description: string | null;
  changesSummary: string | null;
  pairsCount: number;
  tokensCount: number;
  snapshot: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

interface DatasetVersionControlProps {
  datasetId: string;
  datasetName: string;
  currentPairsCount: number;
  currentTokensCount: number;
}

export function DatasetVersionControl({
  datasetId,
  datasetName,
  currentPairsCount,
  currentTokensCount,
}: DatasetVersionControlProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [versionDescription, setVersionDescription] = useState('');

  // Fetch versions
  const { data: versions, isLoading } = useQuery({
    queryKey: ['datasetVersions', datasetId],
    queryFn: async (): Promise<DatasetVersion[]> => {
      const { data, error } = await supabase
        .from('dataset_versions')
        .select('*')
        .eq('dataset_id', datasetId)
        .order('version_number', { ascending: false });

      if (error) throw error;

      return (data || []).map(v => ({
        id: v.id,
        datasetId: v.dataset_id,
        versionNumber: v.version_number,
        name: v.name,
        description: v.description,
        changesSummary: v.changes_summary,
        pairsCount: v.pairs_count || 0,
        tokensCount: v.tokens_count || 0,
        snapshot: v.snapshot as Record<string, unknown>,
        createdBy: v.created_by,
        createdAt: v.created_at,
      }));
    },
  });

  // Create version mutation
  const createVersionMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const nextVersion = (versions?.[0]?.versionNumber || 0) + 1;

      // Get current pairs for snapshot
      const { data: pairs, error: pairsError } = await supabase
        .from('training_pairs')
        .select('*')
        .eq('dataset_id', datasetId);

      if (pairsError) throw pairsError;

      const { error } = await supabase
        .from('dataset_versions')
        .insert({
          dataset_id: datasetId,
          version_number: nextVersion,
          name: versionName || `v${nextVersion}`,
          description: versionDescription || null,
          pairs_count: currentPairsCount,
          tokens_count: currentTokensCount,
          snapshot: { pairs: pairs || [] },
          created_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasetVersions', datasetId] });
      setShowCreateDialog(false);
      setVersionName('');
      setVersionDescription('');
      toast({
        title: t('training.versionCreated', 'Version Created'),
        description: t('training.versionCreatedDesc', 'Dataset snapshot saved successfully.'),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: error.message,
      });
    },
  });

  // Restore version mutation
  const restoreVersionMutation = useMutation({
    mutationFn: async (version: DatasetVersion) => {
      // Delete current pairs
      const { error: deleteError } = await supabase
        .from('training_pairs')
        .delete()
        .eq('dataset_id', datasetId);

      if (deleteError) throw deleteError;

      // Restore pairs from snapshot
      const snapshotPairs = (version.snapshot.pairs as Array<Record<string, unknown>>) || [];
      if (snapshotPairs.length > 0) {
        const pairsToInsert = snapshotPairs.map(p => ({
          dataset_id: datasetId,
          user_message: p.user_message as string,
          assistant_message: p.assistant_message as string,
          system_message: p.system_message as string | null,
          source_chunk_id: p.source_chunk_id as string | null,
          source_document_id: p.source_document_id as string | null,
          quality_score: p.quality_score as number | null,
          token_count: p.token_count as number | null,
          is_valid: p.is_valid as boolean,
        }));

        const { error: insertError } = await supabase
          .from('training_pairs')
          .insert(pairsToInsert);

        if (insertError) throw insertError;
      }

      // Update dataset counts
      const { error: updateError } = await supabase
        .from('training_datasets')
        .update({
          total_pairs: version.pairsCount,
          total_tokens: version.tokensCount,
        })
        .eq('id', datasetId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingDataset', datasetId] });
      queryClient.invalidateQueries({ queryKey: ['trainingPairs', datasetId] });
      toast({
        title: t('training.versionRestored', 'Version Restored'),
        description: t('training.versionRestoredDesc', 'Dataset has been restored to the selected version.'),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: error.message,
      });
    },
  });

  const latestVersion = versions?.[0];
  const hasChanges = latestVersion 
    ? (currentPairsCount !== latestVersion.pairsCount || currentTokensCount !== latestVersion.tokensCount)
    : currentPairsCount > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            {t('training.versionControl', 'Version Control')}
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCreateDialog(true)}
            disabled={!hasChanges}
          >
            <Plus className="h-3 w-3 me-1" />
            {t('training.saveVersion', 'Save Version')}
          </Button>
        </div>
        {hasChanges && (
          <p className="text-xs text-yellow-600 flex items-center gap-1 mt-2">
            <History className="h-3 w-3" />
            {t('training.unsavedChanges', 'You have unsaved changes')}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !versions?.length ? (
          <div className="text-center py-4">
            <Tag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('training.noVersions', 'No versions saved yet')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('training.noVersionsHint', 'Save a version to track changes')}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {version.name || `v${version.versionNumber}`}
                        </p>
                        {index === 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {t('training.latest', 'Latest')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {version.pairsCount} pairs • {(version.tokensCount / 1000).toFixed(1)}k tokens
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(version.createdAt), 'PPp')}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => restoreVersionMutation.mutate(version)}>
                        <RotateCcw className="h-4 w-4 me-2" />
                        {t('training.restore', 'Restore')}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileText className="h-4 w-4 me-2" />
                        {t('training.viewSnapshot', 'View Snapshot')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Create Version Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              {t('training.createVersion', 'Create Version')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('training.versionName', 'Version Name')}</Label>
              <Input
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder={`v${(latestVersion?.versionNumber || 0) + 1}`}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('training.versionDescription', 'Description (optional)')}</Label>
              <Textarea
                value={versionDescription}
                onChange={(e) => setVersionDescription(e.target.value)}
                placeholder={t('training.versionDescPlaceholder', 'Describe what changed...')}
                rows={3}
              />
            </div>

            <div className="bg-muted/50 rounded p-3 text-sm">
              <p className="font-medium mb-1">{t('training.snapshotInfo', 'Snapshot Info')}</p>
              <p className="text-muted-foreground">
                {currentPairsCount} pairs • {(currentTokensCount / 1000).toFixed(1)}k tokens
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button 
              onClick={() => createVersionMutation.mutate()}
              disabled={createVersionMutation.isPending}
            >
              {createVersionMutation.isPending ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 me-2" />
              )}
              {t('training.saveVersion', 'Save Version')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
