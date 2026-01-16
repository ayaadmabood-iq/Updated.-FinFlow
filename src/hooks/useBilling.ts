import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingService, type SubscriptionTier, type PricingPlan, type SubscriptionResponse } from '@/services/billingService';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useEffect } from 'react';

export type { SubscriptionTier };

/**
 * Hook for fetching current subscription status
 */
export function useSubscription() {
  const { isAuthenticated } = useAuth();

  const query = useQuery<SubscriptionResponse>({
    queryKey: ['subscription'],
    queryFn: () => billingService.getSubscription(),
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // Show warning for canceled/expiring subscriptions
  useEffect(() => {
    if (query.data?.status === 'canceled' && query.data?.expiresAt) {
      const expiryDate = new Date(query.data.expiresAt);
      const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft > 0 && daysLeft <= 7) {
        toast.warning(`Subscription expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`, {
          id: 'subscription-expiry-warning',
          description: 'Renew to keep your access to premium features.',
          action: {
            label: 'Renew',
            onClick: () => window.location.href = '/pricing',
          },
        });
      }
    }
  }, [query.data?.status, query.data?.expiresAt]);

  return query;
}

/**
 * Hook for fetching all available pricing plans
 */
export function usePricingPlans() {
  return useQuery<PricingPlan[]>({
    queryKey: ['pricing-plans'],
    queryFn: () => billingService.getPricingPlans(),
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook for upgrading/creating subscription
 */
export function useUpgrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tier, inviteCode }: { tier: SubscriptionTier; inviteCode?: string }) => 
      billingService.createSubscription(tier, inviteCode),
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['quota-status'] });
      
      toast.success(`Upgraded to ${billingService.getTierDisplayName(data.subscription.tier)}!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook for canceling subscription
 */
export function useCancel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => billingService.cancelSubscription(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      
      const expiryDate = new Date(data.expiresAt).toLocaleDateString();
      toast.success(`Subscription canceled. Access continues until ${expiryDate}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook for validating invite codes
 */
export function useValidateInviteCode() {
  return useMutation({
    mutationFn: (code: string) => billingService.validateInviteCode(code),
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Combined hook for billing operations
 */
export function useBilling() {
  const subscription = useSubscription();
  const pricingPlans = usePricingPlans();
  const upgrade = useUpgrade();
  const cancel = useCancel();

  return {
    // Subscription data
    subscription: subscription.data,
    isLoadingSubscription: subscription.isLoading,
    
    // Pricing plans
    plans: pricingPlans.data,
    isLoadingPlans: pricingPlans.isLoading,
    
    // Mutations
    upgrade: (tier: SubscriptionTier, inviteCode?: string) => 
      upgrade.mutateAsync({ tier, inviteCode }),
    isUpgrading: upgrade.isPending,
    
    cancel: cancel.mutateAsync,
    isCanceling: cancel.isPending,
    
    // Utilities
    formatPrice: billingService.formatPrice,
    formatBytes: billingService.formatBytes,
    getTierDisplayName: billingService.getTierDisplayName,
  };
}
