import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Languages, ArrowLeftRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { localizationService } from '@/services/localizationService';

interface CrossLanguageSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string, translatedQuery?: string, targetLang?: string) => void;
  placeholder?: string;
  enableCrossLanguage?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function CrossLanguageSearchInput({
  value,
  onChange,
  onSearch,
  placeholder,
  enableCrossLanguage = true,
  isLoading = false,
  className = '',
}: CrossLanguageSearchInputProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [detectedLanguage, setDetectedLanguage] = React.useState<'ar' | 'en' | 'mixed'>('en');
  const [showCrossLanguage, setShowCrossLanguage] = React.useState(false);

  React.useEffect(() => {
    if (value) {
      const lang = localizationService.detectLanguage(value);
      setDetectedLanguage(lang);
      setShowCrossLanguage(enableCrossLanguage && lang !== 'mixed');
    } else {
      setShowCrossLanguage(false);
    }
  }, [value, enableCrossLanguage]);

  const handleSearch = () => {
    onSearch(value);
  };

  const handleCrossLanguageSearch = () => {
    const targetLang = detectedLanguage === 'ar' ? 'en' : 'ar';
    onSearch(value, undefined, targetLang);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const languageLabel = {
    ar: isRTL ? 'العربية' : 'Arabic',
    en: isRTL ? 'الإنجليزية' : 'English',
    mixed: isRTL ? 'مختلط' : 'Mixed',
  };

  const crossLanguageLabel = detectedLanguage === 'ar'
    ? (isRTL ? 'البحث بالإنجليزية أيضاً' : 'Also search in English')
    : (isRTL ? 'البحث بالعربية أيضاً' : 'Also search in Arabic');

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || (isRTL ? 'البحث في المستندات...' : 'Search documents...')}
            className="pl-9 pr-20"
            dir={detectedLanguage === 'ar' ? 'rtl' : 'ltr'}
          />
          
          {value && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Badge variant="outline" className="text-xs py-0 px-1.5">
                {languageLabel[detectedLanguage]}
              </Badge>
            </div>
          )}
        </div>

        <Button onClick={handleSearch} disabled={!value || isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {showCrossLanguage && (
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCrossLanguageSearch}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Languages className="h-4 w-4" />
                  <ArrowLeftRight className="h-3 w-3" />
                  {crossLanguageLabel}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isRTL 
                  ? 'البحث في المستندات بلغة أخرى باستخدام الترجمة التلقائية'
                  : 'Search documents in another language using automatic translation'
                }
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}
