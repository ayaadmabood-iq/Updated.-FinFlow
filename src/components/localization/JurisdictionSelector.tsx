import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Building2, Globe } from 'lucide-react';
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
  JURISDICTION_NAMES, 
  type JurisdictionRegion 
} from '@/services/localizationService';

interface JurisdictionSelectorProps {
  value: JurisdictionRegion;
  onChange: (value: JurisdictionRegion) => void;
  label?: string;
  showFlags?: boolean;
  disabled?: boolean;
}

const JURISDICTION_FLAGS: Partial<Record<JurisdictionRegion, string>> = {
  sau: '🇸🇦',
  uae: '🇦🇪',
  egy: '🇪🇬',
  jor: '🇯🇴',
  kwt: '🇰🇼',
  bhr: '🇧🇭',
  omn: '🇴🇲',
  qat: '🇶🇦',
  lbn: '🇱🇧',
  mar: '🇲🇦',
  dza: '🇩🇿',
  tun: '🇹🇳',
  irq: '🇮🇶',
  yen: '🇾🇪',
  global: '🌍',
};

const JURISDICTION_GROUPS = {
  gulf: ['sau', 'uae', 'kwt', 'bhr', 'omn', 'qat'] as JurisdictionRegion[],
  levant: ['lbn', 'jor'] as JurisdictionRegion[],
  northAfrica: ['egy', 'mar', 'dza', 'tun'] as JurisdictionRegion[],
  other: ['irq', 'yen', 'global'] as JurisdictionRegion[],
};

export function JurisdictionSelector({
  value,
  onChange,
  label,
  showFlags = true,
  disabled = false,
}: JurisdictionSelectorProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const langKey = isRTL ? 'ar' : 'en';

  const renderJurisdictionItem = (jurisdiction: JurisdictionRegion) => (
    <SelectItem key={jurisdiction} value={jurisdiction}>
      <div className="flex items-center gap-2">
        {showFlags && (
          <span className="text-base">{JURISDICTION_FLAGS[jurisdiction]}</span>
        )}
        <span>{JURISDICTION_NAMES[jurisdiction][langKey]}</span>
      </div>
    </SelectItem>
  );

  return (
    <div className="space-y-2">
      {label && (
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {label}
        </Label>
      )}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue>
            <div className="flex items-center gap-2">
              {showFlags && <span>{JURISDICTION_FLAGS[value]}</span>}
              <span>{JURISDICTION_NAMES[value][langKey]}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* Gulf Countries */}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            {isRTL ? 'دول الخليج' : 'Gulf Countries'}
          </div>
          {JURISDICTION_GROUPS.gulf.map(renderJurisdictionItem)}

          {/* Levant */}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
            {isRTL ? 'بلاد الشام' : 'Levant'}
          </div>
          {JURISDICTION_GROUPS.levant.map(renderJurisdictionItem)}

          {/* North Africa */}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
            {isRTL ? 'شمال أفريقيا' : 'North Africa'}
          </div>
          {JURISDICTION_GROUPS.northAfrica.map(renderJurisdictionItem)}

          {/* Other */}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
            {isRTL ? 'أخرى' : 'Other'}
          </div>
          {JURISDICTION_GROUPS.other.map(renderJurisdictionItem)}
        </SelectContent>
      </Select>
    </div>
  );
}

interface JurisdictionBadgeProps {
  jurisdiction: JurisdictionRegion;
  showFlag?: boolean;
  variant?: 'default' | 'secondary' | 'outline';
}

export function JurisdictionBadge({ 
  jurisdiction, 
  showFlag = true,
  variant = 'secondary',
}: JurisdictionBadgeProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const langKey = isRTL ? 'ar' : 'en';

  return (
    <Badge variant={variant} className="gap-1">
      {showFlag && <span>{JURISDICTION_FLAGS[jurisdiction]}</span>}
      <span>{JURISDICTION_NAMES[jurisdiction][langKey]}</span>
    </Badge>
  );
}
