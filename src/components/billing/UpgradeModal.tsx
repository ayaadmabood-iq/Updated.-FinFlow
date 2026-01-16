import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Zap, Crown, Loader2, ArrowRight, Ticket } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBilling, useValidateInviteCode } from '@/hooks/useBilling';
import { useQuotaStatus } from '@/hooks/useQuota';
import { billingService, type SubscriptionTier } from '@/services/billingService';
import { quotaService } from '@/services/quotaService';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotaType?: 'documents' | 'processing' | 'storage';
  onSuccess?: () => void;
}

export function UpgradeModal({ open, onOpenChange, quotaType, onSuccess }: UpgradeModalProps) {
  const { t } = useTranslation();
  const { subscription, plans, upgrade, isUpgrading } = useBilling();
  const { data: quotaStatus } = useQuotaStatus();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const validateInviteCode = useValidateInviteCode();

  const currentTier = subscription?.tier || 'free';
  const tierOrder: SubscriptionTier[] = ['free', 'starter', 'pro', 'enterprise'];
  const currentIndex = tierOrder.indexOf(currentTier);
  
  // Filter to only show upgrades
  const upgradePlans = plans?.filter(plan => {
    const planIndex = tierOrder.indexOf(plan.tier);
    return planIndex > currentIndex && plan.tier !== 'enterprise';
  }) || [];

  const nextTier = upgradePlans[0];

  const handleUpgrade = async () => {
    const tier = selectedTier || nextTier?.tier;
    if (!tier) return;

    setInviteError(null);

    // Validate invite code first if provided
    if (inviteCode.trim()) {
      const validation = await validateInviteCode.mutateAsync(inviteCode.trim());
      if (!validation.valid) {
        setInviteError(validation.error || 'Invalid invite code');
        return;
      }
    }

    try {
      await upgrade(tier, inviteCode.trim() || undefined);
      onOpenChange(false);
      setInviteCode('');
      onSuccess?.();
    } catch (error) {
      if (error instanceof Error && error.message.includes('invite code')) {
        setInviteError(error.message);
      }
      // Other errors handled by hook
    }
  };

  const getQuotaInfo = () => {
    if (!quotaStatus || !quotaType) return null;

    const quota = quotaStatus[quotaType];
    if (!quota) return null;

    return {
      current: quota.current,
      limit: quota.limit,
      percentage: quotaService.getPercentageUsed(quota),
    };
  };

  const quotaInfo = getQuotaInfo();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            {t('pricing.upgradeTitle')}
          </DialogTitle>
          <DialogDescription>
            {quotaType 
              ? t('pricing.upgradeQuotaDescription', { type: t(`quota.${quotaType}`) })
              : t('pricing.upgradeDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current usage */}
          {quotaInfo && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('pricing.currentUsage')}</span>
                <span className="font-medium">
                  {quotaType === 'storage' 
                    ? `${quotaService.formatBytes(quotaInfo.current)} / ${quotaInfo.limit ? quotaService.formatBytes(quotaInfo.limit) : t('quota.unlimited')}`
                    : `${quotaInfo.current} / ${quotaInfo.limit ?? t('quota.unlimited')}`}
                </span>
              </div>
              <Progress value={quotaInfo.percentage} className="h-2" />
            </div>
          )}

          {/* Upgrade options */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">{t('pricing.selectPlan')}</h4>
            {upgradePlans.map((plan) => {
              const isSelected = selectedTier === plan.tier || (!selectedTier && plan.tier === nextTier?.tier);
              
              return (
                <div
                  key={plan.tier}
                  onClick={() => setSelectedTier(plan.tier)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        plan.tier === 'starter' ? 'bg-blue-500' : 'bg-purple-500'
                      } text-white`}>
                        {plan.tier === 'starter' ? <Zap className="h-4 w-4" /> : <Crown className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium">{billingService.getTierDisplayName(plan.tier)}</p>
                        <p className="text-sm text-muted-foreground">
                          {plan.documents_limit 
                            ? `${plan.documents_limit} docs`
                            : t('quota.unlimited')} • {quotaService.formatBytes(plan.storage_limit_bytes)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {billingService.formatPrice(plan.price_monthly, plan.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">/{t('pricing.month')}</p>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="mt-3 pt-3 border-t space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-3 w-3 text-green-500" />
                      <span>
                        {plan.documents_limit 
                          ? `${plan.documents_limit} ${t('pricing.documents')}`
                          : t('pricing.unlimitedDocuments')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-3 w-3 text-green-500" />
                      <span>
                        {plan.processing_limit 
                          ? `${plan.processing_limit} ${t('pricing.processingPerMonth')}`
                          : t('pricing.unlimitedProcessing')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Invite code input for soft launch */}
          {upgradePlans.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="invite-code" className="flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                {t('pricing.inviteCode', 'Invite Code')}
              </Label>
              <Input
                id="invite-code"
                placeholder={t('pricing.inviteCodePlaceholder', 'Enter your invite code')}
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value.toUpperCase());
                  setInviteError(null);
                }}
                className={inviteError ? 'border-destructive' : ''}
                aria-describedby={inviteError ? 'invite-error' : undefined}
              />
              {inviteError && (
                <p id="invite-error" className="text-sm text-destructive">{inviteError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('pricing.inviteCodeNote', 'Required during soft launch. Contact us to get an invite code.')}
              </p>
            </div>
          )}

          {/* Enterprise option */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              {t('pricing.needMore')}{' '}
              <a href="mailto:sales@fineflow.com" className="text-primary hover:underline">
                {t('pricing.contactSales')}
              </a>
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleUpgrade} disabled={isUpgrading || upgradePlans.length === 0}>
            {isUpgrading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('pricing.upgrade')}
            <ArrowRight className="ms-2 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
