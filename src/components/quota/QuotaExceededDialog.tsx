import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowUpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { quotaService, type SubscriptionTier } from '@/services/quotaService';

interface QuotaExceededDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotaType: 'documents' | 'processing' | 'storage';
  current: number;
  limit: number;
  tier: SubscriptionTier;
  onUpgrade?: () => void;
}

export function QuotaExceededDialog({
  open,
  onOpenChange,
  quotaType,
  current,
  limit,
  tier,
  onUpgrade,
}: QuotaExceededDialogProps) {
  const { t } = useTranslation();

  const formatValue = quotaType === 'storage' 
    ? quotaService.formatBytes 
    : (v: number) => v.toString();

  const nextTier = getNextTier(tier);
  const nextTierLimits = getNextTierLimits(tier, quotaType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">
            {t('quota.exceeded')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t('quota.exceededDescription', {
              type: t(`quota.${quotaType}`),
              current: formatValue(current),
              limit: formatValue(limit),
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('quota.currentPlan')}</span>
            <span className="font-medium">{quotaService.getTierDisplayName(tier)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t(`quota.${quotaType}`)}</span>
            <span className="font-medium text-destructive">
              {formatValue(current)} / {formatValue(limit)}
            </span>
          </div>
        </div>

        {nextTier && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-primary font-medium">
              <ArrowUpCircle className="h-4 w-4" />
              <span>{t('quota.upgradeToUnlock', { tier: quotaService.getTierDisplayName(nextTier) })}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('quota.upgradeLimit', {
                type: t(`quota.${quotaType}`),
                limit: nextTierLimits,
              })}
            </p>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {onUpgrade && (
            <Button onClick={onUpgrade} className="w-full">
              <ArrowUpCircle className="h-4 w-4 me-2" />
              {t('quota.upgrade')}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getNextTier(currentTier: SubscriptionTier): SubscriptionTier | null {
  const tierOrder: SubscriptionTier[] = ['free', 'starter', 'pro', 'enterprise'];
  const currentIndex = tierOrder.indexOf(currentTier);
  if (currentIndex < tierOrder.length - 1) {
    return tierOrder[currentIndex + 1];
  }
  return null;
}

function getNextTierLimits(currentTier: SubscriptionTier, quotaType: string): string {
  const limits: Record<SubscriptionTier, Record<string, string>> = {
    free: { documents: '500', processing: '200/mo', storage: '5 GB' },
    starter: { documents: 'Unlimited', processing: '1000/mo', storage: '25 GB' },
    pro: { documents: 'Unlimited', processing: 'Unlimited', storage: '100 GB' },
    enterprise: { documents: 'Unlimited', processing: 'Unlimited', storage: '100 GB' },
  };

  const nextTier = getNextTier(currentTier);
  if (!nextTier) return 'Maximum';
  
  return limits[nextTier][quotaType] || 'More';
}
