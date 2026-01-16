import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Cpu, Database, Shield, Zap, HelpCircle, Loader2, Settings2 } from 'lucide-react';

export interface TrainingConfig {
  quantization: {
    enabled: boolean;
    bits: 4 | 8;
    type: 'nf4' | 'fp4';
    doubleQuant: boolean;
  };
  lora: {
    enabled: boolean;
    rank: number;
    alpha: number;
    dropout: number;
    targetModules: string[];
  };
  checkpoint: {
    saveSteps: number;
    maxCheckpoints: number;
    autoResume: boolean;
  };
  training: {
    epochs: number;
    batchSize: number;
    learningRate: number;
    warmupSteps: number;
    maxSteps: number | null;
  };
  validation: {
    splitRatio: number;
    evalSteps: number;
    earlyStoppingPatience: number;
    earlyStoppingThreshold: number;
  };
}

interface Props {
  onSubmit: (config: TrainingConfig) => void;
  isLoading?: boolean;
  initialConfig?: Partial<TrainingConfig>;
}

const DEFAULT_CONFIG: TrainingConfig = {
  quantization: {
    enabled: true,
    bits: 4,
    type: 'nf4',
    doubleQuant: true
  },
  lora: {
    enabled: true,
    rank: 16,
    alpha: 32,
    dropout: 0.05,
    targetModules: ['q_proj', 'v_proj', 'k_proj', 'o_proj']
  },
  checkpoint: {
    saveSteps: 100,
    maxCheckpoints: 5,
    autoResume: true
  },
  training: {
    epochs: 3,
    batchSize: 4,
    learningRate: 0.0002,
    warmupSteps: 100,
    maxSteps: null
  },
  validation: {
    splitRatio: 0.15,
    evalSteps: 50,
    earlyStoppingPatience: 3,
    earlyStoppingThreshold: 0.01
  }
};

export function TrainingConfigForm({ onSubmit, isLoading, initialConfig }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [config, setConfig] = useState<TrainingConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...initialConfig,
    quantization: { ...DEFAULT_CONFIG.quantization, ...initialConfig?.quantization },
    lora: { ...DEFAULT_CONFIG.lora, ...initialConfig?.lora },
    checkpoint: { ...DEFAULT_CONFIG.checkpoint, ...initialConfig?.checkpoint },
    training: { ...DEFAULT_CONFIG.training, ...initialConfig?.training },
    validation: { ...DEFAULT_CONFIG.validation, ...initialConfig?.validation }
  }));

  const estimatedMemoryReduction = config.quantization.enabled 
    ? config.quantization.bits === 4 ? '75%' : '50%'
    : '0%';

  const estimatedTrainableParams = config.lora.enabled
    ? `~${(config.lora.rank * 2 * 4096 * 2 / 1000000).toFixed(1)}M`
    : 'All parameters';

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          {t('training.configTitle', 'Training Configuration')}
        </CardTitle>
        <CardDescription>
          {t('training.configDesc', 'Configure memory optimization, checkpointing, and validation settings')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          {config.quantization.enabled && (
            <Badge variant="secondary" className="gap-1">
              <Cpu className="h-3 w-3" />
              {config.quantization.bits}-bit • {estimatedMemoryReduction} memory saved
            </Badge>
          )}
          {config.lora.enabled && (
            <Badge variant="secondary" className="gap-1">
              <Zap className="h-3 w-3" />
              LoRA r={config.lora.rank} • {estimatedTrainableParams} params
            </Badge>
          )}
          {config.checkpoint.autoResume && (
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" />
              Auto-resume enabled
            </Badge>
          )}
        </div>

        <Tabs defaultValue="memory" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="memory" className="gap-1 text-xs sm:text-sm">
              <Cpu className="h-4 w-4 hidden sm:inline" />
              {t('training.memory', 'Memory')}
            </TabsTrigger>
            <TabsTrigger value="lora" className="gap-1 text-xs sm:text-sm">
              <Zap className="h-4 w-4 hidden sm:inline" />
              LoRA
            </TabsTrigger>
            <TabsTrigger value="checkpoint" className="gap-1 text-xs sm:text-sm">
              <Database className="h-4 w-4 hidden sm:inline" />
              {t('training.checkpoints', 'Checkpoints')}
            </TabsTrigger>
            <TabsTrigger value="validation" className="gap-1 text-xs sm:text-sm">
              <Shield className="h-4 w-4 hidden sm:inline" />
              {t('training.validation', 'Validation')}
            </TabsTrigger>
          </TabsList>

          {/* Memory/Quantization Tab */}
          <TabsContent value="memory" className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label>{t('training.enableQuantization', 'Enable Quantization')}</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('training.quantizationHelp', 'Reduce memory usage by using lower precision weights. 4-bit saves ~75% memory with minimal quality loss.')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('training.quantizationDesc', 'Reduce memory usage by 75% with 4-bit quantization')}
                </p>
              </div>
              <Switch
                checked={config.quantization.enabled}
                onCheckedChange={(enabled) =>
                  setConfig(c => ({ ...c, quantization: { ...c.quantization, enabled } }))
                }
              />
            </div>

            {config.quantization.enabled && (
              <>
                <div className="space-y-3">
                  <Label>{t('training.quantizationBits', 'Quantization Bits')}</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={config.quantization.bits === 4 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setConfig(c => ({
                        ...c,
                        quantization: { ...c.quantization, bits: 4 }
                      }))}
                    >
                      4-bit ({t('training.recommended', 'Recommended')})
                    </Button>
                    <Button
                      type="button"
                      variant={config.quantization.bits === 8 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setConfig(c => ({
                        ...c,
                        quantization: { ...c.quantization, bits: 8 }
                      }))}
                    >
                      8-bit
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>{t('training.doubleQuant', 'Double Quantization')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('training.doubleQuantDesc', 'Further reduce memory with nested quantization')}
                    </p>
                  </div>
                  <Switch
                    checked={config.quantization.doubleQuant}
                    onCheckedChange={(doubleQuant) =>
                      setConfig(c => ({
                        ...c,
                        quantization: { ...c.quantization, doubleQuant }
                      }))
                    }
                  />
                </div>
              </>
            )}
          </TabsContent>

          {/* LoRA Tab */}
          <TabsContent value="lora" className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label>{t('training.enableLoRA', 'Enable LoRA')}</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('training.loraHelp', 'Low-Rank Adaptation trains only ~1% of parameters, preventing catastrophic forgetting and reducing training cost.')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('training.loraDesc', 'Train only ~1% of parameters (prevents catastrophic forgetting)')}
                </p>
              </div>
              <Switch
                checked={config.lora.enabled}
                onCheckedChange={(enabled) =>
                  setConfig(c => ({ ...c, lora: { ...c.lora, enabled } }))
                }
              />
            </div>

            {config.lora.enabled && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>LoRA Rank: {config.lora.rank}</Label>
                    <Badge variant="outline">{estimatedTrainableParams}</Badge>
                  </div>
                  <Slider
                    value={[config.lora.rank]}
                    onValueChange={([rank]) =>
                      setConfig(c => ({
                        ...c,
                        lora: { ...c.lora, rank, alpha: rank * 2 }
                      }))
                    }
                    min={4}
                    max={64}
                    step={4}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('training.loraRankHelp', 'Higher = more capacity, more memory. 16-32 recommended.')}
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>{t('training.dropout', 'Dropout')}: {(config.lora.dropout * 100).toFixed(0)}%</Label>
                  <Slider
                    value={[config.lora.dropout * 100]}
                    onValueChange={([v]) =>
                      setConfig(c => ({
                        ...c,
                        lora: { ...c.lora, dropout: v / 100 }
                      }))
                    }
                    min={0}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                </div>
              </>
            )}
          </TabsContent>

          {/* Checkpoint Tab */}
          <TabsContent value="checkpoint" className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label>{t('training.autoResume', 'Auto-Resume on Failure')}</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('training.autoResumeHelp', 'If training fails or is interrupted, automatically resume from the last saved checkpoint.')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('training.autoResumeDesc', 'Automatically resume from last checkpoint if training fails')}
                </p>
              </div>
              <Switch
                checked={config.checkpoint.autoResume}
                onCheckedChange={(autoResume) =>
                  setConfig(c => ({
                    ...c,
                    checkpoint: { ...c.checkpoint, autoResume }
                  }))
                }
              />
            </div>

            <div className="space-y-3">
              <Label>{t('training.saveEvery', 'Save Checkpoint Every')}: {config.checkpoint.saveSteps} {t('training.steps', 'steps')}</Label>
              <Slider
                value={[config.checkpoint.saveSteps]}
                onValueChange={([saveSteps]) =>
                  setConfig(c => ({
                    ...c,
                    checkpoint: { ...c.checkpoint, saveSteps }
                  }))
                }
                min={50}
                max={500}
                step={50}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <Label>{t('training.maxCheckpoints', 'Max Checkpoints to Keep')}: {config.checkpoint.maxCheckpoints}</Label>
              <Slider
                value={[config.checkpoint.maxCheckpoints]}
                onValueChange={([maxCheckpoints]) =>
                  setConfig(c => ({
                    ...c,
                    checkpoint: { ...c.checkpoint, maxCheckpoints }
                  }))
                }
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
            </div>
          </TabsContent>

          {/* Validation Tab */}
          <TabsContent value="validation" className="space-y-6 pt-4">
            <div className="space-y-3">
              <Label>{t('training.validationSplit', 'Validation Split')}: {(config.validation.splitRatio * 100).toFixed(0)}%</Label>
              <Slider
                value={[config.validation.splitRatio * 100]}
                onValueChange={([v]) =>
                  setConfig(c => ({
                    ...c,
                    validation: { ...c.validation, splitRatio: v / 100 }
                  }))
                }
                min={5}
                max={30}
                step={5}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <Label>{t('training.evalEvery', 'Evaluate Every')}: {config.validation.evalSteps} {t('training.steps', 'steps')}</Label>
              <Slider
                value={[config.validation.evalSteps]}
                onValueChange={([evalSteps]) =>
                  setConfig(c => ({
                    ...c,
                    validation: { ...c.validation, evalSteps }
                  }))
                }
                min={10}
                max={200}
                step={10}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>{t('training.earlyStoppingPatience', 'Early Stopping Patience')}: {config.validation.earlyStoppingPatience}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{t('training.earlyStoppingHelp', 'Stop training if validation loss doesn\'t improve for N consecutive evaluations.')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Slider
                value={[config.validation.earlyStoppingPatience]}
                onValueChange={([earlyStoppingPatience]) =>
                  setConfig(c => ({
                    ...c,
                    validation: { ...c.validation, earlyStoppingPatience }
                  }))
                }
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {t('training.earlyStoppingDesc', 'Stop training if validation loss doesn\'t improve for N evaluations')}
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <Button 
          className="w-full" 
          onClick={() => onSubmit(config)}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('training.creating', 'Creating...')}
            </>
          ) : (
            t('training.createJob', 'Create Training Job')
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
