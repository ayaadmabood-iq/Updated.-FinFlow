import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useUpdateTrainingPair, useDeleteTrainingPair } from '@/hooks/useTraining';
import type { TrainingPair } from '@/services/trainingService';
import {
  User,
  Bot,
  Settings2,
  Save,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PairEditorProps {
  pair: TrainingPair;
  datasetId: string;
  sourceChunkContent?: string;
  onNavigate?: (direction: 'prev' | 'next') => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  pairIndex?: number;
  totalPairs?: number;
}

export function PairEditor({
  pair,
  datasetId,
  sourceChunkContent,
  onNavigate,
  hasPrev,
  hasNext,
  pairIndex,
  totalPairs,
}: PairEditorProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const [editedSystem, setEditedSystem] = useState(pair.systemMessage || '');
  const [editedUser, setEditedUser] = useState(pair.userMessage);
  const [editedAssistant, setEditedAssistant] = useState(pair.assistantMessage);
  
  const updateMutation = useUpdateTrainingPair(datasetId);
  const deleteMutation = useDeleteTrainingPair(datasetId);

  const hasChanges = 
    editedSystem !== (pair.systemMessage || '') ||
    editedUser !== pair.userMessage ||
    editedAssistant !== pair.assistantMessage;

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      id: pair.id,
      updates: {
        systemMessage: editedSystem || undefined,
        userMessage: editedUser,
        assistantMessage: editedAssistant,
      },
    });
    setIsEditing(false);
  };

  const handleReset = () => {
    setEditedSystem(pair.systemMessage || '');
    setEditedUser(pair.userMessage);
    setEditedAssistant(pair.assistantMessage);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(pair.id);
    setShowDeleteDialog(false);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4 h-full">
      {/* Source Chunk Panel */}
      {sourceChunkContent && (
        <Card className="flex flex-col h-full">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('training.sourceChunk', 'Source Chunk')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full max-h-[500px]">
              <div className="p-4">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {sourceChunkContent}
                </p>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Pair Editor Panel */}
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">
                {t('training.trainingPair', 'Training Pair')}
              </CardTitle>
              {pairIndex !== undefined && totalPairs !== undefined && (
                <Badge variant="outline" className="text-xs">
                  {pairIndex + 1} / {totalPairs}
                </Badge>
              )}
              {pair.isValid ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {t('training.valid', 'Valid')}
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {t('training.invalid', 'Invalid')}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {onNavigate && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onNavigate('prev')}
                    disabled={!hasPrev}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onNavigate('next')}
                    disabled={!hasNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* Pair metadata */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
            <span>{pair.tokenCount} tokens</span>
            {pair.qualityScore !== undefined && (
              <span>Quality: {(pair.qualityScore * 100).toFixed(0)}%</span>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-4 space-y-4">
          {/* System Message */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs">
              <Settings2 className="h-3 w-3" />
              {t('training.systemMessage', 'System Message')}
            </Label>
            {isEditing ? (
              <Textarea
                value={editedSystem}
                onChange={(e) => setEditedSystem(e.target.value)}
                placeholder={t('training.systemMessagePlaceholder', 'Optional system context...')}
                className="min-h-[60px] text-sm"
              />
            ) : (
              <div className="p-3 bg-muted/30 rounded-md text-sm">
                {pair.systemMessage || (
                  <span className="text-muted-foreground italic">
                    {t('training.noSystemMessage', 'No system message')}
                  </span>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* User Message */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs">
              <User className="h-3 w-3 text-blue-500" />
              {t('training.userMessage', 'User Message')}
            </Label>
            {isEditing ? (
              <Textarea
                value={editedUser}
                onChange={(e) => setEditedUser(e.target.value)}
                className="min-h-[100px] text-sm"
              />
            ) : (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md text-sm border border-blue-100 dark:border-blue-900">
                {pair.userMessage}
              </div>
            )}
          </div>

          {/* Assistant Message */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs">
              <Bot className="h-3 w-3 text-green-500" />
              {t('training.assistantMessage', 'Assistant Message')}
            </Label>
            {isEditing ? (
              <Textarea
                value={editedAssistant}
                onChange={(e) => setEditedAssistant(e.target.value)}
                className="min-h-[150px] text-sm"
              />
            ) : (
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-md text-sm border border-green-100 dark:border-green-900">
                {pair.assistantMessage}
              </div>
            )}
          </div>

          {/* Validation Errors */}
          {pair.validationErrors && pair.validationErrors.length > 0 && (
            <div className="p-3 bg-destructive/10 rounded-md space-y-1">
              <p className="text-xs font-medium text-destructive">
                {t('training.validationErrors', 'Validation Errors')}:
              </p>
              {pair.validationErrors.map((error, i) => (
                <p key={i} className="text-xs text-destructive">• {error}</p>
              ))}
            </div>
          )}
        </CardContent>

        {/* Actions */}
        <div className="p-4 border-t flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 me-1" />
            {t('common.delete', 'Delete')}
          </Button>
          
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleReset();
                    setIsEditing(false);
                  }}
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                {hasChanges && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                  >
                    <RefreshCw className="h-4 w-4 me-1" />
                    {t('common.reset', 'Reset')}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasChanges || updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 me-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 me-1" />
                  )}
                  {t('common.save', 'Save')}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                {t('common.edit', 'Edit')}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('training.deletePairTitle', 'Delete Training Pair?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('training.deletePairDescription', 'This action cannot be undone. The training pair will be permanently removed from this dataset.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 me-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 me-1" />
              )}
              {t('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
