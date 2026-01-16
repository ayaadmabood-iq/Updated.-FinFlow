/**
 * Comprehensive Logger for FineFlow Application
 * 
 * Provides structured logging with Sentry integration, performance tracking,
 * and consistent formatting across the application.
 * 
 * @module lib/logger
 */

import { captureException, captureMessage } from './monitoring';
import { AppError } from './errors';

/** Available log levels in order of severity */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** Context object for structured logging */
export interface LogContext {
  /** User ID for user-scoped operations */
  userId?: string;
  /** Project ID for project-scoped operations */
  projectId?: string;
  /** Operation name for tracking */
  operation?: string;
  /** Duration in milliseconds */
  duration?: number;
  /** Request ID for tracing */
  requestId?: string;
  /** Component name for React components */
  component?: string;
  /** Additional context data */
  [key: string]: unknown;
}

/** Log entry structure */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    code?: string;
    stack?: string;
  };
}

/**
 * Logger class providing comprehensive logging capabilities.
 * 
 * @class Logger
 * 
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger';
 * 
 * // Basic logging
 * logger.info('User logged in', { userId: '123' });
 * 
 * // Error logging
 * logger.error('Failed to save', error, { projectId: '456' });
 * 
 * // Performance tracking
 * const result = await logger.measurePerformance('fetchData', async () => {
 *   return await api.getData();
 * });
 * ```
 */
class Logger {
  private isDevelopment: boolean;
  private minLevel: LogLevel;
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  };

  constructor() {
    this.isDevelopment = import.meta.env.MODE === 'development';
    this.minLevel = this.isDevelopment ? 'debug' : 'info';
  }

  /**
   * Checks if a log level should be output based on minimum level.
   */
  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.minLevel];
  }

  /**
   * Formats a log message with timestamp and context.
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const emoji = this.getLevelEmoji(level);
    const contextStr = context && Object.keys(context).length > 0
      ? ` | ${JSON.stringify(context)}`
      : '';
    return `${emoji} [${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  /**
   * Gets an emoji for the log level for visual distinction in console.
   */
  private getLevelEmoji(level: LogLevel): string {
    const emojis: Record<LogLevel, string> = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      fatal: '💀',
    };
    return emojis[level];
  }

  /**
   * Creates a structured log entry.
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        code: error instanceof AppError ? error.code : undefined,
        stack: this.isDevelopment ? error.stack : undefined,
      };
    }

    return entry;
  }

  /**
   * Logs a debug message. Only output in development.
   * 
   * @param message - Log message
   * @param context - Optional context data
   */
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;
    
    const formattedMessage = this.formatMessage('debug', message, context);
    console.debug(formattedMessage);
  }

  /**
   * Logs an informational message.
   * 
   * @param message - Log message
   * @param context - Optional context data
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;
    
    const formattedMessage = this.formatMessage('info', message, context);
    console.info(formattedMessage);
    
    // Add breadcrumb for tracing in production
    if (!this.isDevelopment) {
      try {
        captureMessage(message, 'info', context);
      } catch {
        // Silently fail if Sentry not available
      }
    }
  }

  /**
   * Logs a warning message.
   * 
   * @param message - Log message
   * @param context - Optional context data
   */
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;
    
    const formattedMessage = this.formatMessage('warn', message, context);
    console.warn(formattedMessage);
    
    // Send warning to Sentry
    try {
      captureMessage(message, 'warning', context);
    } catch {
      // Silently fail if Sentry not available
    }
  }

  /**
   * Logs an error with optional error object.
   * 
   * @param message - Error message
   * @param error - Optional Error object
   * @param context - Optional context data
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!this.shouldLog('error')) return;
    
    const formattedMessage = this.formatMessage('error', message, context);
    console.error(formattedMessage);
    
    if (error) {
      console.error(error);
      
      // Send to Sentry
      if (error instanceof Error) {
        captureException(error, {
          ...context,
          message,
        });
      }
    } else {
      captureMessage(message, 'error', context);
    }
  }

  /**
   * Logs a fatal error. Always logged and sent to Sentry.
   * 
   * @param message - Fatal error message
   * @param error - Optional Error object
   * @param context - Optional context data
   */
  fatal(message: string, error?: Error | unknown, context?: LogContext): void {
    const formattedMessage = this.formatMessage('fatal', message, context);
    console.error(formattedMessage);
    
    if (error) {
      console.error(error);
      
      // Send with fatal level to Sentry
      if (error instanceof Error) {
        captureException(error, {
          ...context,
          message,
          level: 'fatal',
        });
      }
    } else {
      captureMessage(message, 'error', { ...context, level: 'fatal' });
    }
  }

  /**
   * Wraps an async operation with performance logging.
   * 
   * @param operation - Name of the operation
   * @param fn - Async function to execute
   * @param context - Optional context data
   * @returns The result of the async function
   * 
   * @example
   * ```typescript
   * const data = await logger.measurePerformance(
   *   'fetchUserProjects',
   *   async () => await api.getProjects(userId),
   *   { userId }
   * );
   * ```
   */
  async measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Omit<LogContext, 'operation' | 'duration'>
  ): Promise<T> {
    const startTime = performance.now();
    const operationContext = { ...context, operation };
    
    this.debug(`Starting operation: ${operation}`, operationContext);
    
    try {
      const result = await fn();
      const duration = Math.round(performance.now() - startTime);
      
      this.info(`Operation completed: ${operation}`, {
        ...operationContext,
        duration,
        success: true,
      });
      
      // Log slow operations
      if (duration > 3000) {
        this.warn(`Slow operation detected: ${operation}`, {
          ...operationContext,
          duration,
          threshold: 3000,
        });
      }
      
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      
      this.error(
        `Operation failed: ${operation}`,
        error,
        {
          ...operationContext,
          duration,
          success: false,
        }
      );
      
      throw error;
    }
  }

  /**
   * Wraps a sync operation with performance logging.
   */
  measureSync<T>(
    operation: string,
    fn: () => T,
    context?: Omit<LogContext, 'operation' | 'duration'>
  ): T {
    const startTime = performance.now();
    const operationContext = { ...context, operation };
    
    try {
      const result = fn();
      const duration = Math.round(performance.now() - startTime);
      
      this.debug(`Sync operation completed: ${operation}`, {
        ...operationContext,
        duration,
        success: true,
      });
      
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      
      this.error(
        `Sync operation failed: ${operation}`,
        error,
        {
          ...operationContext,
          duration,
          success: false,
        }
      );
      
      throw error;
    }
  }

  /**
   * Creates a child logger with preset context.
   * 
   * @param baseContext - Context to include in all logs
   * @returns New logger instance with preset context
   * 
   * @example
   * ```typescript
   * const projectLogger = logger.child({ projectId: '123' });
   * projectLogger.info('Document uploaded'); // includes projectId
   * ```
   */
  child(baseContext: LogContext): ChildLogger {
    return new ChildLogger(this, baseContext);
  }

  /**
   * Logs a user action for analytics and debugging.
   */
  trackAction(action: string, properties?: Record<string, unknown>): void {
    this.info(`User action: ${action}`, {
      operation: 'user_action',
      action,
      ...properties,
    });
  }

  /**
   * Logs an API call for debugging.
   */
  trackAPICall(
    method: string,
    endpoint: string,
    statusCode: number,
    durationMs: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 400 ? 'error' : 'info';
    const message = `API ${method} ${endpoint} → ${statusCode}`;
    
    if (level === 'error') {
      this.error(message, undefined, {
        ...context,
        method,
        endpoint,
        statusCode,
        duration: durationMs,
      });
    } else {
      this.info(message, {
        ...context,
        method,
        endpoint,
        statusCode,
        duration: durationMs,
      });
    }
  }

  /**
   * Groups related log entries together.
   */
  group(label: string): void {
    if (this.isDevelopment) {
      console.group(`📦 ${label}`);
    }
  }

  /**
   * Ends a log group.
   */
  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }

  /**
   * Logs a table for structured data visualization.
   */
  table(data: unknown[], columns?: string[]): void {
    if (this.isDevelopment) {
      console.table(data, columns);
    }
  }
}

/**
 * Child logger with preset context.
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private baseContext: LogContext
  ) {}

  private mergeContext(context?: LogContext): LogContext {
    return { ...this.baseContext, ...context };
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(message, this.mergeContext(context));
  }

  info(message: string, context?: LogContext): void {
    this.parent.info(message, this.mergeContext(context));
  }

  warn(message: string, context?: LogContext): void {
    this.parent.warn(message, this.mergeContext(context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    this.parent.error(message, error, this.mergeContext(context));
  }

  fatal(message: string, error?: Error | unknown, context?: LogContext): void {
    this.parent.fatal(message, error, this.mergeContext(context));
  }

  async measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Omit<LogContext, 'operation' | 'duration'>
  ): Promise<T> {
    return this.parent.measurePerformance(operation, fn, this.mergeContext(context));
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for external use
export type { ChildLogger };
