/**
 * Error message utilities
 * Convert technical errors to user-friendly messages with actionable suggestions
 */

/**
 * User-friendly error message with suggestion
 */
export interface UserFriendlyError {
  title: string;
  message: string;
  suggestion?: string;
  technicalDetails?: string;
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown',
}

/**
 * Classify error by examining error object
 */
export function classifyError(error: unknown): ErrorCategory {
  if (!error) return ErrorCategory.UNKNOWN;

  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return ErrorCategory.NETWORK;
  }

  // HTTP errors
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: number }).status;

    if (status === 401) return ErrorCategory.AUTHENTICATION;
    if (status === 403) return ErrorCategory.AUTHORIZATION;
    if (status === 404) return ErrorCategory.NOT_FOUND;
    if (status === 422 || status === 400) return ErrorCategory.VALIDATION;
    if (status === 429) return ErrorCategory.RATE_LIMIT;
    if (status >= 500) return ErrorCategory.SERVER;
    if (status >= 400) return ErrorCategory.CLIENT;
  }

  // Error message patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('connection')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return ErrorCategory.AUTHENTICATION;
    }
    if (message.includes('forbidden') || message.includes('permission')) {
      return ErrorCategory.AUTHORIZATION;
    }
    if (message.includes('not found')) {
      return ErrorCategory.NOT_FOUND;
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorCategory.RATE_LIMIT;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Get user-friendly error message from any error
 *
 * @example
 * ```tsx
 * try {
 *   await saveProject();
 * } catch (error) {
 *   const friendlyError = getUserFriendlyErrorMessage(error);
 *   toast.error(friendlyError.message, friendlyError.title);
 * }
 * ```
 */
export function getUserFriendlyErrorMessage(error: unknown): UserFriendlyError {
  const category = classifyError(error);
  const technicalDetails = error instanceof Error ? error.message : String(error);

  switch (category) {
    case ErrorCategory.NETWORK:
      return {
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection.',
        suggestion: 'Make sure you are connected to the internet and try again.',
        technicalDetails,
      };

    case ErrorCategory.AUTHENTICATION:
      return {
        title: 'Authentication Required',
        message: 'Your session has expired or you are not logged in.',
        suggestion: 'Please log in again to continue.',
        technicalDetails,
      };

    case ErrorCategory.AUTHORIZATION:
      return {
        title: 'Access Denied',
        message: "You don't have permission to perform this action.",
        suggestion: 'Contact your administrator if you believe you should have access.',
        technicalDetails,
      };

    case ErrorCategory.NOT_FOUND:
      return {
        title: 'Not Found',
        message: 'The resource you are looking for could not be found.',
        suggestion: 'It may have been deleted or moved. Please check and try again.',
        technicalDetails,
      };

    case ErrorCategory.VALIDATION:
      return {
        title: 'Invalid Input',
        message: 'Some of the information you provided is invalid.',
        suggestion: 'Please review your input and correct any errors.',
        technicalDetails,
      };

    case ErrorCategory.RATE_LIMIT:
      return {
        title: 'Too Many Requests',
        message: 'You have made too many requests. Please wait before trying again.',
        suggestion: 'Wait a few minutes and try again.',
        technicalDetails,
      };

    case ErrorCategory.SERVER:
      return {
        title: 'Server Error',
        message: 'Something went wrong on our end. This is not your fault.',
        suggestion: 'Please try again later. If the problem persists, contact support.',
        technicalDetails,
      };

    case ErrorCategory.CLIENT:
      return {
        title: 'Request Error',
        message: 'There was a problem with your request.',
        suggestion: 'Please check your input and try again.',
        technicalDetails,
      };

    case ErrorCategory.UNKNOWN:
    default:
      return {
        title: 'Something Went Wrong',
        message: 'An unexpected error occurred.',
        suggestion: 'Please try again. If the problem continues, contact support.',
        technicalDetails,
      };
  }
}

/**
 * Get specific error suggestion based on error type
 */
export function getErrorSuggestion(error: unknown): string {
  const category = classifyError(error);

  const suggestions: Record<ErrorCategory, string> = {
    [ErrorCategory.NETWORK]:
      'Check your internet connection and try again. If using a VPN, try disconnecting.',
    [ErrorCategory.AUTHENTICATION]:
      'Log out and log back in. Clear your browser cache if the problem persists.',
    [ErrorCategory.AUTHORIZATION]:
      'Contact your administrator to request the necessary permissions.',
    [ErrorCategory.NOT_FOUND]:
      'Double-check the URL or resource identifier. It may have been moved or deleted.',
    [ErrorCategory.VALIDATION]:
      'Review all form fields for errors. Make sure required fields are filled and formats are correct.',
    [ErrorCategory.RATE_LIMIT]:
      'Wait a few minutes before trying again. Consider upgrading your plan if you need higher limits.',
    [ErrorCategory.SERVER]:
      'Wait a few minutes and try again. Contact support if the issue continues.',
    [ErrorCategory.CLIENT]:
      'Check that all required information is provided and in the correct format.',
    [ErrorCategory.UNKNOWN]:
      'Try refreshing the page. If the problem persists, contact support with details of what you were doing.',
  };

  return suggestions[category];
}

/**
 * Convert error to user-friendly message string
 * Simpler version for quick use in catch blocks
 *
 * @example
 * ```tsx
 * try {
 *   await deleteProject(id);
 * } catch (error) {
 *   toast.error(errorToMessage(error));
 * }
 * ```
 */
export function errorToMessage(error: unknown): string {
  const friendly = getUserFriendlyErrorMessage(error);
  return friendly.message;
}

/**
 * Format error for display with title
 */
export function errorToDisplay(error: unknown): { title: string; message: string } {
  const friendly = getUserFriendlyErrorMessage(error);
  return {
    title: friendly.title,
    message: friendly.message,
  };
}

/**
 * Check if error is of specific category
 */
export function isNetworkError(error: unknown): boolean {
  return classifyError(error) === ErrorCategory.NETWORK;
}

export function isAuthError(error: unknown): boolean {
  return classifyError(error) === ErrorCategory.AUTHENTICATION;
}

export function isPermissionError(error: unknown): boolean {
  return classifyError(error) === ErrorCategory.AUTHORIZATION;
}

export function isNotFoundError(error: unknown): boolean {
  return classifyError(error) === ErrorCategory.NOT_FOUND;
}

export function isValidationError(error: unknown): boolean {
  return classifyError(error) === ErrorCategory.VALIDATION;
}

export function isRateLimitError(error: unknown): boolean {
  return classifyError(error) === ErrorCategory.RATE_LIMIT;
}

export function isServerError(error: unknown): boolean {
  return classifyError(error) === ErrorCategory.SERVER;
}

/**
 * Common error messages for specific scenarios
 */
export const CommonErrors = {
  // Data operations
  SAVE_FAILED: {
    title: 'Save Failed',
    message: 'Unable to save your changes.',
    suggestion: 'Please try again. Your work may not be saved.',
  },
  LOAD_FAILED: {
    title: 'Load Failed',
    message: 'Unable to load the requested data.',
    suggestion: 'Please refresh the page and try again.',
  },
  DELETE_FAILED: {
    title: 'Delete Failed',
    message: 'Unable to delete the item.',
    suggestion: 'Please try again later.',
  },
  UPDATE_FAILED: {
    title: 'Update Failed',
    message: 'Unable to update the item.',
    suggestion: 'Please check your changes and try again.',
  },

  // File operations
  UPLOAD_FAILED: {
    title: 'Upload Failed',
    message: 'Unable to upload the file.',
    suggestion: 'Check your file size and format, then try again.',
  },
  DOWNLOAD_FAILED: {
    title: 'Download Failed',
    message: 'Unable to download the file.',
    suggestion: 'Please try again later.',
  },
  FILE_TOO_LARGE: {
    title: 'File Too Large',
    message: 'The file you selected is too large.',
    suggestion: 'Please select a smaller file or compress it before uploading.',
  },
  INVALID_FILE_TYPE: {
    title: 'Invalid File Type',
    message: 'This file type is not supported.',
    suggestion: 'Please select a different file in a supported format.',
  },

  // Form validation
  REQUIRED_FIELDS: {
    title: 'Required Fields Missing',
    message: 'Please fill in all required fields.',
    suggestion: 'Fields marked with an asterisk (*) are required.',
  },
  INVALID_EMAIL: {
    title: 'Invalid Email',
    message: 'Please enter a valid email address.',
    suggestion: 'Check that your email is in the format: name@example.com',
  },
  PASSWORD_TOO_WEAK: {
    title: 'Weak Password',
    message: 'Your password is not strong enough.',
    suggestion: 'Use at least 8 characters with a mix of letters, numbers, and symbols.',
  },
  PASSWORDS_DONT_MATCH: {
    title: 'Passwords Do Not Match',
    message: 'The passwords you entered do not match.',
    suggestion: 'Please make sure both password fields are identical.',
  },

  // Account operations
  LOGIN_FAILED: {
    title: 'Login Failed',
    message: 'Unable to log you in.',
    suggestion: 'Check your email and password, then try again.',
  },
  SIGNUP_FAILED: {
    title: 'Sign Up Failed',
    message: 'Unable to create your account.',
    suggestion: 'Please try again or contact support if the problem continues.',
  },
  LOGOUT_FAILED: {
    title: 'Logout Failed',
    message: 'Unable to log you out.',
    suggestion: 'Please try again or close your browser.',
  },

  // Generic operations
  OPERATION_FAILED: {
    title: 'Operation Failed',
    message: 'Unable to complete the operation.',
    suggestion: 'Please try again later.',
  },
  TIMEOUT: {
    title: 'Request Timeout',
    message: 'The request took too long to complete.',
    suggestion: 'Please check your connection and try again.',
  },
  OFFLINE: {
    title: 'You Are Offline',
    message: 'No internet connection detected.',
    suggestion: 'Please check your network connection and try again.',
  },
} as const;

/**
 * Extract validation errors from API response
 * Assumes API returns errors in format: { field: "error message" }
 */
export function extractValidationErrors(error: unknown): Record<string, string> | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'errors' in error &&
    typeof (error as any).errors === 'object'
  ) {
    return (error as any).errors;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof (error as any).data === 'object' &&
    'errors' in (error as any).data
  ) {
    return (error as any).data.errors;
  }

  return null;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: Record<string, string>): string {
  return Object.entries(errors)
    .map(([field, message]) => `${field}: ${message}`)
    .join(', ');
}
