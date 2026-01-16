import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Crown, Building, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBilling } from '@/hooks/useBilling';
import { billingService, type SubscriptionTier } from '@/services/billingService';

const tierIcons: Record<SubscriptionTier, React.ReactNode> = {
  free: null,
  starter: <Zap className="h-5 w-5" />,
  pro: <Crown className="h-5 w-5" />,
  enterprise: <Building className="h-5 w-5" />,
};

const tierColors: Record<SubscriptionTier, string> = {
  free: 'bg-muted',
  starter: 'bg-blue-500',
  pro: 'bg-purple-500',
  enterprise: 'bg-amber-500',
};

export default function PricingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { 
    subscription, 
    plans, 
    isLoadingPlans, 
    upgrade, 
    isUpgrading,
    formatPrice,
    formatBytes,
  } = useBilling();

  const currentTier = subscription?.tier || 'free';

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (tier === 'enterprise') {
      // Redirect to contact sales
      window.open('mailto:sales@fineflow.com?subject=Enterprise Inquiry', '_blank');
      return;
    }

    try {
      await upgrade(tier);
      navigate('/dashboard');
    } catch (error) {
      // Error handled by hook
    }
  };

  const getTierOrder = (tier: SubscriptionTier): number => {
    const order = { free: 0, starter: 1, pro: 2, enterprise: 3 };
    return order[tier];
  };

  const getButtonText = (tier: SubscriptionTier): string => {
    if (tier === currentTier) return t('pricing.currentPlan');
    if (tier === 'enterprise') return t('pricing.contactSales');
    if (getTierOrder(tier) > getTierOrder(currentTier)) return t('pricing.upgrade');
    return t('pricing.downgrade');
  };

  if (isLoadingPlans) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{t('pricing.title')}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('pricing.description')}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans?.map((plan) => {
            const isCurrentPlan = plan.tier === currentTier;
            const isEnterprise = plan.tier === 'enterprise';

            return (
              <Card 
                key={plan.tier} 
                className={`relative flex flex-col ${isCurrentPlan ? 'border-primary shadow-lg' : ''}`}
              >
                {isCurrentPlan && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                    {t('pricing.currentPlan')}
                  </Badge>
                )}

                <CardHeader className="text-center pb-4">
                  <div className={`mx-auto mb-3 p-3 rounded-full ${tierColors[plan.tier]} text-white`}>
                    {tierIcons[plan.tier] || <Check className="h-5 w-5" />}
                  </div>
                  <CardTitle className="text-xl">
                    {t(`pricing.${plan.tier}`)}
                  </CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">
                      {formatPrice(plan.price_monthly, plan.currency)}
                    </span>
                    {plan.price_monthly !== null && plan.price_monthly > 0 && (
                      <span className="text-muted-foreground">/{t('pricing.month')}</span>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 space-y-3">
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>
                        {plan.documents_limit 
                          ? `${plan.documents_limit} ${t('pricing.documents')}`
                          : t('pricing.unlimitedDocuments')}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>
                        {plan.processing_limit 
                          ? `${plan.processing_limit} ${t('pricing.processingPerMonth')}`
                          : t('pricing.unlimitedProcessing')}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{formatBytes(plan.storage_limit_bytes)} {t('pricing.storage')}</span>
                    </li>
                    {plan.tier === 'pro' && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{t('pricing.prioritySupport')}</span>
                      </li>
                    )}
                    {plan.tier === 'enterprise' && (
                      <>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{t('pricing.dedicatedSupport')}</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{t('pricing.customIntegrations')}</span>
                        </li>
                      </>
                    )}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? 'secondary' : isEnterprise ? 'outline' : 'default'}
                    disabled={isCurrentPlan || isUpgrading}
                    onClick={() => handleUpgrade(plan.tier)}
                  >
                    {isUpgrading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {getButtonText(plan.tier)}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ or additional info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>{t('pricing.questionsContact')} <a href="mailto:support@fineflow.com" className="text-primary hover:underline">support@fineflow.com</a></p>
        </div>
      </div>
    </DashboardLayout>
  );
}
