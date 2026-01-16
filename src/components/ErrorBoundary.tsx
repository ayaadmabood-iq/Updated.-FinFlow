import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { captureException } from '@/lib/monitoring';
import { AppError, handleError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * Props for the ErrorBoundary component.
 */
interface Props {
  /** Child components to render */
  children: ReactNode;
  /** Custom fallback UI to render on error */
  fallback?: ReactNode;
  /** Custom fallback render function with error details and reset callback */
  fallbackRender?: (props: { error: AppError; reset: () => void }) => ReactNode;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show the error message in the UI */
  showErrorMessage?: boolean;
  /** Custom error title */
  errorTitle?: string;
  /** Custom error description */
  errorDescription?: string;
}

/**
 * State for the ErrorBoundary component.
 */
interface State {
  hasError: boolean;
  error: AppError | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component that catches JavaScript errors anywhere in the child
 * component tree, logs them to monitoring services, and displays a fallback UI.
 * 
 * This component provides:
 * - Automatic error catching and logging
 * - Sentry integration for production error tracking
 * - Customizable fallback UI
 * - Error recovery with retry/reset functionality
 * - Structured error context for debugging
 * 
 * @component
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * 
 * // With custom fallback
 * <ErrorBoundary
 *   fallbackRender={({ error, reset }) => (
 *     <div>
 *       <p>Error: {error.message}</p>
 *       <button onClick={reset}>Try Again</button>
 *     </div>
 *   )}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * 
 * // With error callback
 * <ErrorBoundary
 *   onError={(error, info) => {
 *     analytics.track('error', { error: error.message });
 *   }}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Convert to AppError for consistent handling
    const appError = handleError(error);
    return { 
      hasError: true, 
      error: appError,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const appError = handleError(error);
    
    // Update state with error info
    this.setState({ errorInfo });
    
    // Log error with structured context
    logger.error('ErrorBoundary caught an error', error, {
      component: 'ErrorBoundary',
      errorCode: appError.code,
      isOperational: appError.isOperational,
      componentStack: errorInfo.componentStack?.substring(0, 500),
    });

    // Send to monitoring service (Sentry)
    captureException(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      errorCode: appError.code,
      isOperational: appError.isOperational,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  /**
   * Resets the error state, allowing the component to try rendering again.
   */
  handleReset = () => {
    logger.info('ErrorBoundary reset triggered', {
      component: 'ErrorBoundary',
      previousError: this.state.error?.code,
    });
    
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Reloads the entire page.
   */
  handleReload = () => {
    logger.info('Page reload triggered from ErrorBoundary', {
      component: 'ErrorBoundary',
    });
    window.location.reload();
  };

  /**
   * Navigates to the home page.
   */
  handleGoHome = () => {
    logger.info('Navigate to home triggered from ErrorBoundary', {
      component: 'ErrorBoundary',
    });
    window.location.href = '/';
  };

  /**
   * Copies error details to clipboard for bug reporting.
   */
  handleCopyError = async () => {
    if (!this.state.error) return;
    
    const errorDetails = {
      message: this.state.error.message,
      code: this.state.error.code,
      timestamp: this.state.error.timestamp,
      stack: this.state.error.stack,
      componentStack: this.state.errorInfo?.componentStack,
    };
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
      logger.info('Error details copied to clipboard', { component: 'ErrorBoundary' });
    } catch {
      logger.warn('Failed to copy error details to clipboard', { component: 'ErrorBoundary' });
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Use fallback render function if provided
      if (this.props.fallbackRender) {
        return this.props.fallbackRender({
          error: this.state.error,
          reset: this.handleReset,
        });
      }

      const {
        showErrorMessage = true,
        errorTitle = 'Something went wrong',
        errorDescription = "We're sorry, but something unexpected happened. Our team has been notified.",
      } = this.props;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Error Icon */}
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-destructive/10">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            
            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                {errorTitle}
              </h1>
              <p className="text-muted-foreground">
                {errorDescription}
              </p>
            </div>

            {/* Error Details */}
            {showErrorMessage && this.state.error && (
              <div className="p-4 bg-muted rounded-lg text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    Error Code: {this.state.error.code}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={this.handleCopyError}
                    className="h-6 px-2 text-xs"
                  >
                    <Bug className="h-3 w-3 mr-1" />
                    Copy Details
                  </Button>
                </div>
                <p className="text-sm font-mono text-muted-foreground break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                variant="outline" 
                onClick={this.handleReset}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button 
                variant="outline"
                onClick={this.handleGoHome}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
              <Button 
                onClick={this.handleReload}
                className="gap-2"
              >
                Reload Page
              </Button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-muted-foreground">
              If this problem persists, please contact support with error code: {' '}
              <code className="bg-muted px-1 py-0.5 rounded">
                {this.state.error?.code || 'UNKNOWN'}
              </code>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap a component with an ErrorBoundary.
 * 
 * @param Component - The component to wrap
 * @param errorBoundaryProps - Props to pass to the ErrorBoundary
 * @returns Wrapped component with error boundary
 * 
 * @example
 * ```tsx
 * const SafeComponent = withErrorBoundary(MyComponent, {
 *   errorTitle: 'Widget Error',
 *   onError: (error) => console.error(error),
 * });
 * ```
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  
  return WrappedComponent;
}
