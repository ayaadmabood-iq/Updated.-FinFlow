import React from 'react';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Banner to show subscription expiry warnings
 */
export function SubscriptionExpiryBanner() {
  const { isCanceled, expiresAt, tier } = useSubscriptionGuard();
  const navigate = useNavigate();

  if (!isCanceled || !expiresAt || tier === 'free') {
    return null;
  }

  const expiryDate = new Date(expiresAt);
  const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Subscription Expired</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>Your {tier} subscription has expired. You've been downgraded to the free plan.</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/pricing')}
            className="ml-4"
          >
            Renew Subscription
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="default" className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
      <Clock className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-200">Subscription Ending Soon</AlertTitle>
      <AlertDescription className="flex items-center justify-between text-yellow-700 dark:text-yellow-300">
        <span>
          Your {tier} subscription will expire in {daysLeft} day{daysLeft > 1 ? 's' : ''} 
          ({expiryDate.toLocaleDateString()}).
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/pricing')}
          className="ml-4 border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-400 dark:text-yellow-300"
        >
          Renew Now
        </Button>
      </AlertDescription>
    </Alert>
  );
}
