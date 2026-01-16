import React from 'react';
import { useSubscriptionGuard, Feature } from '@/hooks/useSubscriptionGuard';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FeatureGateProps {
  feature: Feature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

/**
 * Component to gate features based on subscription tier
 * Renders children only if user has access to the feature
 */
export function FeatureGate({ 
  feature, 
  children, 
  fallback,
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const { hasFeature, getRequiredTierForFeature, tier } = useSubscriptionGuard();
  const navigate = useNavigate();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  const requiredTier = getRequiredTierForFeature(feature);
  const featureLabel = feature.replace(/_/g, ' ');

  return (
    <div 
      className="relative rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-6"
      role="region"
      aria-label={`${featureLabel} - requires upgrade`}
    >
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div className="rounded-full bg-primary/10 p-3">
          <Lock className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold capitalize">{featureLabel}</h3>
          <p className="text-sm text-muted-foreground">
            This feature requires the <span className="font-medium capitalize">{requiredTier}</span> plan or higher.
          </p>
          <p className="text-xs text-muted-foreground">
            You're currently on the <span className="font-medium capitalize">{tier}</span> plan.
          </p>
        </div>
        <Button 
          onClick={() => navigate('/pricing')}
          className="gap-2"
          aria-label={`Upgrade to ${requiredTier} plan`}
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Upgrade to {requiredTier}
        </Button>
      </div>
    </div>
  );
}

/**
 * HOC to wrap components with feature gating
 */
export function withFeatureGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: Feature,
  fallback?: React.ReactNode
) {
  return function FeatureGatedComponent(props: P) {
    return (
      <FeatureGate feature={feature} fallback={fallback}>
        <WrappedComponent {...props} />
      </FeatureGate>
    );
  };
}
