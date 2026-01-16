import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useTrainingDatasets, useDownloadJsonl } from '@/hooks/useTraining';
import { GenerateDatasetDialog } from './GenerateDatasetDialog';
import { DatasetPreview } from './DatasetPreview';
import { TrainingPipelineStepper, getStageFromStatus } from './TrainingPipelineStepper';
import type { TrainingDataset } from '@/services/trainingService';
import { format } from 'date-fns';
import {
  Database,
  Plus,
  Sparkles,
  FileJson,
  Download,
  Eye,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  BarChart3,
  Layers,
} from 'lucide-react';

interface DatasetBuilderDashboardProps {
  projectId: string;
  documentCount: number;
}

const statusConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  draft: { icon: Clock, color: 'bg-muted text-muted-foreground' },
  generating: { icon: Loader2, color: 'bg-blue-100 text-blue-800' },
  ready: { icon: CheckCircle2, color: 'bg-green-100 text-green-800' },
  training: { icon: Play, color: 'bg-purple-100 text-purple-800' },
  completed: { icon: CheckCircle2, color: 'bg-primary/20 text-primary' },
  failed: { icon: XCircle, color: 'bg-destructive/20 text-destructive' },
};

export function DatasetBuilderDashboard({ projectId, documentCount }: DatasetBuilderDashboardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('datasets');
  
  const { data: datasets, isLoading } = useTrainingDatasets(projectId);
  const downloadMutation = useDownloadJsonl();

  const readyDatasets = datasets?.filter(d => d.status === 'ready' || d.status === 'completed') || [];
  const inProgressDatasets = datasets?.filter(d => d.status === 'generating' || d.status === 'training') || [];
  
  // Calculate aggregate stats
  const totalPairs = datasets?.reduce((sum, d) => sum + d.totalPairs, 0) || 0;
  const totalTokens = datasets?.reduce((sum, d) => sum + d.totalTokens, 0) || 0;
  const avgQuality = datasets?.length 
    ? datasets.reduce((sum, d) => sum + (d.validationResult?.stats?.avgQualityScore || 0), 0) / datasets.length 
    : 0;

  const handleSelectDataset = (dataset: TrainingDataset) => {
    // Navigate to dataset detail page
    navigate(`/datasets/${dataset.id}`);
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={config.color}>
        <Icon className={`h-3 w-3 me-1 ${status === 'generating' ? 'animate-spin' : ''}`} />
        {status}
      </Badge>
    );
  };

  if (selectedDatasetId && activeTab === 'preview') {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedDatasetId(null);
            setActiveTab('datasets');
          }}
        >
          ← {t('common.back', 'Back to Datasets')}
        </Button>
        <DatasetPreview 
          datasetId={selectedDatasetId} 
          projectId={projectId}
          onClose={() => {
            setSelectedDatasetId(null);
            setActiveTab('datasets');
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t('training.datasetBuilder', 'Dataset Builder')}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {t('training.datasetBuilderDesc', 'Create and manage training datasets from your documents')}
          </p>
        </div>
        <Button onClick={() => setShowGenerateDialog(true)} disabled={documentCount === 0}>
          <Plus className="h-4 w-4 me-2" />
          {t('training.newDataset', 'New Dataset')}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{datasets?.length || 0}</p>
                <p className="text-xs text-muted-foreground">{t('training.totalDatasets', 'Datasets')}</p>
              </div>
              <Database className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{totalPairs.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{t('training.totalPairs', 'Training Pairs')}</p>
              </div>
              <Layers className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{(totalTokens / 1000).toFixed(1)}k</p>
                <p className="text-xs text-muted-foreground">{t('training.totalTokens', 'Tokens')}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{avgQuality.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">{t('training.avgQuality', 'Avg Quality')}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* In-Progress Jobs */}
      {inProgressDatasets.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('training.inProgress', 'In Progress')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inProgressDatasets.map((dataset) => {
              const { stage, stageStatus } = getStageFromStatus(dataset.status);
              return (
                <div key={dataset.id} className="p-3 bg-background rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">{dataset.name}</p>
                      <p className="text-xs text-muted-foreground">{dataset.format.toUpperCase()}</p>
                    </div>
                    {getStatusBadge(dataset.status)}
                  </div>
                  <TrainingPipelineStepper 
                    currentStage={stage} 
                    stageStatus={stageStatus}
                    compact 
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Datasets List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="datasets">
            <FileJson className="h-4 w-4 me-2" />
            {t('training.allDatasets', 'All Datasets')}
            {datasets?.length ? ` (${datasets.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="ready">
            <CheckCircle2 className="h-4 w-4 me-2" />
            {t('training.readyForTraining', 'Ready')}
            {readyDatasets.length ? ` (${readyDatasets.length})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="datasets" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !datasets?.length ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {t('training.noDatasets', 'No Datasets Yet')}
                </h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  {t('training.noDatasetsDesc', 'Generate your first training dataset from your processed documents.')}
                </p>
                <Button onClick={() => setShowGenerateDialog(true)}>
                  <Plus className="h-4 w-4 me-2" />
                  {t('training.createFirst', 'Create Dataset')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {datasets.map((dataset) => (
                <DatasetCard
                  key={dataset.id}
                  dataset={dataset}
                  onView={() => handleSelectDataset(dataset)}
                  onDownload={() => downloadMutation.mutate(dataset.id)}
                  isDownloading={downloadMutation.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ready" className="mt-4">
          {readyDatasets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {t('training.noReadyDatasets', 'No Ready Datasets')}
                </h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {t('training.noReadyDatasetsDesc', 'Generate a dataset and wait for it to complete before starting training.')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {readyDatasets.map((dataset) => (
                <DatasetCard
                  key={dataset.id}
                  dataset={dataset}
                  onView={() => handleSelectDataset(dataset)}
                  onDownload={() => downloadMutation.mutate(dataset.id)}
                  isDownloading={downloadMutation.isPending}
                  showTrainButton
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Generate Dialog */}
      <GenerateDatasetDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
        projectId={projectId}
        documentCount={documentCount}
      />
    </div>
  );
}

interface DatasetCardProps {
  dataset: TrainingDataset;
  onView: () => void;
  onDownload: () => void;
  isDownloading?: boolean;
  showTrainButton?: boolean;
}

function DatasetCard({ dataset, onView, onDownload, isDownloading, showTrainButton }: DatasetCardProps) {
  const { t } = useTranslation();
  const config = statusConfig[dataset.status] || statusConfig.draft;
  const Icon = config.icon;
  
  const validation = dataset.validationResult;
  const qualityScore = validation?.stats?.avgQualityScore || 0;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <FileJson className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{dataset.name}</span>
            </CardTitle>
            <CardDescription className="mt-1">
              {dataset.format.toUpperCase()} • {dataset.pairGenerationMode} mode • 
              {format(new Date(dataset.createdAt), 'PPp')}
            </CardDescription>
          </div>
          <Badge variant="outline" className={config.color}>
            <Icon className={`h-3 w-3 me-1 ${dataset.status === 'generating' ? 'animate-spin' : ''}`} />
            {dataset.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-lg font-bold">{dataset.totalPairs}</p>
            <p className="text-xs text-muted-foreground">{t('training.pairs', 'Pairs')}</p>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-lg font-bold">{(dataset.totalTokens / 1000).toFixed(1)}k</p>
            <p className="text-xs text-muted-foreground">{t('training.tokens', 'Tokens')}</p>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-lg font-bold">${dataset.estimatedCost?.toFixed(2) || '0'}</p>
            <p className="text-xs text-muted-foreground">{t('training.cost', 'Cost')}</p>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-lg font-bold">{qualityScore.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">{t('training.quality', 'Quality')}</p>
          </div>
        </div>

        {/* Quality Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t('training.dataQuality', 'Data Quality')}</span>
            <span>{qualityScore.toFixed(0)}%</span>
          </div>
          <Progress value={qualityScore} className="h-1.5" />
        </div>

        {/* Validation Warnings */}
        {validation && !validation.valid && (
          <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded">
            <AlertTriangle className="h-3 w-3" />
            <span>{validation.errors.length} {t('training.validationIssues', 'validation issues')}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
            <Eye className="h-4 w-4 me-1" />
            {t('training.viewEdit', 'View & Edit')}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onDownload}
            disabled={isDownloading || !dataset.jsonlContent}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
          {showTrainButton && (
            <Button size="sm" onClick={onView}>
              <Play className="h-4 w-4 me-1" />
              {t('training.train', 'Train')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
