import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HardDrive, Cpu, Zap } from 'lucide-react';

interface ModelInfo {
  name: string;
  params: number;
  size: string;
  capability: number;
}

interface ParameterSliderProps {
  models?: ModelInfo[];
}

const defaultModels: ModelInfo[] = [
  { name: "7B", params: 7, size: "14GB", capability: 60 },
  { name: "13B", params: 13, size: "26GB", capability: 72 },
  { name: "30B", params: 30, size: "60GB", capability: 82 },
  { name: "70B", params: 70, size: "140GB", capability: 90 },
];

export function ParameterSlider({ models = defaultModels }: ParameterSliderProps) {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedModel = models[selectedIndex];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-2">
        {models.map((model, index) => (
          <button
            key={model.name}
            onClick={() => setSelectedIndex(index)}
            className={`text-sm font-medium transition-colors ${
              index === selectedIndex 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {model.name}
          </button>
        ))}
      </div>

      <Slider
        value={[selectedIndex]}
        onValueChange={([value]) => setSelectedIndex(value)}
        max={models.length - 1}
        step={1}
        className="w-full"
      />

      <div className="grid grid-cols-3 gap-4 mt-6">
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center">
            <Cpu className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{selectedModel.params}B</div>
            <div className="text-xs text-muted-foreground">
              {t('learn.parameters', 'Parameters')}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center">
            <HardDrive className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{selectedModel.size}</div>
            <div className="text-xs text-muted-foreground">
              {t('learn.fileSize', 'File Size')}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center">
            <Zap className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{selectedModel.capability}%</div>
            <div className="text-xs text-muted-foreground">
              {t('learn.capability', 'Capability')}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500"
          style={{ width: `${selectedModel.capability}%` }}
        />
      </div>
    </div>
  );
}
