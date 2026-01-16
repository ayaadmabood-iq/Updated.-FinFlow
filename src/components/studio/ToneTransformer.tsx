import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  MessageCircle,
  BookOpen,
  Globe,
  Code,
  Minimize2,
  Maximize2,
  Languages,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { TransformationType } from '@/services/studioService';

interface ToneTransformerProps {
  selectedText: string;
  onTransform: (
    transformation: TransformationType,
    options?: { targetLanguage?: string; customInstructions?: string }
  ) => void;
  isLoading?: boolean;
}

const transformations: Array<{
  id: TransformationType;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: 'professional',
    label: 'Make Professional',
    description: 'Formal business tone',
    icon: Briefcase,
  },
  {
    id: 'casual',
    label: 'Make Casual',
    description: 'Friendly, conversational',
    icon: MessageCircle,
  },
  {
    id: 'simplify',
    label: 'Simplify',
    description: 'Non-technical audience',
    icon: BookOpen,
  },
  {
    id: 'technical',
    label: 'Make Technical',
    description: 'Add precision & details',
    icon: Code,
  },
  {
    id: 'concise',
    label: 'Make Concise',
    description: 'Reduce length by 50%',
    icon: Minimize2,
  },
  {
    id: 'expand',
    label: 'Expand',
    description: 'Add detail & examples',
    icon: Maximize2,
  },
  {
    id: 'formal_arabic',
    label: 'Formal Arabic (MSA)',
    description: 'Translate to الفصحى',
    icon: Globe,
  },
  {
    id: 'translate',
    label: 'Translate',
    description: 'To another language',
    icon: Languages,
  },
  {
    id: 'custom',
    label: 'Custom Rewrite',
    description: 'Your own instructions',
    icon: Sparkles,
  },
];

export function ToneTransformer({
  selectedText,
  onTransform,
  isLoading,
}: ToneTransformerProps) {
  const { t } = useTranslation();
  const [showTranslateOptions, setShowTranslateOptions] = useState(false);
  const [showCustomOptions, setShowCustomOptions] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');

  const handleTransform = (transformation: TransformationType) => {
    if (transformation === 'translate') {
      setShowTranslateOptions(true);
      return;
    }
    if (transformation === 'custom') {
      setShowCustomOptions(true);
      return;
    }
    onTransform(transformation);
  };

  const handleTranslateSubmit = () => {
    onTransform('translate', { targetLanguage });
    setShowTranslateOptions(false);
    setTargetLanguage('');
  };

  const handleCustomSubmit = () => {
    onTransform('custom', { customInstructions });
    setShowCustomOptions(false);
    setCustomInstructions('');
  };

  if (!selectedText) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        {t('studio.selectTextToTransform', 'Select text to transform it')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground mb-2">
        {t('studio.selectedChars', '{{count}} characters selected', {
          count: selectedText.length,
        })}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {transformations.map((transform) => {
          const Icon = transform.icon;

          if (transform.id === 'translate') {
            return (
              <Popover
                key={transform.id}
                open={showTranslateOptions}
                onOpenChange={setShowTranslateOptions}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex flex-col items-center gap-1 h-auto py-2"
                    disabled={isLoading}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{transform.label}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-3">
                    <Label>{t('studio.targetLanguage', 'Target Language')}</Label>
                    <Input
                      placeholder="e.g., Spanish, French, Arabic"
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={handleTranslateSubmit}
                      disabled={!targetLanguage.trim() || isLoading}
                      className="w-full"
                    >
                      {t('studio.translate', 'Translate')}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            );
          }

          if (transform.id === 'custom') {
            return (
              <Popover
                key={transform.id}
                open={showCustomOptions}
                onOpenChange={setShowCustomOptions}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex flex-col items-center gap-1 h-auto py-2"
                    disabled={isLoading}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{transform.label}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                  <div className="space-y-3">
                    <Label>{t('studio.customInstructions', 'Your Instructions')}</Label>
                    <Textarea
                      placeholder="e.g., Make it sound like a pirate, Add humor..."
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      rows={3}
                    />
                    <Button
                      size="sm"
                      onClick={handleCustomSubmit}
                      disabled={!customInstructions.trim() || isLoading}
                      className="w-full"
                    >
                      {t('studio.apply', 'Apply')}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            );
          }

          return (
            <Button
              key={transform.id}
              variant="outline"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-2"
              onClick={() => handleTransform(transform.id)}
              disabled={isLoading}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs">{transform.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
