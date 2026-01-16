import React from 'react';
import { AlertCircle, RefreshCw, Home, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Full error state component with retry functionality
 * Use for page-level or section-level errors
 *
 * @example
 * ```tsx
 * <ErrorState
 *   title="Failed to load data"
 *   message="We couldn't load your projects"
 *   onRetry={() => refetch()}
 * />
 * ```
 */
export interface ErrorStateProps {
  title?: string;
  message: string;
  error?: Error;
  onRetry?: () => void;
  onGoHome?: () => void;
  showDetails?: boolean;
  variant?: 'default' | 'warning' | 'critical';
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  error,
  onRetry,
  onGoHome,
  showDetails = import.meta.env.DEV, // Show details only in development
  variant = 'default',
  className,
}: ErrorStateProps) {
  const [showErrorDetails, setShowErrorDetails] = React.useState(false);

  const icons = {
    default: <AlertCircle className="h-16 w-16" />,
    warning: <AlertTriangle className="h-16 w-16" />,
    critical: <XCircle className="h-16 w-16" />,
  };

  const colors = {
    default: 'text-destructive',
    warning: 'text-warning',
    critical: 'text-red-600',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center min-h-[400px]',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className={cn('mb-4', colors[variant])} aria-hidden="true">
        {icons[variant]}
      </div>

      <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>

      <p className="text-muted-foreground mb-6 max-w-md">{message}</p>

      <div className="flex flex-wrap gap-3 justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'transition-colors',
              'min-h-touch-target' // Touch-friendly
            )}
            aria-label="Retry the operation"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try Again
          </button>
        )}

        {onGoHome && (
          <button
            onClick={onGoHome}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'border border-input bg-background',
              'hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'transition-colors',
              'min-h-touch-target' // Touch-friendly
            )}
            aria-label="Go to home page"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Go Home
          </button>
        )}
      </div>

      {showDetails && error && (
        <div className="mt-6 w-full max-w-2xl">
          <button
            onClick={() => setShowErrorDetails(!showErrorDetails)}
            className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
            aria-expanded={showErrorDetails}
          >
            {showErrorDetails ? 'Hide' : 'Show'} technical details
          </button>

          {showErrorDetails && (
            <div className="mt-3 p-4 bg-muted rounded-lg text-left">
              <p className="text-xs font-mono text-destructive mb-2">
                {error.name}: {error.message}
              </p>
              {error.stack && (
                <pre className="text-xs font-mono text-muted-foreground overflow-auto max-h-48">
                  {error.stack}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Inline error message for forms and small sections
 *
 * @example
 * ```tsx
 * {error && <InlineError message={error.message} />}
 * ```
 */
export interface InlineErrorProps {
  message: string;
  className?: string;
}

export function InlineError({ message, className }: InlineErrorProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30',
        'rounded-lg text-destructive',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-sm flex-1">{message}</p>
    </div>
  );
}

/**
 * Form field error message
 * Designed to work with form inputs
 *
 * @example
 * ```tsx
 * <input {...} />
 * {errors.email && <FieldError message={errors.email} />}
 * ```
 */
export interface FieldErrorProps {
  message: string;
  className?: string;
}

export function FieldError({ message, className }: FieldErrorProps) {
  return (
    <p
      className={cn('mt-1.5 text-sm text-destructive flex items-center gap-1.5', className)}
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

/**
 * Error banner for top-of-page notifications
 * Use for system-wide errors or important warnings
 *
 * @example
 * ```tsx
 * <ErrorBanner
 *   message="System maintenance scheduled"
 *   onDismiss={() => setShowBanner(false)}
 * />
 * ```
 */
export interface ErrorBannerProps {
  message: string;
  variant?: 'error' | 'warning';
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function ErrorBanner({ message, variant = 'error', onDismiss, action }: ErrorBannerProps) {
  const styles = {
    error: {
      bg: 'bg-destructive',
      text: 'text-destructive-foreground',
      icon: <XCircle className="h-5 w-5" />,
    },
    warning: {
      bg: 'bg-warning',
      text: 'text-warning-foreground',
      icon: <AlertTriangle className="h-5 w-5" />,
    },
  };

  const style = styles[variant];

  return (
    <div
      className={cn('w-full p-4', style.bg, style.text)}
      role="alert"
      aria-live="assertive"
    >
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0" aria-hidden="true">
            {style.icon}
          </div>
          <p className="text-sm font-medium flex-1">{message}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {action && (
            <button
              onClick={action.onClick}
              className="text-sm font-medium underline hover:no-underline transition-all min-h-touch-target px-2"
            >
              {action.label}
            </button>
          )}

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 rounded hover:bg-white/10 transition-colors min-h-touch-target min-w-touch-target flex items-center justify-center"
              aria-label="Dismiss notification"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Error boundary fallback component
 * Use as fallback UI for React Error Boundaries
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full">
        <ErrorState
          title="Application Error"
          message="The application encountered an unexpected error. Please try refreshing the page."
          error={error}
          onRetry={resetError || (() => window.location.reload())}
          showDetails={import.meta.env.DEV}
        />
      </div>
    </div>
  );
}

/**
 * Network error component
 * Specialized error for network issues
 */
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      variant="warning"
      title="Connection Lost"
      message="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
    />
  );
}

/**
 * 404 Not Found error
 * Specialized error for missing resources
 */
export function NotFoundError({ onGoHome }: { onGoHome?: () => void }) {
  return (
    <ErrorState
      title="Page Not Found"
      message="The page you're looking for doesn't exist or has been moved."
      onGoHome={onGoHome || (() => window.location.href = '/')}
    />
  );
}

/**
 * Permission denied error
 * Specialized error for authorization failures
 */
export function PermissionDeniedError({ onGoHome }: { onGoHome?: () => void }) {
  return (
    <ErrorState
      variant="warning"
      title="Access Denied"
      message="You don't have permission to view this page. Please contact your administrator if you believe this is a mistake."
      onGoHome={onGoHome}
    />
  );
}
