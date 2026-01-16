import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGenerateDataset } from '@/hooks/useTraining';
import { Loader2, Sparkles } from 'lucide-react';
import type { TrainingFormat, GenerationMode } from '@/services/trainingService';

interface GenerateDatasetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  documentCount: number;
}

export function GenerateDatasetDialog({
  open,
  onOpenChange,
  projectId,
  documentCount,
}: GenerateDatasetDialogProps) {
  const { t } = useTranslation();
  const generateMutation = useGenerateDataset();

  const [name, setName] = useState('');
  const [format, setFormat] = useState<TrainingFormat>('openai');
  const [mode, setMode] = useState<GenerationMode>('auto');
  const [systemPrompt, setSystemPrompt] = useState('');

  const handleGenerate = async () => {
    if (!name.trim()) return;

    await generateMutation.mutateAsync({
      projectId,
      datasetName: name,
      format,
      mode,
      systemPrompt: systemPrompt.trim() || undefined,
    });

    onOpenChange(false);
    setName('');
    setSystemPrompt('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('training.generateDataset', 'Generate Training Dataset')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('training.datasetName', 'Dataset Name')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('training.datasetNamePlaceholder', 'My Fine-tuning Dataset')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('training.format', 'Output Format')}</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as TrainingFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (JSONL)</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="alpaca">Alpaca</SelectItem>
                  <SelectItem value="sharegpt">ShareGPT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('training.mode', 'Generation Mode')}</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as GenerationMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t('training.modeAuto', 'Auto-detect')}</SelectItem>
                  <SelectItem value="qa">{t('training.modeQA', 'Q&A Pairs')}</SelectItem>
                  <SelectItem value="instruction">{t('training.modeInstruction', 'Instructions')}</SelectItem>
                  <SelectItem value="conversation">{t('training.modeConversation', 'Conversations')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('training.systemPrompt', 'System Prompt (Optional)')}</Label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={t('training.systemPromptPlaceholder', 'You are a helpful assistant specialized in...')}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {t('training.systemPromptHint', 'This will be added to each training example')}
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="text-muted-foreground">
              {t('training.generateHint', 'This will process {{count}} documents and generate training pairs from their content.', { count: documentCount })}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!name.trim() || generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('training.generating', 'Generating...')}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {t('training.generate', 'Generate Dataset')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
