/**
 * FineFlow Core Logger
 * 
 * Unified logging system compatible with:
 * - Deno Edge Functions (console-based)
 * - NestJS (pino/winston integration ready)
 * - Structured JSON logging for observability
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  traceId?: string;
  requestId?: string;
  userId?: string;
  documentId?: string;
  projectId?: string;
  stage?: string;
  executorVersion?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metrics?: {
    durationMs?: number;
    bytesProcessed?: number;
    tokensUsed?: number;
    costUsd?: number;
  };
}

export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  child(context: LogContext): ILogger;
  startTimer(): () => number;
}

// Log level priority for filtering
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * FineFlow Logger Implementation
 * 
 * Features:
 * - Structured JSON output
 * - Context inheritance (child loggers)
 * - Timer utilities for performance tracking
 * - Environment-aware log level filtering
 */
export class FineFlowLogger implements ILogger {
  private context: LogContext;
  private minLevel: LogLevel;
  private serviceName: string;

  constructor(
    serviceName: string,
    context: LogContext = {},
    minLevel?: LogLevel
  ) {
    this.serviceName = serviceName;
    this.context = context;
    // Default to 'debug' in development, 'info' in production
    this.minLevel = minLevel || this.getDefaultLevel();
  }

  private getDefaultLevel(): LogLevel {
    // Check for Deno environment variable
    try {
      const level = (globalThis as unknown as { Deno?: { env: { get: (k: string) => string | undefined } } })
        ?.Deno?.env?.get?.('LOG_LEVEL');
      if (level && ['debug', 'info', 'warn', 'error'].includes(level)) {
        return level as LogLevel;
      }
    } catch {
      // Not in Deno environment
    }
    return 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  private formatEntry(
    level: LogLevel,
    message: string,
    additionalContext?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        service: this.serviceName,
        ...this.context,
        ...additionalContext,
      },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        // Include FineFlowException code if available
        code: (error as { code?: string }).code,
      };
    }

    return entry;
  }

  private output(entry: LogEntry): void {
    // Structured JSON log - compatible with log aggregators
    const logLine = JSON.stringify(entry);
    
    switch (entry.level) {
      case 'error':
        console.error(logLine);
        break;
      case 'warn':
        console.warn(logLine);
        break;
      case 'debug':
        console.debug(logLine);
        break;
      default:
        console.log(logLine);
    }
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;
    this.output(this.formatEntry('debug', message, context));
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;
    this.output(this.formatEntry('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;
    this.output(this.formatEntry('warn', message, context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog('error')) return;
    this.output(this.formatEntry('error', message, context, error));
  }

  /**
   * Create a child logger with inherited + additional context
   */
  child(context: LogContext): ILogger {
    return new FineFlowLogger(this.serviceName, {
      ...this.context,
      ...context,
    }, this.minLevel);
  }

  /**
   * Start a timer for performance measurement
   * Returns a function that, when called, returns elapsed ms
   */
  startTimer(): () => number {
    const start = performance.now();
    return () => Math.round(performance.now() - start);
  }
}

// ============= Logger Factory =============

// Cache loggers by service name to ensure consistency
const loggerCache = new Map<string, FineFlowLogger>();

/**
 * Get or create a logger for a service
 */
export function getLogger(serviceName: string, context?: LogContext): FineFlowLogger {
  const cacheKey = serviceName;
  
  if (!loggerCache.has(cacheKey)) {
    loggerCache.set(cacheKey, new FineFlowLogger(serviceName, context));
  }
  
  const baseLogger = loggerCache.get(cacheKey)!;
  
  // If additional context provided, create a child logger
  if (context && Object.keys(context).length > 0) {
    return baseLogger.child(context) as FineFlowLogger;
  }
  
  return baseLogger;
}

/**
 * Create a request-scoped logger with trace ID
 */
export function createRequestLogger(
  serviceName: string,
  traceId: string,
  requestId?: string
): FineFlowLogger {
  return new FineFlowLogger(serviceName, {
    traceId,
    requestId: requestId || traceId.slice(0, 8),
  });
}

// ============= Logging Utilities =============

/**
 * Log a stage execution with metrics
 */
export function logStageExecution(
  logger: ILogger,
  stage: string,
  status: 'started' | 'completed' | 'failed',
  metrics?: {
    durationMs?: number;
    inputSize?: number;
    outputSize?: number;
    tokensUsed?: number;
    costUsd?: number;
  },
  error?: Error
): void {
  const context: LogContext = {
    stage,
    status,
    ...metrics,
  };

  if (status === 'started') {
    logger.info(`Stage ${stage} started`, context);
  } else if (status === 'completed') {
    logger.info(`Stage ${stage} completed in ${metrics?.durationMs}ms`, context);
  } else {
    logger.error(`Stage ${stage} failed`, error, context);
  }
}

/**
 * Wrap an async function with automatic logging
 */
export function withLogging<TArgs extends unknown[], TResult>(
  logger: ILogger,
  operationName: string,
  fn: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const timer = logger.startTimer();
    logger.debug(`${operationName} started`);
    
    try {
      const result = await fn(...args);
      logger.info(`${operationName} completed`, { durationMs: timer() });
      return result;
    } catch (error) {
      logger.error(
        `${operationName} failed`,
        error instanceof Error ? error : new Error(String(error)),
        { durationMs: timer() }
      );
      throw error;
    }
  };
}
