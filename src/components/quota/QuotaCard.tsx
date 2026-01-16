import { useTranslation } from 'react-i18next';
import { FileText, Cpu, HardDrive, Infinity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { quotaService, type QuotaInfo, type SubscriptionTier } from '@/services/quotaService';
import { cn } from '@/lib/utils';

interface QuotaItemProps {
  icon: React.ReactNode;
  label: string;
  quota: QuotaInfo;
  formatValue?: (value: number) => string;
}

function QuotaItem({ icon, label, quota, formatValue }: QuotaItemProps) {
  const { t } = useTranslation();
  const isUnlimited = quota.limit === null;
  const percentage = quotaService.getPercentageUsed(quota);
  const isNearLimit = quotaService.isNearLimit(quota);
  const isExceeded = quotaService.isQuotaExceeded(quota);

  const format = formatValue || ((v: number) => v.toString());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <span className={cn(
          "font-medium",
          isExceeded && "text-destructive",
          isNearLimit && !isExceeded && "text-warning"
        )}>
          {format(quota.current)}
          {' / '}
          {isUnlimited ? (
            <span className="inline-flex items-center gap-1">
              <Infinity className="h-3 w-3" />
              {t('quota.unlimited')}
            </span>
          ) : (
            format(quota.limit!)
          )}
        </span>
      </div>
      {!isUnlimited && (
        <Progress 
          value={percentage} 
          className={cn(
            "h-2",
            isExceeded && "[&>div]:bg-destructive",
            isNearLimit && !isExceeded && "[&>div]:bg-warning"
          )}
        />
      )}
    </div>
  );
}

interface QuotaCardProps {
  tier: SubscriptionTier;
  documents: QuotaInfo;
  processing: QuotaInfo;
  storage: QuotaInfo;
  compact?: boolean;
}

export function QuotaCard({ tier, documents, processing, storage, compact = false }: QuotaCardProps) {
  const { t } = useTranslation();

  if (compact) {
    return (
      <div className="space-y-4 p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t('quota.title')}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {quotaService.getTierDisplayName(tier)}
          </span>
        </div>
        <div className="space-y-3">
          <QuotaItem
            icon={<FileText className="h-4 w-4" />}
            label={t('quota.documents')}
            quota={documents}
          />
          <QuotaItem
            icon={<Cpu className="h-4 w-4" />}
            label={t('quota.processing')}
            quota={processing}
          />
          <QuotaItem
            icon={<HardDrive className="h-4 w-4" />}
            label={t('quota.storage')}
            quota={storage}
            formatValue={(v) => quotaService.formatBytes(v)}
          />
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('quota.title')}</CardTitle>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {quotaService.getTierDisplayName(tier)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <QuotaItem
          icon={<FileText className="h-4 w-4" />}
          label={t('quota.documents')}
          quota={documents}
        />
        <QuotaItem
          icon={<Cpu className="h-4 w-4" />}
          label={t('quota.processing')}
          quota={processing}
        />
        <QuotaItem
          icon={<HardDrive className="h-4 w-4" />}
          label={t('quota.storage')}
          quota={storage}
          formatValue={(v) => quotaService.formatBytes(v)}
        />
      </CardContent>
    </Card>
  );
}
