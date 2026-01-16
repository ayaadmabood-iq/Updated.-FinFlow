import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuotaWarningProps {
  quotaType: 'documents' | 'processing' | 'storage';
  current: number;
  limit: number;
  onUpgrade?: () => void;
  className?: string;
}

export function QuotaWarning({ quotaType, current, limit, onUpgrade, className }: QuotaWarningProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const percentage = Math.round((current / limit) * 100);

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-lg bg-warning/10 border border-warning/20 text-warning-foreground",
      className
    )}>
      <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {t('quota.warning', { 
            type: t(`quota.${quotaType}`),
            percentage 
          })}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('quota.used', { current, limit })}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onUpgrade && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onUpgrade}
            className="text-xs"
          >
            {t('quota.upgrade')}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
