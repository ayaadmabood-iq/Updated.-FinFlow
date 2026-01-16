import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useApiKeyStatus, useProjectTrainingSettings, useUpdateProjectTrainingSettings } from '@/hooks/useAutoTraining';
import { Loader2, Key, AlertCircle } from 'lucide-react';
import { StartTrainingDialog } from './StartTrainingDialog';

interface QuickTrainingPanelProps {
  projectId: string;
  readyDatasetId?: string;
  readyDatasetName?: string;
  readyCount?: number;
  totalCount?: number;
  onTrainingStarted?: (jobId: string) => void;
}

const MODELS = [
  { value: 'gpt-4o-mini-2024-07-18', label: 'GPT-4o Mini' },
  { value: 'gpt-4o-2024-08-06', label: 'GPT-4o' },
  { value: 'gpt-3.5-turbo-0125', label: 'GPT-3.5 Turbo' },
];

export function QuickTrainingPanel({ 
  projectId,
  readyDatasetId,
  readyDatasetName,
  readyCount = 0, 
  onTrainingStarted,
}: QuickTrainingPanelProps) {
  const { t } = useTranslation();
  const { data: keyStatus, isLoading: keyLoading } = useApiKeyStatus();
  const { data: settings, isLoading: settingsLoading } = useProjectTrainingSettings(projectId);
  const updateSettings = useUpdateProjectTrainingSettings(projectId);
  
  const [model, setModel] = useState('gpt-4o-mini-2024-07-18');
  const [autoTrain, setAutoTrain] = useState(false);
  const [showTrainingDialog, setShowTrainingDialog] = useState(false);

  useEffect(() => {
    if (settings) {
      setModel(settings.autoTrainModel);
      setAutoTrain(settings.autoTrainEnabled);
    }
  }, [settings]);

  const handleModelChange = (value: string) => {
    setModel(value);
    updateSettings.mutate({ autoTrainModel: value });
  };

  const handleAutoTrainChange = (checked: boolean) => {
    setAutoTrain(checked);
    updateSettings.mutate({ autoTrainEnabled: checked });
  };

  const isLoading = keyLoading || settingsLoading;
  const hasApiKey = keyStatus?.openaiKeySet;
  const canStartTraining = readyCount > 0 && hasApiKey && readyDatasetId;

  return (
    <>
      <Card className="w-full lg:w-80 flex-shrink-0 border border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">
            {t('training.quickSetup', 'Quick Training Setup')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* API Key Status */}
              {!hasApiKey && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-700 dark:text-yellow-300">
                    {t('training.noApiKey', 'Connect OpenAI API key in settings')}
                  </span>
                </div>
              )}

              {hasApiKey && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
                  <Key className="h-4 w-4 text-green-600" />
                  <span className="text-green-700 dark:text-green-300">
                    {t('training.apiKeyConnected', 'OpenAI connected')}
                  </span>
                </div>
              )}

              {/* Model Selection */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  {t('training.model', 'Model')}
                </Label>
                <Select value={model} onValueChange={handleModelChange}>
                  <SelectTrigger className="h-11 bg-card">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Auto-train Toggle */}
              <div className="flex items-center justify-between gap-4 py-2">
                <Label className="text-sm">
                  {t('training.autoTrain', 'Auto-train when ready')}
                </Label>
                <Switch 
                  checked={autoTrain} 
                  onCheckedChange={handleAutoTrainChange}
                  disabled={!hasApiKey}
                />
              </div>

              {/* Start Training Button */}
              <Button 
                className="w-full h-12 bg-success hover:bg-success/90 text-success-foreground font-medium text-base"
                disabled={!canStartTraining}
                onClick={() => setShowTrainingDialog(true)}
              >
                {t('training.startTraining', 'Start Training')}
              </Button>

              {readyCount === 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  {t('training.noReadyDatasets', 'Generate a dataset first to start training')}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {readyDatasetId && readyDatasetName && (
        <StartTrainingDialog
          open={showTrainingDialog}
          onOpenChange={setShowTrainingDialog}
          datasetId={readyDatasetId}
          datasetName={readyDatasetName}
          onStarted={onTrainingStarted}
        />
      )}
    </>
  );
}
