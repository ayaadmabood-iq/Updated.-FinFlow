import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export interface DatasetVersion {
  id: string;
  dataset_id: string;
  version_number: number;
  name: string | null;
  description: string | null;
  snapshot: Json;
  changes_summary: string | null;
  pairs_count: number;
  tokens_count: number;
  created_by: string;
  created_at: string;
}

export function useDatasetVersions(datasetId: string) {
  return useQuery({
    queryKey: ['dataset-versions', datasetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dataset_versions')
        .select('*')
        .eq('dataset_id', datasetId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return data as DatasetVersion[];
    },
    enabled: !!datasetId,
  });
}

export function useCreateVersion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      datasetId,
      name,
      description,
    }: {
      datasetId: string;
      name?: string;
      description?: string;
    }) => {
      // Get current dataset and pairs
      const { data: dataset, error: datasetError } = await supabase
        .from('training_datasets')
        .select('*')
        .eq('id', datasetId)
        .single();

      if (datasetError) throw datasetError;

      const { data: pairs, error: pairsError } = await supabase
        .from('training_pairs')
        .select('*')
        .eq('dataset_id', datasetId);

      if (pairsError) throw pairsError;

      // Get next version number
      const { data: versions } = await supabase
        .from('dataset_versions')
        .select('version_number')
        .eq('dataset_id', datasetId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create snapshot
      const snapshot = {
        dataset: dataset,
        pairs: pairs || [],
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('dataset_versions')
        .insert({
          dataset_id: datasetId,
          version_number: nextVersion,
          name: name || `Version ${nextVersion}`,
          description,
          snapshot,
          pairs_count: pairs?.length || 0,
          tokens_count: dataset.total_tokens || 0,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dataset-versions', variables.datasetId] });
      toast({ title: 'Version created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create version', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRestoreVersion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ versionId, datasetId }: { versionId: string; datasetId: string }) => {
      // Get the version snapshot
      const { data: version, error: versionError } = await supabase
        .from('dataset_versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (versionError) throw versionError;

      const snapshot = version.snapshot as { dataset: Record<string, unknown>; pairs: Record<string, unknown>[] };

      // Delete current pairs
      await supabase
        .from('training_pairs')
        .delete()
        .eq('dataset_id', datasetId);

      // Restore pairs from snapshot
      if (snapshot.pairs && snapshot.pairs.length > 0) {
        const pairsToInsert = snapshot.pairs.map((pair) => ({
          dataset_id: datasetId,
          user_message: pair.user_message as string,
          assistant_message: pair.assistant_message as string,
          system_message: pair.system_message as string | null,
          token_count: pair.token_count as number | null,
          quality_score: pair.quality_score as number | null,
          is_valid: pair.is_valid as boolean,
        }));

        const { error: insertError } = await supabase
          .from('training_pairs')
          .insert(pairsToInsert);

        if (insertError) throw insertError;
      }

      // Update dataset stats
      const { error: updateError } = await supabase
        .from('training_datasets')
        .update({
          total_pairs: snapshot.pairs?.length || 0,
          total_tokens: version.tokens_count || 0,
        })
        .eq('id', datasetId);

      if (updateError) throw updateError;

      return version;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dataset-versions', variables.datasetId] });
      queryClient.invalidateQueries({ queryKey: ['training-pairs'] });
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast({ title: 'Version restored successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to restore version', description: error.message, variant: 'destructive' });
    },
  });
}
