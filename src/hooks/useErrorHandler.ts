/**
 * Custom hook for consistent error handling in React components.
 * 
 * Provides a unified interface for handling errors with automatic
 * logging, monitoring, and user feedback via toast notifications.
 * 
 * @module hooks/useErrorHandler
 */

import { useCallback, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { 
  AppError, 
  handleError, 
  isOperationalError, 
  isRetryableError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  NetworkError,
} from '@/lib/errors';

/**
 * Options for error handling behavior.
 */
export interface ErrorHandlerOptions {
  /** Whether to show a toast notification (default: true) */
  showToast?: boolean;
  /** Custom toast title (default: derived from error type) */
  toastTitle?: string;
  /** Custom toast description (default: error message) */
  toastDescription?: string;
  /** Whether to log the error (default: true) */
  log?: boolean;
  /** Additional context for logging */
  context?: Record<string, unknown>;
  /** Callback after error is handled */
  onError?: (error: AppError) => void;
  /** Whether to rethrow the error after handling (default: false) */
  rethrow?: boolean;
}

/**
 * Return type for the useErrorHandler hook.
 */
export interface UseErrorHandlerReturn {
  /** Handle an error with options */
  handleError: (error: unknown, options?: ErrorHandlerOptions) => AppError;
  /** The last error that was handled */
  lastError: AppError | null;
  /** Clear the last error */
  clearError: () => void;
  /** Whether there's an active error */
  hasError: boolean;
  /** Wrap an async function with error handling */
  withErrorHandling: <T>(
    fn: () => Promise<T>,
    options?: ErrorHandlerOptions
  ) => Promise<T | undefined>;
  /** Check if the last error is retryable */
  isRetryable: boolean;
}

/**
 * Custom hook for consistent error handling across React components.
 * 
 * @param defaultOptions - Default options for all error handling calls
 * @returns Error handling utilities
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { handleError, withErrorHandling, hasError, lastError } = useErrorHandler({
 *     context: { component: 'MyComponent' },
 *   });
 * 
 *   const fetchData = async () => {
 *     await withErrorHandling(
 *       async () => {
 *         const data = await api.getData();
 *         setData(data);
 *       },
 *       { toastTitle: 'Failed to load data' }
 *     );
 *   };
 * 
 *   const handleSubmit = async (formData: FormData) => {
 *     try {
 *       await api.submit(formData);
 *     } catch (error) {
 *       handleError(error, {
 *         toastTitle: 'Submission failed',
 *         onError: (err) => {
 *           if (err.code === 'VALIDATION_ERROR') {
 *             setFieldErrors(err.context?.fields);
 *           }
 *         },
 *       });
 *     }
 *   };
 * 
 *   if (hasError && lastError) {
 *     return <ErrorDisplay error={lastError} />;
 *   }
 * 
 *   return <div>...</div>;
 * }
 * ```
 */
export function useErrorHandler(
  defaultOptions: ErrorHandlerOptions = {}
): UseErrorHandlerReturn {
  const [lastError, setLastError] = useState<AppError | null>(null);

  /**
   * Get a user-friendly title based on error type.
   */
  const getErrorTitle = useCallback((error: AppError): string => {
    if (error instanceof ValidationError) {
      return 'Validation Error';
    }
    if (error instanceof AuthenticationError) {
      return 'Authentication Required';
    }
    if (error instanceof AuthorizationError) {
      return 'Access Denied';
    }
    if (error instanceof NotFoundError) {
      return 'Not Found';
    }
    if (error instanceof RateLimitError) {
      return 'Rate Limit Exceeded';
    }
    if (error instanceof NetworkError) {
      return 'Connection Error';
    }
    
    // Default titles based on error code
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return 'Invalid Input';
      case 'AUTHENTICATION_ERROR':
        return 'Please Sign In';
      case 'AUTHORIZATION_ERROR':
        return 'Permission Denied';
      case 'NOT_FOUND':
        return 'Not Found';
      case 'RATE_LIMIT_ERROR':
        return 'Too Many Requests';
      case 'NETWORK_ERROR':
        return 'Network Error';
      case 'TIMEOUT_ERROR':
        return 'Request Timeout';
      case 'AI_SERVICE_ERROR':
        return 'AI Service Error';
      case 'DATABASE_ERROR':
        return 'Database Error';
      default:
        return 'Something Went Wrong';
    }
  }, []);

  /**
   * Get toast variant based on error type.
   */
  const getToastVariant = useCallback((error: AppError): 'default' | 'destructive' => {
    // Non-critical errors use default variant
    if (error.code === 'VALIDATION_ERROR' || error.code === 'NOT_FOUND') {
      return 'default';
    }
    return 'destructive';
  }, []);

  /**
   * Main error handling function.
   */
  const handleErrorFn = useCallback(
    (error: unknown, options: ErrorHandlerOptions = {}): AppError => {
      const mergedOptions = { ...defaultOptions, ...options };
      const {
        showToast = true,
        toastTitle,
        toastDescription,
        log = true,
        context,
        onError,
        rethrow = false,
      } = mergedOptions;

      // Convert to AppError
      const appError = handleError(error);
      setLastError(appError);

      // Log the error
      if (log) {
        logger.error(appError.message, appError, {
          errorCode: appError.code,
          isOperational: appError.isOperational,
          ...context,
        });
      }

      // Show toast notification
      if (showToast) {
        toast({
          variant: getToastVariant(appError),
          title: toastTitle || getErrorTitle(appError),
          description: toastDescription || appError.message,
        });
      }

      // Call custom error handler
      onError?.(appError);

      // Rethrow if requested
      if (rethrow) {
        throw appError;
      }

      return appError;
    },
    [defaultOptions, getErrorTitle, getToastVariant]
  );

  /**
   * Clear the last error.
   */
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  /**
   * Wrap an async function with error handling.
   */
  const withErrorHandling = useCallback(
    async <T>(
      fn: () => Promise<T>,
      options: ErrorHandlerOptions = {}
    ): Promise<T | undefined> => {
      try {
        return await fn();
      } catch (error) {
        handleErrorFn(error, options);
        return undefined;
      }
    },
    [handleErrorFn]
  );

  return {
    handleError: handleErrorFn,
    lastError,
    clearError,
    hasError: lastError !== null,
    withErrorHandling,
    isRetryable: lastError ? isRetryableError(lastError) : false,
  };
}

/**
 * Type guard hook variant that returns typed errors.
 */
export function useTypedErrorHandler<E extends AppError>(
  errorClass: new (...args: unknown[]) => E,
  defaultOptions: ErrorHandlerOptions = {}
) {
  const baseHandler = useErrorHandler(defaultOptions);
  
  const typedError = baseHandler.lastError instanceof errorClass
    ? baseHandler.lastError as E
    : null;
  
  return {
    ...baseHandler,
    typedError,
    isExpectedError: typedError !== null,
  };
}

/**
 * Simple error handler for one-off error handling without hooks.
 * 
 * @param error - The error to handle
 * @param options - Error handling options
 * @returns The AppError
 * 
 * @example
 * ```typescript
 * try {
 *   await api.call();
 * } catch (error) {
 *   handleErrorWithToast(error, { toastTitle: 'API call failed' });
 * }
 * ```
 */
export function handleErrorWithToast(
  error: unknown,
  options: ErrorHandlerOptions = {}
): AppError {
  const {
    showToast = true,
    toastTitle = 'Error',
    toastDescription,
    log = true,
    context,
  } = options;

  const appError = handleError(error);

  if (log) {
    logger.error(appError.message, appError, context);
  }

  if (showToast) {
    toast({
      variant: 'destructive',
      title: toastTitle,
      description: toastDescription || appError.message,
    });
  }

  return appError;
}

export default useErrorHandler;
