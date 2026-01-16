import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTrainingDatasets } from '@/hooks/useTraining';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Database, Sparkles } from 'lucide-react';

interface AddToDatasetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  chunkIds: string[];
  documentId: string;
  onSuccess?: () => void;
}

export function AddToDatasetDialog({
  open,
  onOpenChange,
  projectId,
  chunkIds,
  documentId,
  onSuccess,
}: AddToDatasetDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: datasets, isLoading: datasetsLoading } = useTrainingDatasets(projectId);
  
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [newDatasetName, setNewDatasetName] = useState('');
  const [newDatasetDescription, setNewDatasetDescription] = useState('');
  const [generatePairs, setGeneratePairs] = useState(true);

  // Create new dataset mutation
  const createDatasetMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('training_datasets')
        .insert({
          project_id: projectId,
          user_id: user.id,
          name: newDatasetName.trim(),
          description: newDatasetDescription.trim() || null,
          format: 'openai',
          pair_generation_mode: 'qa',
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Add chunks to dataset mutation
  const addChunksMutation = useMutation({
    mutationFn: async (datasetId: string) => {
      // First check for duplicates
      const { data: existing } = await supabase
        .from('training_pairs')
        .select('source_chunk_id')
        .eq('dataset_id', datasetId)
        .in('source_chunk_id', chunkIds);

      const existingChunkIds = new Set(existing?.map(e => e.source_chunk_id) || []);
      const newChunkIds = chunkIds.filter(id => !existingChunkIds.has(id));

      if (newChunkIds.length === 0) {
        throw new Error('All selected chunks are already in this dataset');
      }

      // If generating pairs, call the edge function
      if (generatePairs) {
        const { data, error } = await supabase.functions.invoke('generate-training-data', {
          body: {
            projectId,
            datasetId,
            chunkIds: newChunkIds,
            mode: 'qa',
            documentId,
          },
        });

        if (error) throw error;
        return { ...data, addedCount: newChunkIds.length, skippedCount: existingChunkIds.size };
      } else {
        // Just add placeholder pairs for manual editing
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const pairs = newChunkIds.map(chunkId => ({
          dataset_id: datasetId,
          source_chunk_id: chunkId,
          source_document_id: documentId,
          user_message: '[Edit this prompt]',
          assistant_message: '[Edit this response]',
          is_valid: false,
        }));

        const { error } = await supabase
          .from('training_pairs')
          .insert(pairs);

        if (error) throw error;
        return { addedCount: newChunkIds.length, skippedCount: existingChunkIds.size };
      }
    },
  });

  const handleSubmit = async () => {
    try {
      let targetDatasetId = selectedDatasetId;

      if (mode === 'new') {
        if (!newDatasetName.trim()) {
          toast({
            variant: 'destructive',
            title: 'Name required',
            description: 'Please enter a name for the new dataset',
          });
          return;
        }
        const newDataset = await createDatasetMutation.mutateAsync();
        targetDatasetId = newDataset.id;
      }

      if (!targetDatasetId) {
        toast({
          variant: 'destructive',
          title: 'Dataset required',
          description: 'Please select or create a dataset',
        });
        return;
      }

      const result = await addChunksMutation.mutateAsync(targetDatasetId);

      queryClient.invalidateQueries({ queryKey: ['trainingDatasets', projectId] });
      queryClient.invalidateQueries({ queryKey: ['trainingPairs', targetDatasetId] });

      toast({
        title: 'Chunks added to dataset',
        description: `Added ${result.addedCount} chunks${result.skippedCount > 0 ? `, skipped ${result.skippedCount} duplicates` : ''}`,
      });

      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setMode('existing');
      setSelectedDatasetId('');
      setNewDatasetName('');
      setNewDatasetDescription('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to add chunks',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  const isSubmitting = createDatasetMutation.isPending || addChunksMutation.isPending;
  const hasExistingDatasets = datasets && datasets.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t('training.addToDataset', 'Add to Dataset')}
          </DialogTitle>
          <DialogDescription>
            {t('training.addToDatasetDesc', 'Add {{count}} chunks to a training dataset', { count: chunkIds.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Mode Selection */}
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'existing' | 'new')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="existing" id="existing" disabled={!hasExistingDatasets} />
              <Label htmlFor="existing" className={!hasExistingDatasets ? 'text-muted-foreground' : ''}>
                {t('training.addToExisting', 'Add to existing dataset')}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new">{t('training.createNew', 'Create new dataset')}</Label>
            </div>
          </RadioGroup>

          {/* Existing Dataset Selection */}
          {mode === 'existing' && (
            <div className="space-y-2">
              <Label>{t('training.selectDataset', 'Select Dataset')}</Label>
              <Select value={selectedDatasetId} onValueChange={setSelectedDatasetId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('training.chooseDataset', 'Choose a dataset...')} />
                </SelectTrigger>
                <SelectContent>
                  {datasetsLoading ? (
                    <div className="p-2 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : datasets?.length ? (
                    datasets.map((dataset) => (
                      <SelectItem key={dataset.id} value={dataset.id}>
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          <span>{dataset.name}</span>
                          <span className="text-muted-foreground text-xs">
                            ({dataset.totalPairs} pairs)
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-center text-muted-foreground text-sm">
                      {t('training.noDatasets', 'No datasets yet')}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* New Dataset Form */}
          {mode === 'new' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('training.datasetName', 'Dataset Name')} *</Label>
                <Input
                  value={newDatasetName}
                  onChange={(e) => setNewDatasetName(e.target.value)}
                  placeholder={t('training.datasetNamePlaceholder', 'e.g., Customer Support QA')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('training.datasetDescription', 'Description (optional)')}</Label>
                <Textarea
                  value={newDatasetDescription}
                  onChange={(e) => setNewDatasetDescription(e.target.value)}
                  placeholder={t('training.datasetDescPlaceholder', 'Describe the purpose of this dataset...')}
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Generate Pairs Option */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="generatePairs"
                checked={generatePairs}
                onChange={(e) => setGeneratePairs(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="generatePairs" className="font-medium cursor-pointer">
                {t('training.autoGeneratePairs', 'Auto-generate instruction pairs')}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ps-5">
              {generatePairs
                ? t('training.willGeneratePairs', 'AI will generate Q&A pairs from the chunks automatically')
                : t('training.manualPairs', 'Chunks will be added for manual pair creation')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                {t('common.adding', 'Adding...')}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 me-2" />
                {t('training.addChunks', 'Add Chunks')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
