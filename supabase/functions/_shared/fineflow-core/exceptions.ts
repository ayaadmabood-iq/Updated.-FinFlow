/**
 * FineFlow Core Exceptions
 * 
 * Unified exception hierarchy for backend portability.
 * Maps to standard HTTP status codes and NestJS exception filters.
 */

export enum ErrorCode {
  // Validation (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Authentication (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Authorization (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Resource (402, 404, 409, 429)
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Processing (422)
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  AI_ERROR = 'AI_ERROR',
  CHUNKING_ERROR = 'CHUNKING_ERROR',
  EMBEDDING_ERROR = 'EMBEDDING_ERROR',
  
  // Infrastructure (500, 502, 503, 504)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // Configuration (503)
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  MISSING_API_KEY = 'MISSING_API_KEY',
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  httpStatus: number;
  details?: Record<string, unknown>;
  cause?: Error;
  retryable: boolean;
  traceId?: string;
}

const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.QUOTA_EXCEEDED]: 402,
  [ErrorCode.BUDGET_EXCEEDED]: 402,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.PROCESSING_ERROR]: 422,
  [ErrorCode.EXTRACTION_FAILED]: 422,
  [ErrorCode.AI_ERROR]: 422,
  [ErrorCode.CHUNKING_ERROR]: 422,
  [ErrorCode.EMBEDDING_ERROR]: 422,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.STORAGE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.TIMEOUT]: 504,
  [ErrorCode.CONFIGURATION_ERROR]: 503,
  [ErrorCode.MISSING_API_KEY]: 503,
};

const RETRYABLE_ERRORS: Set<ErrorCode> = new Set([
  ErrorCode.RATE_LIMITED,
  ErrorCode.TIMEOUT,
  ErrorCode.EXTERNAL_SERVICE_ERROR,
  ErrorCode.AI_ERROR,
  ErrorCode.DATABASE_ERROR,
]);

/**
 * Base exception class for FineFlow.
 * Compatible with NestJS HttpException when migrated.
 */
export class FineFlowException extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;
  public readonly details?: Record<string, unknown>;
  public readonly originalCause?: Error;
  public readonly retryable: boolean;
  public readonly traceId?: string;
  public readonly timestamp: string;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      details?: Record<string, unknown>;
      cause?: Error;
      traceId?: string;
    }
  ) {
    super(message);
    this.name = 'FineFlowException';
    this.code = code;
    this.httpStatus = ERROR_HTTP_STATUS[code] ?? 500;
    this.details = options?.details;
    this.originalCause = options?.cause;
    this.retryable = RETRYABLE_ERRORS.has(code);
    this.traceId = options?.traceId;
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FineFlowException);
    }
  }

  toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      httpStatus: this.httpStatus,
      details: this.details,
      retryable: this.retryable,
      traceId: this.traceId,
    };
  }

  toResponse(): Response {
    return new Response(
      JSON.stringify({
        success: false,
        error: this.toJSON(),
        timestamp: this.timestamp,
      }),
      {
        status: this.httpStatus,
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': this.traceId || '',
        },
      }
    );
  }
}

// ============= Specialized Exception Classes =============

export class ValidationException extends FineFlowException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_ERROR, message, { details });
    this.name = 'ValidationException';
  }
}

export class AuthenticationException extends FineFlowException {
  constructor(message = 'Authentication required') {
    super(ErrorCode.UNAUTHORIZED, message);
    this.name = 'AuthenticationException';
  }
}

export class AuthorizationException extends FineFlowException {
  constructor(message = 'Permission denied') {
    super(ErrorCode.FORBIDDEN, message);
    this.name = 'AuthorizationException';
  }
}

export class NotFoundException extends FineFlowException {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    super(ErrorCode.NOT_FOUND, message, { details: { resource, id } });
    this.name = 'NotFoundException';
  }
}

export class QuotaExceededException extends FineFlowException {
  constructor(
    quotaType: 'documents' | 'processing' | 'storage',
    current: number,
    limit: number
  ) {
    super(ErrorCode.QUOTA_EXCEEDED, `${quotaType} quota exceeded: ${current}/${limit}`, {
      details: { quotaType, current, limit },
    });
    this.name = 'QuotaExceededException';
  }
}

export class BudgetExceededException extends FineFlowException {
  constructor(current: number, budget: number, estimated: number) {
    super(ErrorCode.BUDGET_EXCEEDED, 'Monthly budget would be exceeded by this operation', {
      details: { currentSpending: current, monthlyBudget: budget, estimatedCost: estimated },
    });
    this.name = 'BudgetExceededException';
  }
}

export class ProcessingException extends FineFlowException {
  constructor(stage: string, message: string, cause?: Error) {
    super(ErrorCode.PROCESSING_ERROR, `Processing failed at ${stage}: ${message}`, {
      details: { stage },
      cause,
    });
    this.name = 'ProcessingException';
  }
}

export class AIException extends FineFlowException {
  constructor(model: string, message: string, cause?: Error) {
    super(ErrorCode.AI_ERROR, `AI model error (${model}): ${message}`, {
      details: { model },
      cause,
    });
    this.name = 'AIException';
  }
}

export class ConfigurationException extends FineFlowException {
  constructor(message: string, missingKeys?: string[]) {
    super(ErrorCode.CONFIGURATION_ERROR, message, {
      details: { missingKeys },
    });
    this.name = 'ConfigurationException';
  }
}

export class DatabaseException extends FineFlowException {
  constructor(operation: string, message: string, cause?: Error) {
    super(ErrorCode.DATABASE_ERROR, `Database ${operation} failed: ${message}`, {
      details: { operation },
      cause,
    });
    this.name = 'DatabaseException';
  }
}

export class StorageException extends FineFlowException {
  constructor(operation: string, path: string, message: string, cause?: Error) {
    super(ErrorCode.STORAGE_ERROR, `Storage ${operation} failed for '${path}': ${message}`, {
      details: { operation, path },
      cause,
    });
    this.name = 'StorageException';
  }
}

// ============= Exception Factory =============

export function wrapError(error: unknown, traceId?: string): FineFlowException {
  if (error instanceof FineFlowException) {
    if (traceId && !error.traceId) {
      return new FineFlowException(error.code, error.message, {
        details: error.details,
        cause: error.originalCause,
        traceId,
      });
    }
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? error : undefined;

  // Classify common error patterns
  if (message.toLowerCase().includes('timeout')) {
    return new FineFlowException(ErrorCode.TIMEOUT, message, { cause, traceId });
  }
  if (message.toLowerCase().includes('not found')) {
    return new FineFlowException(ErrorCode.NOT_FOUND, message, { cause, traceId });
  }
  if (message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('auth')) {
    return new FineFlowException(ErrorCode.UNAUTHORIZED, message, { cause, traceId });
  }

  return new FineFlowException(ErrorCode.INTERNAL_ERROR, message, { cause, traceId });
}
