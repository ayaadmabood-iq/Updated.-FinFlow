import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Settings2, Scissors, Save, RotateCcw, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { ChunkStrategy, ChunkingSettings } from '@/types';

interface ChunkingSettingsCardProps {
  projectId: string;
  initialSettings: ChunkingSettings;
  onSave: (settings: ChunkingSettings) => Promise<void>;
  onReindexAll?: () => Promise<void>;
  documentCount?: number;
  isLoading?: boolean;
}

const STRATEGY_INFO: Record<ChunkStrategy, { label: string; description: string }> = {
  fixed: {
    label: 'Fixed Size',
    description: 'Character-based splitting. Fast but may break mid-sentence.',
  },
  sentence: {
    label: 'Sentence-Based',
    description: 'Splits at sentence boundaries. Good for maintaining readability.',
  },
  semantic: {
    label: 'Semantic (Heuristic)',
    description: 'Heuristic-based segmentation. Good balance of speed and quality.',
  },
  heuristic_semantic: {
    label: 'Heuristic Semantic',
    description: 'Same as Semantic but explicitly named. Uses sentence structure.',
  },
  embedding_cluster: {
    label: 'Embedding Cluster (AI)',
    description: 'Uses AI embeddings to detect semantic boundaries. Requires OpenAI API.',
  },
};

function estimateChunkCount(textLength: number, chunkSize: number, chunkOverlap: number): number {
  if (chunkSize <= chunkOverlap) return 1;
  const effectiveChunkSize = chunkSize - chunkOverlap;
  return Math.max(1, Math.ceil(textLength / effectiveChunkSize));
}

export function ChunkingSettingsCard({
  projectId,
  initialSettings,
  onSave,
  onReindexAll,
  documentCount = 0,
  isLoading = false,
}: ChunkingSettingsCardProps) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<ChunkingSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = <K extends keyof ChunkingSettings>(key: K, value: ChunkingSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleReset = () => {
    setSettings(initialSettings);
    setHasChanges(false);
  };

  const handleSave = async () => {
    if (settings.chunkSize < 100 || settings.chunkSize > 10000) {
      toast.error('Chunk size must be between 100 and 10,000 characters');
      return;
    }
    if (settings.chunkOverlap < 0 || settings.chunkOverlap >= settings.chunkSize) {
      toast.error('Overlap must be non-negative and less than chunk size');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(settings);
      setHasChanges(false);
      toast.success('Chunking settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReindexAll = async () => {
    if (!onReindexAll) return;
    setIsReindexing(true);
    try {
      await onReindexAll();
      toast.success(`Re-indexing started for ${documentCount} documents`);
    } catch {
      toast.error('Failed to start re-indexing');
    } finally {
      setIsReindexing(false);
    }
  };

  // Estimate chunks for a sample 10,000 character document
  const estimatedChunks = estimateChunkCount(10000, settings.chunkSize, settings.chunkOverlap);
  const overlapRatio = ((settings.chunkOverlap / settings.chunkSize) * 100).toFixed(0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5" />
          Chunking Settings
        </CardTitle>
        <CardDescription>
          Configure how documents are split into chunks. Changes apply to newly processed documents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Strategy Selection */}
        <div className="space-y-2">
          <Label htmlFor="chunk-strategy">Chunking Strategy</Label>
          <Select
            value={settings.chunkStrategy}
            onValueChange={(value) => handleChange('chunkStrategy', value as ChunkStrategy)}
          >
            <SelectTrigger id="chunk-strategy">
              <SelectValue placeholder="Select strategy" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STRATEGY_INFO) as ChunkStrategy[]).map((strategy) => (
                <SelectItem key={strategy} value={strategy}>
                  {STRATEGY_INFO[strategy].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {STRATEGY_INFO[settings.chunkStrategy].description}
          </p>
        </div>

        {/* Chunk Size */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="chunk-size">Chunk Size (characters)</Label>
            <span className="text-sm font-medium tabular-nums">{settings.chunkSize.toLocaleString()}</span>
          </div>
          <Slider
            id="chunk-size"
            value={[settings.chunkSize]}
            onValueChange={([value]) => handleChange('chunkSize', value)}
            min={100}
            max={5000}
            step={100}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>100 (fine-grained)</span>
            <span>5,000 (coarse)</span>
          </div>
        </div>

        {/* Overlap */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="chunk-overlap">Overlap (characters)</Label>
            <span className="text-sm font-medium tabular-nums">{settings.chunkOverlap.toLocaleString()}</span>
          </div>
          <Slider
            id="chunk-overlap"
            value={[settings.chunkOverlap]}
            onValueChange={([value]) => handleChange('chunkOverlap', value)}
            min={0}
            max={Math.min(500, settings.chunkSize - 50)}
            step={10}
            className="py-2"
          />
        </div>

        {/* Preview */}
        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium mb-2">
            <Settings2 className="h-4 w-4" />
            Chunk Estimate Preview
          </div>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Est. chunks per 10,000 chars: <span className="font-medium text-foreground">~{estimatedChunks}</span></li>
            <li>• Overlap ratio: <span className="font-medium text-foreground">{overlapRatio}%</span></li>
            <li>• RTL/Arabic support: <span className="font-medium text-green-600">Yes</span></li>
            {documentCount > 0 && (
              <li>• Documents to re-index: <span className="font-medium text-foreground">{documentCount}</span></li>
            )}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={!hasChanges || isSaving || isLoading} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges || isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>

        {/* Re-index All Documents */}
        {onReindexAll && documentCount > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="secondary" className="w-full" disabled={isReindexing || isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isReindexing ? 'animate-spin' : ''}`} />
                {isReindexing ? 'Re-indexing...' : 'Save & Re-index All Documents'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Re-index All Documents?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will re-process <strong>{documentCount}</strong> documents with the new chunking settings.
                  Old chunks will be deleted and replaced. This may take several minutes and consume API credits.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReindexAll}>
                  Confirm Re-index
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
}
