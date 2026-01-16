import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VirtualizedList } from '@/components/ui/virtualized-list';
import { useTrainingDataset, useTrainingPairs, useDownloadJsonl, useDeleteDataset } from '@/hooks/useTraining';
import { StartTrainingDialog } from './StartTrainingDialog';
import { 
  Download, 
  Trash2, 
  FileJson, 
  AlertCircle, 
  CheckCircle, 
  AlertTriangle,
  MessageSquare,
  Bot,
  User,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Play,
} from 'lucide-react';
import type { TrainingPair } from '@/services/trainingService';

interface DatasetPreviewProps {
  datasetId: string;
  projectId: string;
  onClose?: () => void;
  onTrainingStarted?: (jobId: string) => void;
}

export function DatasetPreview({ datasetId, projectId, onClose, onTrainingStarted }: DatasetPreviewProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [showTrainingDialog, setShowTrainingDialog] = useState(false);
  const pageSize = 50; // Increased page size since we're virtualizing

  const { data: dataset, isLoading: datasetLoading } = useTrainingDataset(datasetId);
  const { data: pairsResult, isLoading: pairsLoading } = useTrainingPairs(datasetId, page, pageSize);
  const downloadMutation = useDownloadJsonl();
  const deleteMutation = useDeleteDataset(projectId);

  const handleTrainingStarted = (jobId: string) => {
    setShowTrainingDialog(false);
    onTrainingStarted?.(jobId);
  };

  const canStartTraining = dataset?.status === 'ready' && dataset.jsonlContent;

  if (datasetLoading) {
    return (
      <Card className="h-full flex items-center justify-center" role="status" aria-label="Loading dataset">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Loading dataset...</span>
      </Card>
    );
  }

  if (!dataset) {
    return (
      <Card className="h-full flex items-center justify-center" role="alert">
        <p className="text-muted-foreground">Dataset not found</p>
      </Card>
    );
  }

  const validation = dataset.validationResult;
  const totalPages = Math.ceil((pairsResult?.total || 0) / pageSize);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{dataset.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {dataset.format.toUpperCase()} • {dataset.pairGenerationMode} mode
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge 
              variant={dataset.status === 'ready' ? 'default' : dataset.status === 'training' ? 'secondary' : 'outline'}
              aria-label={`Status: ${dataset.status}`}
            >
              {dataset.status}
            </Badge>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowTrainingDialog(true)}
              disabled={!canStartTraining}
              className="gap-1"
              aria-label="Start training with this dataset"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('training.startTraining', 'Start Training')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadMutation.mutate(datasetId)}
              disabled={downloadMutation.isPending || !dataset.jsonlContent}
              aria-label="Download dataset as JSONL"
            >
              {downloadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Delete this dataset?')) {
                  deleteMutation.mutate(datasetId);
                  onClose?.();
                }
              }}
              aria-label="Delete dataset"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Stats - responsive grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4" role="group" aria-label="Dataset statistics">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xl sm:text-2xl font-bold">{dataset.totalPairs}</p>
            <p className="text-xs text-muted-foreground">{t('training.pairs', 'Pairs')}</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xl sm:text-2xl font-bold">{(dataset.totalTokens / 1000).toFixed(1)}k</p>
            <p className="text-xs text-muted-foreground">{t('training.tokens', 'Tokens')}</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xl sm:text-2xl font-bold">${dataset.estimatedCost?.toFixed(2) || '0.00'}</p>
            <p className="text-xs text-muted-foreground">{t('training.estCost', 'Est. Cost')}</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xl sm:text-2xl font-bold">{validation?.stats.avgQualityScore || 0}</p>
            <p className="text-xs text-muted-foreground">{t('training.quality', 'Quality')}</p>
          </div>
        </div>

        {/* Validation Status */}
        {validation && (
          <div className="mt-4 space-y-2" role="status" aria-label="Validation results">
            {validation.valid ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                <span>{t('training.validationPassed', 'Dataset passes validation')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <span>{t('training.validationFailed', 'Validation errors found')}</span>
              </div>
            )}
            {validation.errors.map((error, i) => (
              <p key={i} className="text-sm text-destructive pl-6" role="alert">• {error}</p>
            ))}
            {validation.warnings.map((warning, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-yellow-600 pl-6" role="alert">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <Tabs defaultValue="pairs" className="h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b px-4">
            <TabsTrigger value="pairs">
              <MessageSquare className="h-4 w-4 mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">{t('training.trainingPairs', 'Training Pairs')}</span>
              <span className="sm:hidden">Pairs</span>
            </TabsTrigger>
            <TabsTrigger value="jsonl">
              <FileJson className="h-4 w-4 mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">{t('training.jsonlPreview', 'JSONL Preview')}</span>
              <span className="sm:hidden">JSONL</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pairs" className="flex-1 m-0 overflow-hidden flex flex-col">
            {pairsLoading ? (
              <div className="flex justify-center py-8" role="status">
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                <span className="sr-only">Loading training pairs...</span>
              </div>
            ) : pairsResult?.data && pairsResult.data.length > 0 ? (
              <VirtualizedList
                items={pairsResult.data}
                height={400}
                estimateSize={150}
                getItemKey={(pair) => pair.id}
                renderItem={(pair) => (
                  <div className="p-4 pb-0">
                    <TrainingPairCard pair={pair} />
                  </div>
                )}
                aria-label="Training pairs list"
                className="flex-1"
              />
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                No training pairs found
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <nav 
                className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t gap-2"
                role="navigation"
                aria-label="Training pairs pagination"
              >
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </nav>
            )}
          </TabsContent>

          <TabsContent value="jsonl" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <pre 
                className="p-4 text-xs font-mono whitespace-pre-wrap break-all"
                role="region"
                aria-label="JSONL preview content"
                tabIndex={0}
              >
                {dataset.jsonlContent?.split('\n').slice(0, 20).join('\n')}
                {dataset.jsonlContent && dataset.jsonlContent.split('\n').length > 20 && (
                  <span className="text-muted-foreground">
                    {'\n\n... and {0} more lines'.replace('{0}', String(dataset.jsonlContent.split('\n').length - 20))}
                  </span>
                )}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Start Training Dialog */}
      <StartTrainingDialog
        open={showTrainingDialog}
        onOpenChange={setShowTrainingDialog}
        datasetId={datasetId}
        datasetName={dataset.name}
        onStarted={handleTrainingStarted}
      />
    </Card>
  );
}

function TrainingPairCard({ pair }: { pair: TrainingPair }) {
  return (
    <article 
      className="border rounded-lg overflow-hidden"
      aria-label={`Training pair with ${pair.tokenCount} tokens`}
    >
      {pair.systemMessage && (
        <div className="px-3 py-2 bg-muted/30 border-b text-xs">
          <span className="font-medium">System:</span> {pair.systemMessage.substring(0, 100)}...
        </div>
      )}
      <div className="p-3 space-y-2">
        <div className="flex gap-2">
          <User className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm" aria-label="User message">{pair.userMessage}</p>
        </div>
        <div className="flex gap-2">
          <Bot className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-muted-foreground" aria-label="Assistant response">{pair.assistantMessage}</p>
        </div>
      </div>
      <footer className="px-3 py-1.5 bg-muted/20 border-t flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{pair.tokenCount} tokens</span>
        {pair.qualityScore && <span>Quality: {(pair.qualityScore * 100).toFixed(0)}%</span>}
        {!pair.isValid && <Badge variant="destructive" className="h-5">Invalid</Badge>}
      </footer>
    </article>
  );
}
