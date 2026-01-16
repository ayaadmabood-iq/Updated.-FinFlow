import { useCallback, useMemo } from 'react';
import { useSubscription } from './useBilling';
import { useQuotaStatus } from './useQuota';
import { toast } from 'sonner';

export type Feature = 
  | 'basic_search' 
  | 'basic_chat' 
  | 'export' 
  | 'api_access' 
  | 'training' 
  | 'advanced_analytics' 
  | 'team_collaboration'
  | 'sso'
  | 'audit_logs'
  | 'dedicated_support';

type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise';

const TIER_FEATURES: Record<SubscriptionTier, Feature[]> = {
  free: ['basic_search', 'basic_chat'],
  starter: ['basic_search', 'basic_chat', 'export', 'api_access'],
  pro: ['basic_search', 'basic_chat', 'export', 'api_access', 'training', 'advanced_analytics', 'team_collaboration'],
  enterprise: ['basic_search', 'basic_chat', 'export', 'api_access', 'training', 'advanced_analytics', 'team_collaboration', 'sso', 'audit_logs', 'dedicated_support'],
};

const TIER_ORDER: SubscriptionTier[] = ['free', 'starter', 'pro', 'enterprise'];

interface SubscriptionGuardResult {
  tier: SubscriptionTier;
  isValid: boolean;
  isExpired: boolean;
  isCanceled: boolean;
  expiresAt: string | null;
  hasFeature: (feature: Feature) => boolean;
  requireFeature: (feature: Feature, onBlocked?: () => void) => boolean;
  getRequiredTierForFeature: (feature: Feature) => SubscriptionTier | null;
  checkQuota: (quotaType: 'documents' | 'processing' | 'storage') => { allowed: boolean; nearLimit: boolean };
}

/**
 * Hook to guard features based on subscription tier
 */
export function useSubscriptionGuard(): SubscriptionGuardResult {
  const { data: subscriptionData, isLoading: isLoadingSubscription } = useSubscription();
  const { data: quotaStatus } = useQuotaStatus();

  const tier = useMemo<SubscriptionTier>(() => {
    if (isLoadingSubscription || !subscriptionData) return 'free';
    return subscriptionData.tier as SubscriptionTier;
  }, [subscriptionData, isLoadingSubscription]);

  const isValid = useMemo(() => {
    if (!subscriptionData) return true; // Free tier is always valid
    const status = subscriptionData.status;
    return status === 'active' || status === 'canceled';
  }, [subscriptionData]);

  const isExpired = useMemo(() => {
    if (!subscriptionData?.subscription?.expires_at) return false;
    return new Date(subscriptionData.subscription.expires_at) < new Date();
  }, [subscriptionData]);

  const isCanceled = useMemo(() => {
    return subscriptionData?.status === 'canceled';
  }, [subscriptionData]);

  const expiresAt = useMemo(() => {
    return subscriptionData?.subscription?.expires_at || null;
  }, [subscriptionData]);

  const hasFeature = useCallback((feature: Feature): boolean => {
    return TIER_FEATURES[tier].includes(feature);
  }, [tier]);

  const getRequiredTierForFeature = useCallback((feature: Feature): SubscriptionTier | null => {
    for (const t of TIER_ORDER) {
      if (TIER_FEATURES[t].includes(feature)) {
        return t;
      }
    }
    return null;
  }, []);

  const requireFeature = useCallback((feature: Feature, onBlocked?: () => void): boolean => {
    if (hasFeature(feature)) {
      return true;
    }

    const requiredTier = getRequiredTierForFeature(feature);
    const featureLabel = feature.replace(/_/g, ' ');
    
    toast.error(`${featureLabel} requires ${requiredTier || 'upgrade'}`, {
      description: `Your ${tier} plan doesn't include this feature. Please upgrade to access it.`,
      action: {
        label: 'Upgrade',
        onClick: () => {
          window.location.href = '/pricing';
        },
      },
    });

    onBlocked?.();
    return false;
  }, [hasFeature, getRequiredTierForFeature, tier]);

  const checkQuota = useCallback((quotaType: 'documents' | 'processing' | 'storage'): { allowed: boolean; nearLimit: boolean } => {
    if (!quotaStatus) {
      return { allowed: true, nearLimit: false };
    }

    const quota = quotaStatus[quotaType];
    if (!quota || quota.limit === null) {
      return { allowed: true, nearLimit: false };
    }

    const percentUsed = (quota.current / quota.limit) * 100;
    return {
      allowed: quota.current < quota.limit,
      nearLimit: percentUsed >= 80 && percentUsed < 100,
    };
  }, [quotaStatus]);

  return {
    tier,
    isValid,
    isExpired,
    isCanceled,
    expiresAt,
    hasFeature,
    requireFeature,
    getRequiredTierForFeature,
    checkQuota,
  };
}
