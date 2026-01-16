import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useStartTraining, useApiKeyStatus, useGetStoredApiKey } from '@/hooks/useAutoTraining';
import { Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StartTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string;
  datasetName: string;
  onStarted?: (jobId: string) => void;
}

const OPENAI_MODELS = [
  { value: 'gpt-4o-mini-2024-07-18', label: 'GPT-4o Mini (Recommended)' },
  { value: 'gpt-4o-2024-08-06', label: 'GPT-4o' },
  { value: 'gpt-4-0613', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo-0125', label: 'GPT-3.5 Turbo' },
];

export function StartTrainingDialog({
  open,
  onOpenChange,
  datasetId,
  datasetName,
  onStarted,
}: StartTrainingDialogProps) {
  const { t } = useTranslation();
  const startTrainingMutation = useStartTraining();
  const { data: keyStatus } = useApiKeyStatus();
  const getStoredApiKey = useGetStoredApiKey();

  const [baseModel, setBaseModel] = useState('gpt-4o-mini-2024-07-18');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [nEpochs, setNEpochs] = useState<string>('');
  const [batchSize, setBatchSize] = useState<string>('');
  const [learningRate, setLearningRate] = useState<string>('');
  const [useStoredKey, setUseStoredKey] = useState(true);

  // Load stored API key
  useEffect(() => {
    if (open && keyStatus?.openaiKeySet) {
      getStoredApiKey('openai').then((key) => {
        if (key) {
          setApiKey(key);
          setUseStoredKey(true);
        }
      });
    }
  }, [open, keyStatus?.openaiKeySet, getStoredApiKey]);

  const handleStart = async () => {
    if (!apiKey.trim()) return;

    const config: { nEpochs?: number; batchSize?: number; learningRateMultiplier?: number } = {};
    if (nEpochs) config.nEpochs = parseInt(nEpochs, 10);
    if (batchSize) config.batchSize = parseInt(batchSize, 10);
    if (learningRate) config.learningRateMultiplier = parseFloat(learningRate);

    const result = await startTrainingMutation.mutateAsync({
      datasetId,
      baseModel,
      apiKey: apiKey.trim(),
      trainingConfig: Object.keys(config).length > 0 ? config : undefined,
    });

    if (result.success && onStarted) {
      onStarted(result.jobId);
    }
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!startTrainingMutation.isPending) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('training.startTraining', 'Start Training')}</DialogTitle>
          <DialogDescription>
            {t('training.startTrainingDesc', 'Configure and start fine-tuning for')} "{datasetName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label>{t('training.baseModel', 'Base Model')}</Label>
            <Select value={baseModel} onValueChange={setBaseModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPENAI_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label>{t('training.apiKey', 'OpenAI API Key')}</Label>
            {keyStatus?.openaiKeySet && useStoredKey ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2 bg-muted rounded text-sm">
                  {t('training.usingStoredKey', 'Using saved API key')} ••••••••
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUseStoredKey(false);
                    setApiKey('');
                  }}
                >
                  {t('training.changeKey', 'Change')}
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            )}
            {!keyStatus?.openaiKeySet && (
              <p className="text-xs text-muted-foreground">
                {t('training.apiKeyHint', 'Your API key is used only for this training job and not stored.')}
              </p>
            )}
          </div>

          {/* Advanced Options */}
          <Accordion type="single" collapsible>
            <AccordionItem value="advanced">
              <AccordionTrigger className="text-sm">
                {t('training.advancedOptions', 'Advanced Options')}
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">{t('training.epochs', 'Epochs')}</Label>
                    <Input
                      type="number"
                      placeholder="Auto"
                      value={nEpochs}
                      onChange={(e) => setNEpochs(e.target.value)}
                      min="1"
                      max="50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">{t('training.batchSize', 'Batch Size')}</Label>
                    <Input
                      type="number"
                      placeholder="Auto"
                      value={batchSize}
                      onChange={(e) => setBatchSize(e.target.value)}
                      min="1"
                      max="256"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{t('training.learningRate', 'Learning Rate Multiplier')}</Label>
                  <Input
                    type="number"
                    placeholder="Auto (default: 2)"
                    value={learningRate}
                    onChange={(e) => setLearningRate(e.target.value)}
                    min="0.1"
                    max="10"
                    step="0.1"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Cost Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t('training.costWarning', 'Fine-tuning costs will be charged to your OpenAI account based on the number of training tokens.')}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={startTrainingMutation.isPending}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleStart}
            disabled={!apiKey.trim() || startTrainingMutation.isPending}
          >
            {startTrainingMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('training.starting', 'Starting...')}
              </>
            ) : (
              t('training.startTraining', 'Start Training')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
