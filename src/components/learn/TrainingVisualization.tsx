import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Cpu, FileArchive, Binary, ArrowRight, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrainingVisualizationProps {
  animated?: boolean;
}

const steps = [
  { icon: Globe, labelKey: 'internetData', size: '10TB' },
  { icon: Cpu, labelKey: 'gpuCluster', size: '6,000 GPUs' },
  { icon: FileArchive, labelKey: 'compression', size: '~12 days' },
  { icon: Binary, labelKey: 'parameters', size: '140GB' },
];

export function TrainingVisualization({ animated = true }: TrainingVisualizationProps) {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!animated) return;
    
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [animated]);

  return (
    <div className="space-y-6">
      {/* Steps Flow */}
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === activeStep;
          const isPast = index < activeStep;
          
          return (
            <div key={index} className="flex items-center flex-1">
              <div 
                className={cn(
                  "flex flex-col items-center p-4 rounded-xl transition-all duration-500 flex-1",
                  isActive && "bg-primary/10 scale-105",
                  isPast && "opacity-60"
                )}
              >
                <div 
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-500",
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <span className="mt-2 text-sm font-medium text-center">
                  {t(`learn.${step.labelKey}`, step.labelKey)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {step.size}
                </span>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight 
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    isPast || isActive ? "text-primary" : "text-muted-foreground/30"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Compression Ratio */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="text-3xl font-bold text-destructive">10TB</div>
            <div className="text-xs text-muted-foreground">
              {t('learn.inputData', 'Input Data')}
            </div>
          </div>
          
          <div className="flex-1 mx-4 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-0.5 bg-gradient-to-r from-destructive via-primary to-green-500" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-2 text-sm font-medium">
                100x {t('learn.compression', 'Compression')}
              </span>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-green-500">140GB</div>
            <div className="text-xs text-muted-foreground">
              {t('learn.outputParams', 'Output Params')}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3 text-center">
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="font-bold text-lg">~10TB</div>
          <div className="text-xs text-muted-foreground">{t('learn.dataSize', 'Data')}</div>
        </div>
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="font-bold text-lg">6,000</div>
          <div className="text-xs text-muted-foreground">{t('learn.gpuCount', 'GPUs')}</div>
        </div>
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="font-bold text-lg">~12</div>
          <div className="text-xs text-muted-foreground">{t('learn.trainingTime', 'Days')}</div>
        </div>
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="font-bold text-lg">$2M+</div>
          <div className="text-xs text-muted-foreground">{t('learn.trainingCost', 'Cost')}</div>
        </div>
      </div>
    </div>
  );
}
