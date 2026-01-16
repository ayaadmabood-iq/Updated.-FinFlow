import { supabase } from '@/integrations/supabase/client';

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due';

export interface PricingPlan {
  tier: SubscriptionTier;
  price_monthly: number | null;
  currency: string;
  documents_limit: number | null;
  processing_limit: number | null;
  storage_limit_bytes: number;
  is_active: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  started_at: string;
  expires_at: string | null;
  provider: string | null;
  provider_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionResponse {
  subscription: Subscription | null;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  plan: PricingPlan | null;
  isValid?: boolean;
  expiresAt?: string | null;
  reason?: string;
}

export interface InviteCodeValidation {
  valid: boolean;
  error?: string;
}

class BillingService {
  /**
   * Get the current user's subscription and plan details
   */
  async getSubscription(): Promise<SubscriptionResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('get-subscription', {
      method: 'GET',
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch subscription');
    }

    return data as SubscriptionResponse;
  }

  /**
   * Create or upgrade subscription to a new tier
   * During soft launch, requires invite code for paid tiers
   */
  async createSubscription(tier: SubscriptionTier, inviteCode?: string): Promise<{ subscription: Subscription; plan: PricingPlan }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('create-subscription', {
      body: { tier, inviteCode },
    });

    if (error) {
      throw new Error(error.message || 'Failed to create subscription');
    }

    // Handle payment required response
    if (data?.requiresPayment) {
      throw new Error(data.message || 'Payment required for this tier');
    }

    return data as { subscription: Subscription; plan: PricingPlan };
  }

  /**
   * Cancel the current subscription
   */
  async cancelSubscription(): Promise<{ subscription: Subscription; expiresAt: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('cancel-subscription', {
      method: 'POST',
    });

    if (error) {
      throw new Error(error.message || 'Failed to cancel subscription');
    }

    return data as { subscription: Subscription; expiresAt: string };
  }

  /**
   * Get all available pricing plans
   */
  async getPricingPlans(): Promise<PricingPlan[]> {
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('is_active', true)
      .order('storage_limit_bytes', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as PricingPlan[];
  }

  /**
   * Validate an invite code for soft launch - query table directly
   */
  async validateInviteCode(code: string): Promise<InviteCodeValidation> {
    const { data, error } = await supabase
      .from('invite_codes')
      .select('code, max_uses, used_count, expires_at')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (error) {
      return { valid: false, error: error.message };
    }

    if (!data) {
      return { valid: false, error: 'Invalid invite code' };
    }

    // Check if code has remaining uses
    if (data.max_uses && data.used_count >= data.max_uses) {
      return { valid: false, error: 'Invite code has reached maximum uses' };
    }

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, error: 'Invite code has expired' };
    }

    return { valid: true };
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Format price for display
   */
  formatPrice(price: number | null, currency: string = 'USD'): string {
    if (price === null) return 'Contact Sales';
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  }

  /**
   * Get tier display name
   */
  getTierDisplayName(tier: SubscriptionTier): string {
    const names: Record<SubscriptionTier, string> = {
      free: 'Free',
      starter: 'Starter',
      pro: 'Pro',
      enterprise: 'Enterprise',
    };
    return names[tier];
  }
}

export const billingService = new BillingService();
