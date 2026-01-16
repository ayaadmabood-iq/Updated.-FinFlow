import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Download, 
  Smartphone, 
  Share, 
  Plus,
  X,
  Zap,
  WifiOff,
  Bell
} from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export function InstallPrompt() {
  const { isInstallable, isInstalled, promptInstall } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    // Show prompt after user has been on the site for a bit
    if (!isInstalled && (isInstallable || isIOS)) {
      const timer = setTimeout(() => {
        const dismissed = localStorage.getItem('install-prompt-dismissed');
        if (!dismissed) {
          setShowPrompt(true);
        }
      }, 30000); // 30 seconds

      return () => clearTimeout(timer);
    }
  }, [isInstalled, isInstallable, isIOS]);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      const installed = await promptInstall();
      if (installed) {
        setShowPrompt(false);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('install-prompt-dismissed', 'true');
  };

  if (isInstalled) return null;

  return (
    <>
      {/* Floating install button */}
      {(isInstallable || isIOS) && !showPrompt && (
        <Button
          className="fixed bottom-20 right-4 rounded-full shadow-lg z-40 md:hidden"
          onClick={() => setShowPrompt(true)}
        >
          <Download className="h-4 w-4 mr-2" />
          Install App
        </Button>
      )}

      {/* Install prompt dialog */}
      <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Install FineFlow
            </DialogTitle>
            <DialogDescription>
              Get the full app experience with offline access and quick launch
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Benefits */}
            <div className="grid gap-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <Zap className="h-4 w-4" />
                </div>
                <span>Instant launch from home screen</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <WifiOff className="h-4 w-4" />
                </div>
                <span>Access documents offline</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <Bell className="h-4 w-4" />
                </div>
                <span>Get push notifications</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleDismiss}>
                Not Now
              </Button>
              <Button className="flex-1" onClick={handleInstall}>
                <Download className="h-4 w-4 mr-2" />
                Install
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* iOS installation guide */}
      <Dialog open={showIOSGuide} onOpenChange={setShowIOSGuide}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Install on iOS</DialogTitle>
            <DialogDescription>
              Follow these steps to add FineFlow to your home screen
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Tap the Share button</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    Look for <Share className="h-4 w-4" /> at the bottom of Safari
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Scroll and tap "Add to Home Screen"</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    Look for <Plus className="h-4 w-4" /> Add to Home Screen
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Tap "Add" in the top right</p>
                  <p className="text-sm text-muted-foreground">
                    FineFlow will appear on your home screen
                  </p>
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={() => setShowIOSGuide(false)}>
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Inline install banner for dedicated page
export function InstallBanner() {
  const { isInstallable, isInstalled, promptInstall } = usePWA();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isInstalled) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-full bg-green-500 text-white">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-green-800 dark:text-green-200">
              FineFlow is installed
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              You're using the app version
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Install FineFlow
        </CardTitle>
        <CardDescription>
          Add FineFlow to your home screen for quick access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-primary" />
            <span>Works offline</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4 text-primary" />
            <span>Push notifications</span>
          </div>
        </div>

        {isIOS ? (
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium mb-2">To install on iOS:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Tap the Share button in Safari</li>
              <li>Scroll down and tap "Add to Home Screen"</li>
              <li>Tap "Add" to confirm</li>
            </ol>
          </div>
        ) : (
          <Button className="w-full" onClick={promptInstall}>
            <Download className="h-4 w-4 mr-2" />
            Install App
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
