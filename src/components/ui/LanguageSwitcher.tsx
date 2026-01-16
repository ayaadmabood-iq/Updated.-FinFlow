import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supportedLanguages, type SupportedLanguage } from '@/lib/i18n';

interface LanguageSwitcherProps {
  compact?: boolean;
}

export const LanguageSwitcher = React.forwardRef<
  HTMLButtonElement,
  LanguageSwitcherProps
>(({ compact = false }, ref) => {
  const { i18n } = useTranslation();

  const currentLang = supportedLanguages.find((l) => l.code === i18n.language) 
    || supportedLanguages[0];

  const handleChange = (value: SupportedLanguage) => {
    i18n.changeLanguage(value);
  };

  return (
    <Select value={i18n.language} onValueChange={handleChange}>
      <SelectTrigger ref={ref} className={compact ? 'w-[70px]' : 'w-[180px]'}>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          {compact ? (
            <span className="uppercase text-xs font-medium">{currentLang.code}</span>
          ) : (
            <SelectValue>{currentLang.nativeName}</SelectValue>
          )}
        </div>
      </SelectTrigger>
      <SelectContent>
        {supportedLanguages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <div className="flex items-center gap-2">
              <span className="font-medium">{lang.nativeName}</span>
              <span className="text-muted-foreground text-xs">({lang.name})</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

LanguageSwitcher.displayName = 'LanguageSwitcher';
