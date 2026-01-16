/**
 * Custom Error Classes for FineFlow Application
 * 
 * Provides a consistent error handling pattern with typed errors,
 * error codes, and structured context for debugging.
 * 
 * @module lib/errors
 */

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

/**
 * Base error class for all FineFlow application errors.
 * Extends the native Error with additional metadata for better debugging.
 * 
 * @class AppError
 * @extends Error
 * 
 * @example
 * ```typescript
 * throw new AppError('Something went wrong', 'CUSTOM_ERROR', 500, true, { userId: '123' });
 * ```
 */
export class AppError extends Error {
  /** Unique error code for programmatic handling */
  public readonly code: string;
  /** HTTP status code for API responses */
  public readonly statusCode: number;
  /** Whether this is an expected operational error vs a programming error */
  public readonly isOperational: boolean;
  /** Additional context for debugging */
  public readonly context?: Record<string, unknown>;
  /** ISO 8601 timestamp when the error occurred */
  public readonly timestamp: string;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serializes the error to a JSON-safe object for logging/transmission.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

// ============================================================================
// SPECIFIC ERROR CLASSES
// ============================================================================

/**
 * Thrown when input validation fails.
 * 
 * @class ValidationError
 * @extends AppError
 * 
 * @example
 * ```typescript
 * throw new ValidationError('Email is required', { field: 'email' });
 * ```
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, true, context);
  }
}

/**
 * Thrown when authentication is required but not provided or invalid.
 * 
 * @class AuthenticationError
 * @extends AppError
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', 401, true, context);
  }
}

/**
 * Thrown when the user doesn't have permission to perform an action.
 * 
 * @class AuthorizationError
 * @extends AppError
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', 403, true, context);
  }
}

/**
 * Thrown when a requested resource doesn't exist.
 * 
 * @class NotFoundError
 * @extends AppError
 * 
 * @example
 * ```typescript
 * throw new NotFoundError('Project', '123-abc');
 * // Message: "Project with id '123-abc' not found"
 * ```
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    
    super(message, 'NOT_FOUND', 404, true, { resource, id });
  }
}

/**
 * Thrown when there's a conflict with existing data.
 * 
 * @class ConflictError
 * @extends AppError
 */
export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFLICT_ERROR', 409, true, context);
  }
}

/**
 * Thrown when rate limits are exceeded.
 * 
 * @class RateLimitError
 * @extends AppError
 */
export class RateLimitError extends AppError {
  constructor(
    limit: number,
    resetAt: string,
    context?: Record<string, unknown>
  ) {
    super(
      `Rate limit exceeded. Try again after ${resetAt}`,
      'RATE_LIMIT_ERROR',
      429,
      true,
      { limit, resetAt, ...context }
    );
  }
}

/**
 * Thrown when there's a database operation error.
 * 
 * @class DatabaseError
 * @extends AppError
 */
export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', 500, true, context);
  }
}

/**
 * Thrown when an external service fails.
 * 
 * @class ExternalServiceError
 * @extends AppError
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(
      `External service error (${service}): ${message}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      true,
      { service, ...context }
    );
  }
}

/**
 * Thrown when AI service operations fail.
 * 
 * @class AIServiceError
 * @extends AppError
 */
export class AIServiceError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AI_SERVICE_ERROR', 500, true, context);
  }
}

/**
 * Thrown when prompt injection is detected.
 * 
 * @class PromptInjectionError
 * @extends AppError
 */
export class PromptInjectionError extends AppError {
  constructor(threats: string[], context?: Record<string, unknown>) {
    super(
      'Potential prompt injection detected',
      'PROMPT_INJECTION_ERROR',
      400,
      true,
      { threats, ...context }
    );
  }
}

/**
 * Thrown when a network request fails.
 * 
 * @class NetworkError
 * @extends AppError
 */
export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed', context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', 0, true, context);
  }
}

/**
 * Thrown when an operation times out.
 * 
 * @class TimeoutError
 * @extends AppError
 */
export class TimeoutError extends AppError {
  constructor(operation: string, timeoutMs: number, context?: Record<string, unknown>) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      'TIMEOUT_ERROR',
      408,
      true,
      { operation, timeoutMs, ...context }
    );
  }
}

/**
 * Thrown when quota limits are exceeded.
 * 
 * @class QuotaExceededError
 * @extends AppError
 */
export class QuotaExceededError extends AppError {
  constructor(
    quotaType: 'documents' | 'storage' | 'processing' | 'api_calls',
    current: number,
    limit: number,
    context?: Record<string, unknown>
  ) {
    super(
      `${quotaType} quota exceeded (${current}/${limit})`,
      'QUOTA_EXCEEDED_ERROR',
      429,
      true,
      { quotaType, current, limit, ...context }
    );
  }
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

/**
 * Converts any error type to an AppError for consistent handling.
 * 
 * @param error - Any error object
 * @returns AppError instance
 * 
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const appError = handleError(error);
 *   logger.error(appError.message, appError);
 * }
 * ```
 */
export function handleError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }
  
  // Standard Error
  if (error instanceof Error) {
    // Check for specific error types
    if (error.name === 'TypeError') {
      return new AppError(
        error.message,
        'TYPE_ERROR',
        500,
        false,
        { originalError: error.name, stack: error.stack }
      );
    }
    
    if (error.name === 'SyntaxError') {
      return new AppError(
        error.message,
        'SYNTAX_ERROR',
        500,
        false,
        { originalError: error.name, stack: error.stack }
      );
    }
    
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new NetworkError(error.message, { originalError: error.name });
    }
    
    return new AppError(
      error.message,
      'UNKNOWN_ERROR',
      500,
      false,
      { originalError: error.name, stack: error.stack }
    );
  }
  
  // String error
  if (typeof error === 'string') {
    return new AppError(error, 'UNKNOWN_ERROR', 500, false);
  }
  
  // Unknown error type
  return new AppError(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    500,
    false,
    { error: String(error) }
  );
}

// ============================================================================
// ERROR RESPONSE FORMATTER
// ============================================================================

/**
 * Standardized error response format for API responses.
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Formats an AppError into a standardized API response.
 * 
 * @param error - The AppError to format
 * @param requestId - Optional request ID for tracing
 * @param includeStack - Whether to include stack trace (dev only)
 * @returns Formatted error response
 */
export function formatErrorResponse(
  error: AppError,
  requestId?: string,
  includeStack: boolean = false
): ErrorResponse {
  const response: ErrorResponse = {
    error: {
      code: error.code,
      message: error.message,
      details: error.context,
      timestamp: error.timestamp,
      requestId,
    },
  };
  
  if (includeStack && error.stack) {
    response.error.details = {
      ...response.error.details,
      stack: error.stack,
    };
  }
  
  return response;
}

// ============================================================================
// ERROR TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if an error is an AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if an error is operational (expected).
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Checks if an error should be retried.
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof AppError)) {
    return false;
  }
  
  const retryableCodes = [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'EXTERNAL_SERVICE_ERROR',
    'RATE_LIMIT_ERROR',
    'DATABASE_ERROR',
  ];
  
  return retryableCodes.includes(error.code);
}
