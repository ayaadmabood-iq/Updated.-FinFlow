import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTrainingDatasets } from '@/hooks/useTraining';
import { 
  FileJson, 
  Plus, 
  Loader2, 
  Database,
  Clock,
} from 'lucide-react';
import type { TrainingDataset } from '@/services/trainingService';

interface DatasetListProps {
  projectId: string;
  onSelect: (datasetId: string) => void;
  onGenerate: () => void;
}

export function DatasetList({ projectId, onSelect, onGenerate }: DatasetListProps) {
  const { t } = useTranslation();
  const { data: datasets, isLoading } = useTrainingDatasets(projectId);

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    generating: 'bg-yellow-100 text-yellow-700',
    ready: 'bg-green-100 text-green-700',
    training: 'bg-blue-100 text-blue-700',
    completed: 'bg-purple-100 text-purple-700',
    failed: 'bg-red-100 text-red-700',
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!datasets || datasets.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">
          {t('training.noDatasets', 'No Training Datasets')}
        </h3>
        <p className="text-muted-foreground mb-6">
          {t('training.noDatasetsDesc', 'Generate your first training dataset from your documents')}
        </p>
        <Button onClick={onGenerate}>
          <Plus className="mr-2 h-4 w-4" />
          {t('training.generateFirst', 'Generate Dataset')}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {t('training.datasets', 'Training Datasets')} ({datasets.length})
        </h3>
        <Button onClick={onGenerate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t('training.newDataset', 'New Dataset')}
        </Button>
      </div>

      <div className="grid gap-3">
        {datasets.map((dataset) => (
          <DatasetCard
            key={dataset.id}
            dataset={dataset}
            statusColors={statusColors}
            onClick={() => onSelect(dataset.id)}
          />
        ))}
      </div>
    </div>
  );
}

function DatasetCard({
  dataset,
  statusColors,
  onClick,
}: {
  dataset: TrainingDataset;
  statusColors: Record<string, string>;
  onClick: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileJson className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">{dataset.name}</h4>
              <p className="text-sm text-muted-foreground">
                {dataset.format.toUpperCase()} • {dataset.pairGenerationMode}
              </p>
            </div>
          </div>
          <Badge className={statusColors[dataset.status] || statusColors.draft}>
            {dataset.status}
          </Badge>
        </div>

        <div className="flex items-center gap-6 mt-4 text-sm">
          <div>
            <span className="text-muted-foreground">{t('training.pairs', 'Pairs')}:</span>{' '}
            <span className="font-medium">{dataset.totalPairs}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t('training.tokens', 'Tokens')}:</span>{' '}
            <span className="font-medium">{(dataset.totalTokens / 1000).toFixed(1)}k</span>
          </div>
          {dataset.estimatedCost && dataset.estimatedCost > 0 && (
            <div>
              <span className="text-muted-foreground">{t('training.cost', 'Cost')}:</span>{' '}
              <span className="font-medium">${dataset.estimatedCost.toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-muted-foreground ml-auto">
            <Clock className="h-3.5 w-3.5" />
            <span>{new Date(dataset.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
