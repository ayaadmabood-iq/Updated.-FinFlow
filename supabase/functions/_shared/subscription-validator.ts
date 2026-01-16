/**
 * Subscription Validation Service
 * Ensures users have valid active subscriptions before accessing paid features
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'expired';

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  isValid: boolean;
  expiresAt: string | null;
  reason?: string;
}

export interface TierLimits {
  documents: number | null;
  processing: number | null;
  storage: number;
  features: string[];
}

const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    documents: 10,
    processing: 50,
    storage: 100 * 1024 * 1024, // 100MB
    features: ['basic_search', 'basic_chat'],
  },
  starter: {
    documents: 100,
    processing: 500,
    storage: 1024 * 1024 * 1024, // 1GB
    features: ['basic_search', 'basic_chat', 'export', 'api_access'],
  },
  pro: {
    documents: 1000,
    processing: 5000,
    storage: 10 * 1024 * 1024 * 1024, // 10GB
    features: ['basic_search', 'basic_chat', 'export', 'api_access', 'training', 'advanced_analytics', 'team_collaboration'],
  },
  enterprise: {
    documents: null, // Unlimited
    processing: null, // Unlimited
    storage: 100 * 1024 * 1024 * 1024, // 100GB
    features: ['basic_search', 'basic_chat', 'export', 'api_access', 'training', 'advanced_analytics', 'team_collaboration', 'sso', 'audit_logs', 'dedicated_support'],
  },
};

/**
 * Validate a user's subscription status
 */
export async function validateSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionInfo> {
  // Get current subscription
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('tier, status, expires_at, started_at')
    .eq('user_id', userId)
    .single();

  // No subscription = free tier
  if (error || !subscription) {
    return {
      tier: 'free',
      status: 'active',
      isValid: true,
      expiresAt: null,
    };
  }

  const now = new Date();
  const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;

  // Check if subscription has expired
  if (expiresAt && expiresAt < now) {
    // Downgrade to free tier for expired subscriptions
    await supabase
      .from('subscriptions')
      .update({ 
        tier: 'free', 
        status: 'expired',
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId);

    return {
      tier: 'free',
      status: 'expired',
      isValid: true,
      expiresAt: subscription.expires_at,
      reason: 'Subscription expired, downgraded to free tier',
    };
  }

  // Check if subscription is canceled but still within grace period
  if (subscription.status === 'canceled' && expiresAt && expiresAt > now) {
    return {
      tier: subscription.tier as SubscriptionTier,
      status: 'canceled',
      isValid: true,
      expiresAt: subscription.expires_at,
      reason: `Subscription canceled, access until ${expiresAt.toLocaleDateString()}`,
    };
  }

  // Active subscription
  return {
    tier: subscription.tier as SubscriptionTier,
    status: subscription.status as SubscriptionStatus,
    isValid: subscription.status === 'active' || subscription.status === 'canceled',
    expiresAt: subscription.expires_at,
  };
}

/**
 * Check if a feature is available for a tier
 */
export function isFeatureAvailable(tier: SubscriptionTier, feature: string): boolean {
  return TIER_LIMITS[tier].features.includes(feature);
}

/**
 * Get tier limits
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_LIMITS[tier];
}

/**
 * Check if user can perform an action based on their tier
 */
export async function checkTierAccess(
  supabase: SupabaseClient,
  userId: string,
  requiredFeature: string
): Promise<{ allowed: boolean; tier: SubscriptionTier; reason?: string }> {
  const subscription = await validateSubscription(supabase, userId);

  if (!subscription.isValid) {
    return {
      allowed: false,
      tier: subscription.tier,
      reason: subscription.reason || 'Invalid subscription',
    };
  }

  const hasFeature = isFeatureAvailable(subscription.tier, requiredFeature);
  
  if (!hasFeature) {
    return {
      allowed: false,
      tier: subscription.tier,
      reason: `Feature '${requiredFeature}' requires upgrade from ${subscription.tier} tier`,
    };
  }

  return {
    allowed: true,
    tier: subscription.tier,
  };
}

/**
 * Enforce quota limits for a user
 */
export async function enforceQuotaLimit(
  supabase: SupabaseClient,
  userId: string,
  quotaType: 'documents' | 'processing' | 'storage',
  currentUsage: number,
  requestedAmount: number = 1
): Promise<{ allowed: boolean; current: number; limit: number | null; tier: SubscriptionTier }> {
  const subscription = await validateSubscription(supabase, userId);
  const limits = getTierLimits(subscription.tier);
  const limit = limits[quotaType];

  // Null means unlimited
  if (limit === null) {
    return {
      allowed: true,
      current: currentUsage,
      limit: null,
      tier: subscription.tier,
    };
  }

  const projectedUsage = currentUsage + requestedAmount;
  const allowed = projectedUsage <= limit;

  return {
    allowed,
    current: currentUsage,
    limit,
    tier: subscription.tier,
  };
}
