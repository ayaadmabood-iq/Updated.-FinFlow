import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTrainingDataset, useTrainingPairs, useDownloadJsonl, useDeleteDataset } from '@/hooks/useTraining';
import { PairEditor } from '@/components/training/PairEditor';
import { TrainingPipelineStepper, getStageFromStatus } from '@/components/training/TrainingPipelineStepper';
import { StartTrainingDialog } from '@/components/training/StartTrainingDialog';
import { CostPreviewModal } from '@/components/training/CostPreviewModal';
import { DatasetVersionControl } from '@/components/training/DatasetVersionControl';
import { supabase } from '@/integrations/supabase/client';
import type { TrainingPair } from '@/services/trainingService';
import {
  ArrowLeft,
  Download,
  Trash2,
  Play,
  MessageSquare,
  FileJson,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  User,
  Bot,
  Settings2,
} from 'lucide-react';

export default function DatasetDetail() {
  const { t } = useTranslation();
  const { id: datasetId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [page, setPage] = useState(1);
  const [selectedPairIndex, setSelectedPairIndex] = useState(0);
  const [showTrainingDialog, setShowTrainingDialog] = useState(false);
  const [showCostPreview, setShowCostPreview] = useState(false);
  const [sourceChunkContent, setSourceChunkContent] = useState<string | undefined>();
  const pageSize = 20;

  const { data: dataset, isLoading: datasetLoading } = useTrainingDataset(datasetId || '');
  const { data: pairsResult, isLoading: pairsLoading } = useTrainingPairs(datasetId || '', page, pageSize);
  const downloadMutation = useDownloadJsonl();
  
  // Get projectId from dataset data
  const projectId = dataset?.projectId;
  const deleteMutation = useDeleteDataset(projectId || '');

  const pairs = pairsResult?.data || [];
  const totalPairs = pairsResult?.total || 0;
  const totalPages = Math.ceil(totalPairs / pageSize);
  const selectedPair = pairs[selectedPairIndex];

  // Fetch source chunk content when pair changes
  useEffect(() => {
    if (selectedPair?.sourceChunkId) {
      supabase
        .from('chunks')
        .select('content')
        .eq('id', selectedPair.sourceChunkId)
        .single()
        .then(({ data }) => {
          setSourceChunkContent(data?.content);
        });
    } else {
      setSourceChunkContent(undefined);
    }
  }, [selectedPair?.sourceChunkId]);

  const handleNavigatePair = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && selectedPairIndex > 0) {
      setSelectedPairIndex(selectedPairIndex - 1);
    } else if (direction === 'next' && selectedPairIndex < pairs.length - 1) {
      setSelectedPairIndex(selectedPairIndex + 1);
    } else if (direction === 'next' && selectedPairIndex === pairs.length - 1 && page < totalPages) {
      setPage(page + 1);
      setSelectedPairIndex(0);
    } else if (direction === 'prev' && selectedPairIndex === 0 && page > 1) {
      setPage(page - 1);
      setSelectedPairIndex(pageSize - 1);
    }
  };

  const handleStartTrainingClick = () => {
    // Show cost preview first
    setShowCostPreview(true);
  };

  const handleCostApproved = () => {
    setShowCostPreview(false);
    setShowTrainingDialog(true);
  };

  const handleTrainingStarted = (jobId: string) => {
    navigate(`/training/${jobId}`);
  };

  const handleDelete = async () => {
    if (!datasetId) return;
    if (confirm(t('training.confirmDeleteDataset', 'Are you sure you want to delete this dataset?'))) {
      await deleteMutation.mutateAsync(datasetId);
      navigate(`/datasets?project=${projectId}`);
    }
  };

  if (datasetLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!dataset) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('training.datasetNotFound', 'Dataset Not Found')}</h3>
            <Button asChild>
              <Link to={`/datasets?project=${projectId}`}>
                <ArrowLeft className="h-4 w-4 me-2" />
                {t('common.back', 'Back')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const { stage, stageStatus } = getStageFromStatus(dataset.status);
  const validation = dataset.validationResult;
  const canStartTraining = dataset.status === 'ready' && dataset.jsonlContent;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2">
              <Link to={`/datasets?project=${projectId}`}>
                <ArrowLeft className="h-4 w-4 me-1" />
                {t('common.back', 'Back to Datasets')}
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">{dataset.name}</h1>
            <p className="text-muted-foreground mt-1">
              {dataset.format.toUpperCase()} • {dataset.pairGenerationMode} mode
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={dataset.status === 'ready' ? 'default' : 'secondary'}>
              {dataset.status}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadMutation.mutate(datasetId!)}
              disabled={downloadMutation.isPending || !dataset.jsonlContent}
            >
              {downloadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleStartTrainingClick}
              disabled={!canStartTraining}
            >
              <Play className="h-4 w-4 me-2" />
              {t('training.startTraining', 'Start Training')}
            </Button>
          </div>
        </div>

        {/* Pipeline Stepper */}
        {(dataset.status === 'generating' || dataset.status === 'training') && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <TrainingPipelineStepper currentStage={stage} stageStatus={stageStatus} />
            </CardContent>
          </Card>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{dataset.totalPairs}</p>
              <p className="text-xs text-muted-foreground">{t('training.pairs', 'Pairs')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{(dataset.totalTokens / 1000).toFixed(1)}k</p>
              <p className="text-xs text-muted-foreground">{t('training.tokens', 'Tokens')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">${dataset.estimatedCost?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-muted-foreground">{t('training.estCost', 'Est. Cost')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{validation?.stats?.avgQualityScore?.toFixed(0) || 0}%</p>
              <p className="text-xs text-muted-foreground">{t('training.quality', 'Quality')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Validation Status */}
        {validation && (
          <Card className={validation.valid ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20' : 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20'}>
            <CardContent className="pt-4 space-y-2">
              {validation.valid ? (
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">{t('training.validationPassed', 'Dataset passes validation')}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">{t('training.validationIssues', 'Validation issues found')}</span>
                  </div>
                  {validation.errors.map((error, i) => (
                    <p key={i} className="text-sm text-destructive ps-7">• {error}</p>
                  ))}
                  {validation.warnings.map((warning, i) => (
                    <p key={i} className="text-sm text-yellow-600 ps-7">• {warning}</p>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="pairs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pairs">
              <MessageSquare className="h-4 w-4 me-2" />
              {t('training.editPairs', 'Edit Pairs')} ({totalPairs})
            </TabsTrigger>
            <TabsTrigger value="jsonl">
              <FileJson className="h-4 w-4 me-2" />
              {t('training.jsonlPreview', 'JSONL Preview')}
            </TabsTrigger>
            <TabsTrigger value="versions">
              <GitBranch className="h-4 w-4 me-2" />
              {t('training.versions', 'Versions')}
            </TabsTrigger>
          </TabsList>

          {/* Pairs Editor Tab */}
          <TabsContent value="pairs" className="space-y-4">
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Pair List */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{t('training.pairList', 'Pair List')}</CardTitle>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <span className="text-xs">{page}/{totalPages}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    {pairsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : pairs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        {t('training.noPairs', 'No pairs in this dataset')}
                      </div>
                    ) : (
                      <div className="divide-y">
                        {pairs.map((pair, index) => (
                          <button
                            key={pair.id}
                            className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${
                              selectedPairIndex === index ? 'bg-primary/10 border-s-2 border-primary' : ''
                            }`}
                            onClick={() => setSelectedPairIndex(index)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  #{(page - 1) * pageSize + index + 1}
                                </p>
                                <p className="text-sm truncate">{pair.userMessage}</p>
                              </div>
                              {!pair.isValid && (
                                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Pair Editor */}
              <div className="lg:col-span-2">
                {selectedPair ? (
                  <PairEditor
                    pair={selectedPair}
                    datasetId={datasetId!}
                    sourceChunkContent={sourceChunkContent}
                    onNavigate={handleNavigatePair}
                    hasPrev={selectedPairIndex > 0 || page > 1}
                    hasNext={selectedPairIndex < pairs.length - 1 || page < totalPages}
                    pairIndex={(page - 1) * pageSize + selectedPairIndex}
                    totalPairs={totalPairs}
                  />
                ) : (
                  <Card className="h-full flex items-center justify-center">
                    <CardContent className="text-center py-12">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {t('training.selectPair', 'Select a pair to edit')}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* JSONL Preview Tab */}
          <TabsContent value="jsonl">
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all">
                    {dataset.jsonlContent?.split('\n').slice(0, 50).join('\n') || t('training.noJsonl', 'No JSONL content generated yet')}
                    {dataset.jsonlContent && dataset.jsonlContent.split('\n').length > 50 && (
                      <span className="text-muted-foreground">
                        {'\n\n... and ' + (dataset.jsonlContent.split('\n').length - 50) + ' more lines'}
                      </span>
                    )}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Versions Tab */}
          <TabsContent value="versions">
            <DatasetVersionControl 
              datasetId={datasetId!}
              datasetName={dataset.name}
              currentPairsCount={dataset.totalPairs}
              currentTokensCount={dataset.totalTokens}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Cost Preview Modal */}
      {dataset && (
        <CostPreviewModal
          open={showCostPreview}
          onOpenChange={setShowCostPreview}
          dataset={dataset}
          projectId={projectId!}
          onApprove={handleCostApproved}
        />
      )}

      {/* Start Training Dialog */}
      <StartTrainingDialog
        open={showTrainingDialog}
        onOpenChange={setShowTrainingDialog}
        datasetId={datasetId!}
        datasetName={dataset.name}
        onStarted={handleTrainingStarted}
      />
    </DashboardLayout>
  );
}
