import React from 'react';
import { useTranslation } from 'react-i18next';
import { Settings2, Globe, Languages, Building2, Sparkles, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { JurisdictionSelector } from './JurisdictionSelector';
import { DialectSelector } from './DialectSelector';
import {
  useProjectLocalization,
  useUpsertProjectLocalization,
  type JurisdictionRegion,
  type ArabicDialect,
} from '@/hooks/useLocalization';

interface ProjectLocalizationSettingsProps {
  projectId: string;
}

export function ProjectLocalizationSettings({ projectId }: ProjectLocalizationSettingsProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const { data: settings, isLoading } = useProjectLocalization(projectId);
  const { mutate: upsertSettings, isPending } = useUpsertProjectLocalization();

  const [localSettings, setLocalSettings] = React.useState({
    primaryJurisdiction: 'global' as JurisdictionRegion,
    preferredOutputDialect: 'msa' as ArabicDialect,
    professionalTone: 'formal' as 'formal' | 'semi-formal' | 'informal',
    inputDialectDetection: true,
    autoTranslateToMsa: false,
    useLocalGreetings: true,
    useHijriDates: false,
    currencyFormat: 'SAR',
    enableCrossLanguageSearch: true,
    autoTranslateQueries: true,
  });

  React.useEffect(() => {
    if (settings) {
      setLocalSettings({
        primaryJurisdiction: settings.primaryJurisdiction,
        preferredOutputDialect: settings.preferredOutputDialect,
        professionalTone: settings.professionalTone,
        inputDialectDetection: settings.inputDialectDetection,
        autoTranslateToMsa: settings.autoTranslateToMsa,
        useLocalGreetings: settings.useLocalGreetings,
        useHijriDates: settings.useHijriDates,
        currencyFormat: settings.currencyFormat,
        enableCrossLanguageSearch: settings.enableCrossLanguageSearch,
        autoTranslateQueries: settings.autoTranslateQueries,
      });
    }
  }, [settings]);

  const handleSave = () => {
    upsertSettings({ projectId, settings: localSettings });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          {isRTL ? 'إعدادات التوطين' : 'Localization Settings'}
        </CardTitle>
        <CardDescription>
          {isRTL 
            ? 'تكوين الإعدادات الإقليمية واللغوية والثقافية للمشروع'
            : 'Configure regional, linguistic, and cultural settings for your project'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Jurisdiction Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {isRTL ? 'الإعدادات القانونية والإقليمية' : 'Legal & Regional Settings'}
          </h3>
          
          <JurisdictionSelector
            value={localSettings.primaryJurisdiction}
            onChange={(value) => setLocalSettings(prev => ({ ...prev, primaryJurisdiction: value }))}
            label={isRTL ? 'السلطة القضائية الأساسية' : 'Primary Jurisdiction'}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? 'تنسيق العملة' : 'Currency Format'}</Label>
              <Input
                value={localSettings.currencyFormat}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, currencyFormat: e.target.value }))}
                placeholder="SAR, AED, EGP..."
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>{isRTL ? 'التاريخ الهجري' : 'Hijri Dates'}</Label>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'استخدام التقويم الهجري' : 'Use Islamic calendar'}
                </p>
              </div>
              <Switch
                checked={localSettings.useHijriDates}
                onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, useHijriDates: checked }))}
              />
            </div>
          </div>
        </div>

        {/* Dialect Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Languages className="h-4 w-4" />
            {isRTL ? 'إعدادات اللهجة' : 'Dialect Settings'}
          </h3>

          <DialectSelector
            value={localSettings.preferredOutputDialect}
            onChange={(value) => setLocalSettings(prev => ({ ...prev, preferredOutputDialect: value }))}
            label={isRTL ? 'لهجة المخرجات المفضلة' : 'Preferred Output Dialect'}
            showDescription
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>{isRTL ? 'الكشف التلقائي عن اللهجة' : 'Auto Dialect Detection'}</Label>
                <p className="text-xs text-muted-foreground">
                  {isRTL 
                    ? 'اكتشاف اللهجة تلقائياً في المستندات المُدخلة'
                    : 'Automatically detect dialects in uploaded documents'
                  }
                </p>
              </div>
              <Switch
                checked={localSettings.inputDialectDetection}
                onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, inputDialectDetection: checked }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>{isRTL ? 'الترجمة إلى الفصحى' : 'Translate to MSA'}</Label>
                <p className="text-xs text-muted-foreground">
                  {isRTL 
                    ? 'تحويل النص العامي إلى العربية الفصحى تلقائياً'
                    : 'Automatically convert dialectal text to Modern Standard Arabic'
                  }
                </p>
              </div>
              <Switch
                checked={localSettings.autoTranslateToMsa}
                onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, autoTranslateToMsa: checked }))}
              />
            </div>
          </div>
        </div>

        {/* Cultural Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {isRTL ? 'الإعدادات الثقافية' : 'Cultural Settings'}
          </h3>

          <div className="space-y-2">
            <Label>{isRTL ? 'النبرة المهنية' : 'Professional Tone'}</Label>
            <Select
              value={localSettings.professionalTone}
              onValueChange={(value: 'formal' | 'semi-formal' | 'informal') => 
                setLocalSettings(prev => ({ ...prev, professionalTone: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="formal">
                  {isRTL ? 'رسمي' : 'Formal'}
                </SelectItem>
                <SelectItem value="semi-formal">
                  {isRTL ? 'شبه رسمي' : 'Semi-formal'}
                </SelectItem>
                <SelectItem value="informal">
                  {isRTL ? 'غير رسمي' : 'Informal'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>{isRTL ? 'التحيات المحلية' : 'Local Greetings'}</Label>
              <p className="text-xs text-muted-foreground">
                {isRTL 
                  ? 'استخدام صيغ التحية الثقافية المناسبة للمنطقة'
                  : 'Use culturally appropriate greetings for the region'
                }
              </p>
            </div>
            <Switch
              checked={localSettings.useLocalGreetings}
              onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, useLocalGreetings: checked }))}
            />
          </div>
        </div>

        {/* Cross-Language Search Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {isRTL ? 'البحث عبر اللغات' : 'Cross-Language Search'}
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>{isRTL ? 'البحث عبر اللغات' : 'Cross-Language Search'}</Label>
                <p className="text-xs text-muted-foreground">
                  {isRTL 
                    ? 'البحث في المستندات بلغة مختلفة عن لغة الاستعلام'
                    : 'Search documents in a different language than the query'
                  }
                </p>
              </div>
              <Switch
                checked={localSettings.enableCrossLanguageSearch}
                onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, enableCrossLanguageSearch: checked }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>{isRTL ? 'الترجمة التلقائية للاستعلامات' : 'Auto-Translate Queries'}</Label>
                <p className="text-xs text-muted-foreground">
                  {isRTL 
                    ? 'ترجمة استعلامات البحث تلقائياً لتحسين النتائج'
                    : 'Automatically translate search queries for better results'
                  }
                </p>
              </div>
              <Switch
                checked={localSettings.autoTranslateQueries}
                onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, autoTranslateQueries: checked }))}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending 
              ? (isRTL ? 'جارٍ الحفظ...' : 'Saving...') 
              : (isRTL ? 'حفظ الإعدادات' : 'Save Settings')
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
