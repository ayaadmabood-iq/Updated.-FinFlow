import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, RotateCcw, Clock, TrendingDown, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface Checkpoint {
  id: string;
  job_id: string;
  step: number;
  loss?: number;
  val_loss?: number;
  accuracy?: number;
  file_path?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface Props {
  checkpoints: Checkpoint[];
  isLoading?: boolean;
  onRestore?: (checkpoint: Checkpoint) => void;
  isRestoring?: boolean;
  currentStep?: number;
}

export function CheckpointList({ checkpoints, isLoading, onRestore, isRestoring, currentStep }: Props) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          {t('training.checkpoints', 'Checkpoints')}
        </CardTitle>
        <CardDescription>
          {t('training.checkpointsDesc', 'Saved training states for fault tolerance')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {checkpoints.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t('training.noCheckpoints', 'No checkpoints saved yet')}</p>
            <p className="text-sm">{t('training.checkpointsWillAppear', 'Checkpoints will appear here during training')}</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {checkpoints.map((checkpoint, index) => (
                <div 
                  key={checkpoint.id} 
                  className={`p-4 rounded-lg border transition-colors ${
                    index === 0 ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={index === 0 ? 'default' : 'secondary'}>
                        Step {checkpoint.step}
                      </Badge>
                      {index === 0 && (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {t('training.latest', 'Latest')}
                        </Badge>
                      )}
                      {currentStep === checkpoint.step && (
                        <Badge variant="outline" className="gap-1 text-green-600">
                          {t('training.current', 'Current')}
                        </Badge>
                      )}
                    </div>
                    {onRestore && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRestore(checkpoint)}
                        disabled={isRestoring}
                        className="gap-1"
                      >
                        <RotateCcw className="h-4 w-4" />
                        {t('training.restore', 'Restore')}
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {checkpoint.loss !== undefined && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <TrendingDown className="h-3 w-3" />
                        <span>Loss: {checkpoint.loss.toFixed(4)}</span>
                      </div>
                    )}
                    {checkpoint.val_loss !== undefined && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <TrendingDown className="h-3 w-3" />
                        <span>Val: {checkpoint.val_loss.toFixed(4)}</span>
                      </div>
                    )}
                    {checkpoint.accuracy !== undefined && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Acc: {(checkpoint.accuracy * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(checkpoint.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
