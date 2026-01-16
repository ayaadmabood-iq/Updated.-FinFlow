// Advanced Feature Gate Component
// Redirects users to dashboard if advanced mode is not enabled
import { Navigate, useLocation } from 'react-router-dom';
import { useFeatureFlags } from '@/hooks/useOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlaskConical, ArrowLeft } from 'lucide-react';

interface AdvancedFeatureGateProps {
  children: React.ReactNode;
}

export function AdvancedFeatureGate({ children }: AdvancedFeatureGateProps) {
  const { showAdvanced, toggleAdvanced } = useFeatureFlags();
  const location = useLocation();

  if (showAdvanced) {
    return <>{children}</>;
  }

  // Show a gate screen instead of redirecting
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <FlaskConical className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Advanced Feature</CardTitle>
          <CardDescription>
            This feature is part of the Advanced toolset. Enable Advanced Mode to access training, datasets, models, and other power-user features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={toggleAdvanced} className="w-full">
            Enable Advanced Mode
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <a href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
