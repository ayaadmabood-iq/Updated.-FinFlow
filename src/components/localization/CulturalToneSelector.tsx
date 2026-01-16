import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { JurisdictionSelector } from './JurisdictionSelector';
import {
  useToneTemplates,
  type JurisdictionRegion,
  type CulturalToneTemplate,
} from '@/hooks/useLocalization';

interface CulturalToneSelectorProps {
  jurisdiction?: JurisdictionRegion;
  usageContext?: 'email' | 'report' | 'meeting_notes';
  onSelectTemplate?: (template: CulturalToneTemplate) => void;
}

const TONE_TYPES = [
  { key: 'greeting', labelAr: 'تحيات', labelEn: 'Greetings' },
  { key: 'closing', labelAr: 'ختام', labelEn: 'Closings' },
  { key: 'formal_address', labelAr: 'مخاطبات رسمية', labelEn: 'Formal Address' },
  { key: 'report_header', labelAr: 'رأس التقرير', labelEn: 'Report Header' },
];

export function CulturalToneSelector({
  jurisdiction: defaultJurisdiction = 'sau',
  usageContext,
  onSelectTemplate,
}: CulturalToneSelectorProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [jurisdiction, setJurisdiction] = React.useState<JurisdictionRegion>(defaultJurisdiction);
  const [selectedType, setSelectedType] = React.useState('greeting');
  
  const { data: templates, isLoading } = useToneTemplates({
    jurisdiction,
    toneType: selectedType,
    usageContext,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          {isRTL ? 'قوالب النبرة الثقافية' : 'Cultural Tone Templates'}
        </CardTitle>
        <CardDescription>
          {isRTL 
            ? 'اختر الصياغات المناسبة ثقافياً للتواصل المهني'
            : 'Select culturally appropriate phrasing for professional communication'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <JurisdictionSelector
          value={jurisdiction}
          onChange={setJurisdiction}
          label={isRTL ? 'المنطقة' : 'Region'}
        />

        <Tabs value={selectedType} onValueChange={setSelectedType}>
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
            {TONE_TYPES.map(type => (
              <TabsTrigger key={type.key} value={type.key} className="text-xs sm:text-sm">
                {isRTL ? type.labelAr : type.labelEn}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="h-[300px] mt-4">
            {TONE_TYPES.map(type => (
              <TabsContent key={type.key} value={type.key} className="mt-0">
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : templates && templates.length > 0 ? (
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        isRTL={isRTL}
                        onSelect={onSelectTemplate}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {isRTL ? 'لا توجد قوالب متاحة' : 'No templates available'}
                  </div>
                )}
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface TemplateCardProps {
  template: CulturalToneTemplate;
  isRTL: boolean;
  onSelect?: (template: CulturalToneTemplate) => void;
}

function TemplateCard({ template, isRTL, onSelect }: TemplateCardProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayText = isRTL ? template.templateAr : (template.templateEn || template.templateAr);

  return (
    <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{template.name}</span>
            {template.isDefault && (
              <Badge variant="secondary" className="text-xs">
                {isRTL ? 'افتراضي' : 'Default'}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {template.formalityLevel === 'formal' 
                ? (isRTL ? 'رسمي' : 'Formal')
                : template.formalityLevel === 'semi-formal'
                ? (isRTL ? 'شبه رسمي' : 'Semi-formal')
                : (isRTL ? 'غير رسمي' : 'Informal')
              }
            </Badge>
          </div>

          {/* Arabic Template */}
          <div 
            className="p-3 bg-muted rounded-md text-sm whitespace-pre-line"
            dir="rtl"
          >
            {template.templateAr}
          </div>

          {/* English Translation if available */}
          {template.templateEn && (
            <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground whitespace-pre-line">
              {template.templateEn}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleCopy(template.templateAr)}
            title={isRTL ? 'نسخ العربية' : 'Copy Arabic'}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          {onSelect && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSelect(template)}
            >
              {isRTL ? 'استخدام' : 'Use'}
            </Button>
          )}
        </div>
      </div>

      {template.usageContext && (
        <p className="text-xs text-muted-foreground mt-2">
          {isRTL ? 'السياق:' : 'Context:'} {template.usageContext}
        </p>
      )}
    </div>
  );
}
