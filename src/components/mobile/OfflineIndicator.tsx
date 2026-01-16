import { usePWA } from '@/hooks/usePWA';
import { WifiOff, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline, isUpdateAvailable, updateApp } = usePWA();

  if (isOnline && !isUpdateAvailable) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-yellow-500 text-yellow-950 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
          <WifiOff className="h-4 w-4" />
          <span>You're offline. Some features may be limited.</span>
        </div>
      )}

      {/* Update available */}
      {isUpdateAvailable && (
        <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span>A new version is available</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={updateApp}
            className="h-7"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Update
          </Button>
        </div>
      )}
    </div>
  );
}

// Offline-aware wrapper component
interface OfflineAwareProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requiresOnline?: boolean;
}

export function OfflineAware({ 
  children, 
  fallback, 
  requiresOnline = false 
}: OfflineAwareProps) {
  const { isOnline } = usePWA();

  if (!isOnline && requiresOnline) {
    return fallback || (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <WifiOff className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">You're offline</h3>
        <p className="text-sm text-muted-foreground">
          This feature requires an internet connection
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
