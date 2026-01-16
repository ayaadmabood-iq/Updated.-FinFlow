import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Zap, Crown, Building, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBilling } from '@/hooks/useBilling';
import { billingService, type SubscriptionTier } from '@/services/billingService';

const tierIcons: Record<SubscriptionTier, React.ReactNode> = {
  free: null,
  starter: <Zap className="h-4 w-4" />,
  pro: <Crown className="h-4 w-4" />,
  enterprise: <Building className="h-4 w-4" />,
};

const tierColors: Record<SubscriptionTier, string> = {
  free: 'bg-muted text-muted-foreground',
  starter: 'bg-blue-500 text-white',
  pro: 'bg-purple-500 text-white',
  enterprise: 'bg-amber-500 text-white',
};

interface SubscriptionStatusProps {
  compact?: boolean;
}

export function SubscriptionStatus({ compact = false }: SubscriptionStatusProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { subscription, isLoadingSubscription, cancel, isCanceling } = useBilling();

  const tier = subscription?.tier || 'free';
  const status = subscription?.status || 'active';
  const expiresAt = subscription?.subscription?.expires_at;

  if (isLoadingSubscription) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge className={tierColors[tier]}>
          {tierIcons[tier]}
          <span className="ms-1">{billingService.getTierDisplayName(tier)}</span>
        </Badge>
        {status === 'canceled' && expiresAt && (
          <span className="text-xs text-muted-foreground">
            {t('billing.expiresOn', { date: new Date(expiresAt).toLocaleDateString() })}
          </span>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className={`p-2 rounded-full ${tierColors[tier]}`}>
            {tierIcons[tier] || <Zap className="h-4 w-4" />}
          </span>
          {t('billing.subscriptionStatus')}
        </CardTitle>
        <CardDescription>
          {t('billing.manageSubscription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t('billing.currentPlan')}</p>
            <p className="text-2xl font-bold">{billingService.getTierDisplayName(tier)}</p>
          </div>
          <Badge 
            variant={status === 'active' ? 'default' : 'destructive'}
            className="capitalize"
          >
            {status}
          </Badge>
        </div>

        {status === 'canceled' && expiresAt && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span>
              {t('billing.canceledNotice', { 
                date: new Date(expiresAt).toLocaleDateString() 
              })}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={() => navigate('/pricing')} className="flex-1">
            {tier === 'enterprise' ? t('billing.manage') : t('pricing.upgrade')}
          </Button>
          {tier !== 'free' && status === 'active' && (
            <Button 
              variant="outline" 
              onClick={() => cancel()}
              disabled={isCanceling}
            >
              {isCanceling && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('pricing.cancel')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
