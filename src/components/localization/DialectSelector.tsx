import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Globe2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  DIALECT_NAMES, 
  type ArabicDialect 
} from '@/services/localizationService';

interface DialectSelectorProps {
  value: ArabicDialect;
  onChange: (value: ArabicDialect) => void;
  label?: string;
  disabled?: boolean;
  showDescription?: boolean;
}

const DIALECT_ORDER: ArabicDialect[] = [
  'msa',
  'gulf',
  'egyptian',
  'levantine',
  'maghrebi',
  'iraqi',
  'yemeni',
];

const DIALECT_DESCRIPTIONS: Record<ArabicDialect, { ar: string; en: string }> = {
  msa: { 
    ar: 'اللغة العربية الفصحى الحديثة - المستخدمة في الإعلام والكتابة الرسمية',
    en: 'Modern Standard Arabic - Used in media and formal writing' 
  },
  gulf: { 
    ar: 'لهجة السعودية والإمارات والكويت والبحرين وقطر وعُمان',
    en: 'Dialect of Saudi Arabia, UAE, Kuwait, Bahrain, Qatar, and Oman' 
  },
  egyptian: { 
    ar: 'اللهجة المصرية - الأكثر انتشاراً في الإعلام العربي',
    en: 'Egyptian dialect - Most widely understood in Arab media' 
  },
  levantine: { 
    ar: 'لهجة سوريا ولبنان وفلسطين والأردن',
    en: 'Dialect of Syria, Lebanon, Palestine, and Jordan' 
  },
  maghrebi: { 
    ar: 'لهجة المغرب والجزائر وتونس وليبيا',
    en: 'Dialect of Morocco, Algeria, Tunisia, and Libya' 
  },
  iraqi: { 
    ar: 'اللهجة العراقية',
    en: 'Iraqi dialect' 
  },
  yemeni: { 
    ar: 'اللهجة اليمنية',
    en: 'Yemeni dialect' 
  },
};

export function DialectSelector({
  value,
  onChange,
  label,
  disabled = false,
  showDescription = false,
}: DialectSelectorProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const langKey = isRTL ? 'ar' : 'en';

  return (
    <div className="space-y-2">
      {label && (
        <Label className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-muted-foreground" />
          {label}
        </Label>
      )}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue>
            <span>{DIALECT_NAMES[value][langKey]}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DIALECT_ORDER.map((dialect) => (
            <SelectItem key={dialect} value={dialect}>
              <div className="flex flex-col">
                <span className="font-medium">{DIALECT_NAMES[dialect][langKey]}</span>
                {showDescription && (
                  <span className="text-xs text-muted-foreground">
                    {DIALECT_DESCRIPTIONS[dialect][langKey]}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface DialectBadgeProps {
  dialect: ArabicDialect;
  confidence?: number;
  variant?: 'default' | 'secondary' | 'outline';
}

export function DialectBadge({ 
  dialect, 
  confidence,
  variant = 'secondary',
}: DialectBadgeProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const langKey = isRTL ? 'ar' : 'en';

  return (
    <Badge variant={variant} className="gap-1">
      <Globe2 className="h-3 w-3" />
      <span>{DIALECT_NAMES[dialect][langKey]}</span>
      {confidence !== undefined && (
        <span className="text-xs opacity-70">
          ({Math.round(confidence * 100)}%)
        </span>
      )}
    </Badge>
  );
}

interface DialectIndicatorProps {
  detectedDialects: Array<{
    dialect: string;
    confidence: number;
    sample?: string;
  }>;
  showSamples?: boolean;
}

export function DialectIndicator({ 
  detectedDialects, 
  showSamples = false 
}: DialectIndicatorProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const langKey = isRTL ? 'ar' : 'en';

  if (!detectedDialects.length) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        {isRTL ? 'لم يتم اكتشاف لهجة' : 'No dialect detected'}
      </Badge>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {detectedDialects.map((d, index) => (
          <DialectBadge
            key={index}
            dialect={d.dialect as ArabicDialect}
            confidence={d.confidence}
            variant={index === 0 ? 'default' : 'secondary'}
          />
        ))}
      </div>
      {showSamples && (
        <div className="space-y-1">
          {detectedDialects.filter(d => d.sample).map((d, index) => (
            <div key={index} className="text-xs text-muted-foreground">
              <span className="font-medium">{DIALECT_NAMES[d.dialect as ArabicDialect][langKey]}:</span>{' '}
              <span className="italic" dir="rtl">"{d.sample}"</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
