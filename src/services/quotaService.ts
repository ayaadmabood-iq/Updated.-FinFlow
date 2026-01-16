import { supabase } from '@/integrations/supabase/client';

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise';

export interface QuotaInfo {
  current: number;
  limit: number | null; // null means unlimited
}

export interface QuotaStatus {
  tier: SubscriptionTier;
  documents: QuotaInfo;
  processing: QuotaInfo & { resetDate?: string };
  storage: QuotaInfo;
}

export interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  limit: number | null;
  tier: SubscriptionTier;
  quotaType?: string;
}

class QuotaService {
  // Get current quota status
  async getQuotaStatus(): Promise<QuotaStatus> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('quota-status', {
      method: 'GET',
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch quota status');
    }

    return data as QuotaStatus;
  }

  // Check if a specific quota allows the action (client-side check for UX)
  isQuotaExceeded(quota: QuotaInfo): boolean {
    if (quota.limit === null) return false; // unlimited
    return quota.current >= quota.limit;
  }

  // Check if near limit (80% threshold)
  isNearLimit(quota: QuotaInfo): boolean {
    if (quota.limit === null) return false; // unlimited
    return quota.current >= quota.limit * 0.8 && quota.current < quota.limit;
  }

  // Calculate percentage used
  getPercentageUsed(quota: QuotaInfo): number {
    if (quota.limit === null) return 0; // Show 0% for unlimited
    if (quota.limit === 0) return 100;
    return Math.min(100, Math.round((quota.current / quota.limit) * 100));
  }

  // Format bytes to human readable
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Get tier display name
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

export const quotaService = new QuotaService();
