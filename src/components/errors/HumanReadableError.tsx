import { AlertTriangle, RefreshCw, ArrowRight, Settings, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Map of technical errors to human-readable messages
const ERROR_MESSAGES: Record<string, {
  title: string;
  description: string;
  action: 'retry' | 'settings' | 'contact' | 'wait' | 'none';
  actionLabel?: string;
}> = {
  'Failed to fetch': {
    title: 'Connection Error',
    description: 'Unable to reach the server. Please check your internet connection and try again.',
    action: 'retry',
    actionLabel: 'Retry',
  },
  'Network Error': {
    title: 'Network Unavailable',
    description: 'Network connection lost. Your work is saved, and you can retry once connected.',
    action: 'retry',
    actionLabel: 'Retry',
  },
  'timeout': {
    title: 'Operation Timed Out',
    description: 'The operation took too long to complete. This may happen with large files. Please try again.',
    action: 'retry',
    actionLabel: 'Retry',
  },
  '500': {
    title: 'Server Error',
    description: 'The service is temporarily experiencing issues. Your data is safe. Please try again in a few minutes.',
    action: 'wait',
  },
  '503': {
    title: 'Service Unavailable',
    description: 'The AI service is temporarily overloaded. Your budget is safe. Please wait a moment and try again.',
    action: 'wait',
  },
  '429': {
    title: 'Too Many Requests',
    description: 'You\'ve made too many requests. Please wait a moment before trying again.',
    action: 'wait',
  },
  'quota': {
    title: 'Quota Exceeded',
    description: 'You have exceeded your processing quota for this period. Upgrade your plan or wait for the next billing cycle.',
    action: 'settings',
    actionLabel: 'View Plans',
  },
  'budget': {
    title: 'Budget Limit Reached',
    description: 'This operation would exceed your monthly budget. Increase your budget or enable auto-downgrade to proceed.',
    action: 'settings',
    actionLabel: 'Adjust Budget',
  },
  'Processing quota exceeded': {
    title: 'Processing Limit Reached',
    description: 'You\'ve reached your document processing limit for this month. Upgrade for more capacity.',
    action: 'settings',
    actionLabel: 'Upgrade',
  },
  'Executor timed out': {
    title: 'Processing Step Timed Out',
    description: 'One of the processing steps took too long. You can resume from where it stopped.',
    action: 'retry',
    actionLabel: 'Resume Processing',
  },
};

interface HumanReadableErrorProps {
  error: string;
  onRetry?: () => void;
  onSettings?: () => void;
  onContact?: () => void;
  className?: string;
  variant?: 'default' | 'destructive';
}

export function HumanReadableError({
  error,
  onRetry,
  onSettings,
  onContact,
  className,
  variant = 'destructive',
}: HumanReadableErrorProps) {
  // Find matching error message
  let matchedError: typeof ERROR_MESSAGES[string] | null = null;
  
  for (const [pattern, errorInfo] of Object.entries(ERROR_MESSAGES)) {
    if (error.toLowerCase().includes(pattern.toLowerCase())) {
      matchedError = errorInfo;
      break;
    }
  }
  
  // Default fallback
  if (!matchedError) {
    matchedError = {
      title: 'Something Went Wrong',
      description: `An unexpected error occurred: ${error}. Your data is safe.`,
      action: 'retry',
      actionLabel: 'Try Again',
    };
  }
  
  const handleAction = () => {
    switch (matchedError!.action) {
      case 'retry':
        onRetry?.();
        break;
      case 'settings':
        onSettings?.();
        break;
      case 'contact':
        onContact?.();
        break;
    }
  };
  
  const getActionButton = () => {
    switch (matchedError!.action) {
      case 'retry':
        return (
          <Button variant="outline" size="sm" onClick={handleAction} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {matchedError!.actionLabel || 'Retry'}
          </Button>
        );
      case 'settings':
        return (
          <Button variant="outline" size="sm" onClick={handleAction} className="gap-2">
            <Settings className="h-4 w-4" />
            {matchedError!.actionLabel || 'Open Settings'}
          </Button>
        );
      case 'contact':
        return (
          <Button variant="outline" size="sm" onClick={handleAction} className="gap-2">
            <HelpCircle className="h-4 w-4" />
            {matchedError!.actionLabel || 'Get Help'}
          </Button>
        );
      case 'wait':
        return (
          <p className="text-xs text-muted-foreground mt-2">
            Please wait a moment and try again.
          </p>
        );
      default:
        return null;
    }
  };
  
  return (
    <Alert variant={variant} className={cn('', className)}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{matchedError.title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>{matchedError.description}</p>
        {getActionButton()}
      </AlertDescription>
    </Alert>
  );
}

// Helper function to translate error for toasts
export function getHumanReadableError(error: string): { title: string; description: string } {
  for (const [pattern, errorInfo] of Object.entries(ERROR_MESSAGES)) {
    if (error.toLowerCase().includes(pattern.toLowerCase())) {
      return { title: errorInfo.title, description: errorInfo.description };
    }
  }
  
  return {
    title: 'Something Went Wrong',
    description: `An unexpected error occurred. Your data is safe.`,
  };
}
