// ============= Error State Components =============
// User-friendly error handling with accessibility support

import React from 'react';
import { AccessibleButton } from '../accessible/AccessibleButton';

export interface ErrorStateProps {
  title?: string;
  message: string;
  error?: Error;
  onRetry?: () => void;
  onGoHome?: () => void;
  showDetails?: boolean;
}

/**
 * Full page error state component
 *
 * Displays user-friendly error messages with retry functionality.
 *
 * @example
 * ```tsx
 * {error && (
 *   <ErrorState
 *     title="Failed to load data"
 *     message="We couldn't load your documents. Please try again."
 *     onRetry={() => refetch()}
 *     error={error}
 *     showDetails={process.env.NODE_ENV === 'development'}
 *   />
 * )}
 * ```
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  error,
  onRetry,
  onGoHome,
  showDetails = false,
}: ErrorStateProps) {
  const [showErrorDetails, setShowErrorDetails] = React.useState(false);

  return (
    <div
      className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]"
      role="alert"
      aria-live="assertive"
    >
      {/* Error Icon */}
      <svg
        className="h-16 w-16 text-red-500 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>

      <p className="text-gray-600 mb-6 max-w-md">{message}</p>

      <div className="flex gap-3 flex-wrap justify-center">
        {onRetry && (
          <AccessibleButton onClick={onRetry} variant="primary" aria-label="Retry the operation">
            <svg
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try Again
          </AccessibleButton>
        )}

        {onGoHome && (
          <AccessibleButton onClick={onGoHome} variant="secondary" aria-label="Go to home page">
            <svg
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Go Home
          </AccessibleButton>
        )}
      </div>

      {showDetails && error && (
        <div className="mt-6 w-full max-w-2xl">
          <button
            onClick={() => setShowErrorDetails(!showErrorDetails)}
            className="text-sm text-gray-500 hover:text-gray-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            {showErrorDetails ? 'Hide' : 'Show'} technical details
          </button>

          {showErrorDetails && (
            <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-left text-xs overflow-auto max-h-60">
              {error.stack || error.message}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Inline error message
 *
 * @example
 * ```tsx
 * {error && <InlineError message="Failed to save changes" />}
 * ```
 */
export function InlineError({ message }: { message: string }) {
  return (
    <div
      className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800"
      role="alert"
      aria-live="polite"
    >
      <svg
        className="h-5 w-5 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

/**
 * Form field error
 *
 * @example
 * ```tsx
 * <input {...register('email')} />
 * {errors.email && <FieldError message={errors.email.message} />}
 * ```
 */
export function FieldError({ message }: { message: string }) {
  return (
    <p className="mt-1 text-sm text-red-600 flex items-center gap-1" role="alert" aria-live="polite">
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {message}
    </p>
  );
}

/**
 * Error boundary fallback component
 *
 * @example
 * ```tsx
 * <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export function ErrorBoundaryFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <ErrorState
        title="Application Error"
        message="The application encountered an unexpected error. Please try refreshing the page."
        error={error}
        onRetry={resetErrorBoundary}
        showDetails={process.env.NODE_ENV === 'development'}
      />
    </div>
  );
}

/**
 * 404 Not Found error state
 *
 * @example
 * ```tsx
 * <NotFoundError onGoHome={() => navigate('/')} />
 * ```
 */
export function NotFoundError({ onGoHome }: { onGoHome?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
      <svg
        className="h-24 w-24 text-gray-400 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
      <p className="text-gray-600 mb-6 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>

      {onGoHome && (
        <AccessibleButton onClick={onGoHome} variant="primary" aria-label="Return to home page">
          <svg
            className="h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          Go Home
        </AccessibleButton>
      )}
    </div>
  );
}

/**
 * Network error state
 */
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
    />
  );
}

/**
 * Permission denied error state
 */
export function PermissionDeniedError({ onGoHome }: { onGoHome?: () => void }) {
  return (
    <ErrorState
      title="Access Denied"
      message="You don't have permission to access this resource. Please contact your administrator if you believe this is an error."
      onGoHome={onGoHome}
    />
  );
}
