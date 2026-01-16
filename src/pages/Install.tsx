import { InstallBanner } from '@/components/mobile/InstallPrompt';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Smartphone, 
  Zap, 
  WifiOff, 
  Bell, 
  Camera, 
  Mic,
  Shield,
  Download
} from 'lucide-react';

export default function Install() {
  const features = [
    {
      icon: Zap,
      title: 'Instant Launch',
      description: 'Open FineFlow directly from your home screen, just like a native app.'
    },
    {
      icon: WifiOff,
      title: 'Offline Access',
      description: 'View your documents and chat history even without an internet connection.'
    },
    {
      icon: Bell,
      title: 'Push Notifications',
      description: 'Get notified when documents are processed or research tasks complete.'
    },
    {
      icon: Camera,
      title: 'Document Scanner',
      description: 'Scan physical documents with your camera for instant processing.'
    },
    {
      icon: Mic,
      title: 'Voice Commands',
      description: 'Use voice to chat with your documents and listen to summaries.'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data stays on your device with end-to-end encryption.'
    }
  ];

  return (
    <div className="container max-w-2xl py-8 px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
          <Smartphone className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Install FineFlow</h1>
        <p className="text-muted-foreground">
          Get the full mobile experience with our progressive web app
        </p>
      </div>

      <div className="space-y-6">
        <InstallBanner />

        <Card>
          <CardHeader>
            <CardTitle>Why Install?</CardTitle>
            <CardDescription>
              Installing FineFlow gives you access to powerful mobile features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map((feature) => (
                <div key={feature.title} className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supported Browsers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="font-medium">Chrome</p>
                <p className="text-xs text-muted-foreground">Android & Desktop</p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="font-medium">Safari</p>
                <p className="text-xs text-muted-foreground">iOS & macOS</p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="font-medium">Edge</p>
                <p className="text-xs text-muted-foreground">Windows</p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="font-medium">Firefox</p>
                <p className="text-xs text-muted-foreground">Desktop</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
