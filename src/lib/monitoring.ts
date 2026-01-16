/**
 * Production monitoring service with metrics tracking, performance monitoring,
 * and Sentry integration for error tracking.
 */

import { logger } from '@/lib/logger';

export interface MetricData {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: number;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Sentry ErrorBoundary fallback props type
export interface SentryFallbackProps {
  error: Error;
  resetError: () => void;
}

class MonitoringService {
  private metricsBuffer: MetricData[] = [];
  private flushInterval: number = 10000; // 10 seconds
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isProduction: boolean;
  private sentryInitialized: boolean = false;

  constructor() {
    this.isProduction = import.meta.env.PROD === true;
    if (typeof window !== 'undefined') {
      this.startFlushTimer();
    }
  }

  /**
   * Initialize production error monitoring with Sentry.
   * Only runs in production mode.
   * Uses dynamic import to prevent React instance conflicts.
   */
  async initializeMonitoring(): Promise<void> {
    if (!this.isProduction) {
      logger.debug('Skipping Sentry initialization (not production)', { component: 'Monitoring' });
      return;
    }

    if (this.sentryInitialized) {
      logger.debug('Sentry already initialized', { component: 'Monitoring' });
      return;
    }

    const dsn = import.meta.env.VITE_SENTRY_DSN;
    
    if (!dsn) {
      console.warn('[Monitoring] VITE_SENTRY_DSN not configured, skipping Sentry initialization');
      return;
    }

    const Sentry = await import('@sentry/react');

    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: `fineflow@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
      
      // Performance Monitoring
      tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
      
      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
      
      integrations: [
        // Browser tracing for performance monitoring
        Sentry.browserTracingIntegration(),
        // Session replay
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
          maskAllInputs: true,
        }),
      ],
      
      // Filter out sensitive data
      beforeSend(event, hint) {
        const error = hint?.originalException;
        
        // Filter out ChunkLoadError (common with lazy loading / code splitting)
        if (error instanceof Error && error.name === 'ChunkLoadError') {
          return null;
        }
        
        // Also filter chunk load errors by message pattern
        if (error instanceof Error && error.message?.includes('Loading chunk')) {
          return null;
        }

        // Filter out network errors that are common and not actionable
        if (error instanceof Error) {
          const message = error.message.toLowerCase();
          if (
            message.includes('network request failed') ||
            message.includes('failed to fetch') ||
            message.includes('load failed') ||
            message.includes('aborted')
          ) {
            return null;
          }
        }
        
        // Remove sensitive headers
        if (event.request?.headers) {
          const sensitiveHeaders = ['Authorization', 'Cookie', 'X-Api-Key', 'X-Auth-Token'];
          sensitiveHeaders.forEach(header => {
            if (event.request?.headers) {
              delete (event.request.headers as Record<string, unknown>)[header];
              delete (event.request.headers as Record<string, unknown>)[header.toLowerCase()];
            }
          });
        }
        
        // Remove sensitive query params
        if (event.request?.url) {
          try {
            const url = new URL(event.request.url);
            const sensitiveParams = ['token', 'api_key', 'apikey', 'key', 'secret', 'password', 'auth'];
            sensitiveParams.forEach(param => {
              url.searchParams.delete(param);
            });
            event.request.url = url.toString();
          } catch {
            // Invalid URL, skip sanitization
          }
        }

        // Sanitize breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
            if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
              // Remove auth tokens from URLs in breadcrumbs
              if (breadcrumb.data?.url) {
                try {
                  const url = new URL(breadcrumb.data.url);
                  url.searchParams.delete('token');
                  url.searchParams.delete('apikey');
                  breadcrumb.data.url = url.toString();
                } catch {
                  // Invalid URL
                }
              }
              // Remove response bodies
              delete breadcrumb.data?.response;
              delete breadcrumb.data?.body;
            }
            return breadcrumb;
          });
        }
        
        return event;
      },

      // Configure what to include in error reports
      beforeBreadcrumb(breadcrumb) {
        // Filter out console breadcrumbs in production to reduce noise
        if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
          return null;
        }
        return breadcrumb;
      },
    });

    // Set user context if available
    this.setUserContext();

    this.sentryInitialized = true;
    logger.info('Sentry initialized for production', { component: 'Monitoring' });
  }

  /**
   * Set user context in Sentry
   */
  async setUserContext(userId?: string, email?: string): Promise<void> {
    if (!this.isProduction || !this.sentryInitialized) return;

    try {
      const Sentry = await import('@sentry/react');
      if (userId || email) {
        Sentry.setUser({
          id: userId,
          email: email,
        });
      } else {
        Sentry.setUser(null);
      }
    } catch (error) {
      console.warn('[Monitoring] Failed to set user context:', error);
    }
  }

  /**
   * Clear user context (on logout)
   */
  async clearUserContext(): Promise<void> {
    if (!this.isProduction || !this.sentryInitialized) return;

    try {
      const Sentry = await import('@sentry/react');
      Sentry.setUser(null);
    } catch (error) {
      console.warn('[Monitoring] Failed to clear user context:', error);
    }
  }

  /**
   * Track a custom metric
   */
  trackMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: MetricData = {
      name,
      value,
      tags: {
        environment: import.meta.env.MODE,
        ...tags,
      },
      timestamp: Date.now(),
    };

    this.metricsBuffer.push(metric);

    // Also send to Sentry as measurement in production
    if (this.isProduction) {
      this.sendToSentry(name, value, metric.tags);
    }
  }

  /**
   * Send metric to Sentry
   */
  private async sendToSentry(name: string, value: number, tags?: Record<string, string>): Promise<void> {
    try {
      const Sentry = await import('@sentry/react');
      // Set tags as scope context instead of metric options
      Sentry.withScope((scope) => {
        if (tags) {
          Object.entries(tags).forEach(([key, val]) => {
            scope.setTag(key, val);
          });
        }
        Sentry.addBreadcrumb({
          category: 'metric',
          message: `${name}: ${value}`,
          level: 'info',
        });
      });
    } catch (error) {
      console.warn('[Monitoring] Failed to send metric to Sentry:', error);
    }
  }

  /**
   * Track performance of an operation
   */
  async trackPerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = performance.now();
    let success = true;
    let error: string | undefined;

    try {
      const result = await fn();
      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      const duration = performance.now() - startTime;

      this.trackMetric(`performance.${operation}`, duration, {
        success: success.toString(),
        ...tags,
      });

      // Send to Sentry in production
      if (this.isProduction) {
        try {
          const Sentry = await import('@sentry/react');
          Sentry.withScope((scope) => {
            scope.setTag('success', success.toString());
            if (tags) {
              Object.entries(tags).forEach(([key, val]) => {
                scope.setTag(key, val);
              });
            }
            Sentry.addBreadcrumb({
              category: 'performance',
              message: `${operation}: ${duration}ms`,
              level: success ? 'info' : 'warning',
              data: { duration, success },
            });
          });
        } catch {
          // Ignore Sentry errors
        }
      }

      // Log slow operations
      if (duration > 1000) {
        console.warn(`Slow operation detected: ${operation} took ${duration}ms`);
        if (this.isProduction) {
          this.captureMessage(`Slow operation: ${operation}`, 'warning', {
            duration,
            operation,
            tags,
          });
        }
      }
    }
  }

  /**
   * Track user action
   */
  trackUserAction(action: string, properties?: Record<string, unknown>): void {
    this.trackMetric(`user.action.${action}`, 1, {
      action,
    });

    // Send to analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', action, properties);
    }

    if (!this.isProduction) {
      logger.debug(`User action: ${action}`, {
        properties,
        component: 'Monitoring'
      });
    }
  }

  /**
   * Track API call
   */
  trackAPICall(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number
  ): void {
    this.trackMetric('api.call', 1, {
      endpoint,
      method,
      status: statusCode.toString(),
    });

    this.trackMetric('api.duration', duration, {
      endpoint,
      method,
    });

    // Track errors
    if (statusCode >= 400) {
      this.trackMetric('api.error', 1, {
        endpoint,
        method,
        status: statusCode.toString(),
      });
    }
  }

  /**
   * Track database query
   */
  trackDatabaseQuery(
    table: string,
    operation: 'select' | 'insert' | 'update' | 'delete',
    duration: number,
    rowCount?: number
  ): void {
    this.trackMetric('database.query', 1, {
      table,
      operation,
    });

    this.trackMetric('database.duration', duration, {
      table,
      operation,
    });

    if (rowCount !== undefined) {
      this.trackMetric('database.rows', rowCount, {
        table,
        operation,
      });
    }

    // Warn on slow queries
    if (duration > 500) {
      console.warn(`Slow database query: ${operation} on ${table} took ${duration}ms`);
    }
  }

  /**
   * Track AI operation
   */
  trackAIOperation(
    operation: string,
    model: string,
    tokensUsed: number,
    cost: number,
    duration: number,
    blocked: boolean = false
  ): void {
    this.trackMetric('ai.operation', 1, {
      operation,
      model,
      blocked: blocked.toString(),
    });

    this.trackMetric('ai.tokens', tokensUsed, {
      operation,
      model,
    });

    this.trackMetric('ai.cost', cost, {
      operation,
      model,
    });

    this.trackMetric('ai.duration', duration, {
      operation,
      model,
    });

    if (blocked) {
      this.trackMetric('ai.blocked', 1, {
        operation,
        model,
      });
    }
  }

  /**
   * Track error
   */
  trackError(
    error: Error,
    context?: {
      component?: string;
      action?: string;
      userId?: string;
      extra?: Record<string, unknown>;
    }
  ): void {
    this.trackMetric('error', 1, {
      component: context?.component || 'unknown',
      action: context?.action || 'unknown',
    });

    // Send to Sentry
    this.captureException(error, {
      component: context?.component,
      action: context?.action,
      userId: context?.userId,
      ...context?.extra,
    });
  }

  /**
   * Manually capture an exception
   */
  async captureException(error: Error, context?: Record<string, unknown>): Promise<void> {
    if (this.isProduction) {
      const Sentry = await import('@sentry/react');
      Sentry.captureException(error, { extra: context });
    } else {
      console.error('[Monitoring] Would capture exception:', error, context);
    }
  }

  /**
   * Manually capture a message
   */
  async captureMessage(
    message: string, 
    level: 'info' | 'warning' | 'error' = 'info',
    extra?: Record<string, unknown>
  ): Promise<void> {
    if (this.isProduction) {
      const Sentry = await import('@sentry/react');
      Sentry.captureMessage(message, { level, extra });
    } else {
      logger.debug(`Would capture message (${level}): ${message}`, {
        extra,
        component: 'Monitoring'
      });
    }
  }

  /**
   * Get Sentry ErrorBoundary component
   */
  async getErrorBoundary(): Promise<React.ComponentType<{
    children: React.ReactNode;
    fallback?: React.ComponentType<SentryFallbackProps>;
    showDialog?: boolean;
  }>> {
    const Sentry = await import('@sentry/react');
    return Sentry.ErrorBoundary as React.ComponentType<{
      children: React.ReactNode;
      fallback?: React.ComponentType<SentryFallbackProps>;
      showDialog?: boolean;
    }>;
  }

  /**
   * Flush metrics to backend
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/metrics-collector`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ metrics }),
      });

      if (!response.ok) {
        throw new Error(`Failed to flush metrics: ${response.status}`);
      }
    } catch (error) {
      console.error('[Monitoring] Failed to flush metrics:', error);
      // Re-add metrics to buffer (but limit buffer size)
      if (this.metricsBuffer.length < 1000) {
        this.metricsBuffer.unshift(...metrics);
      }
    }
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushMetrics();
    }, this.flushInterval);
  }

  /**
   * Stop flush timer
   */
  stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Get buffered metrics count (for debugging)
   */
  getBufferedMetricsCount(): number {
    return this.metricsBuffer.length;
  }

  /**
   * Check if Sentry is initialized
   */
  isSentryInitialized(): boolean {
    return this.sentryInitialized;
  }
}

// Export singleton instance
export const monitoring = new MonitoringService();

// Export helper functions bound to the singleton
export const initializeMonitoring = monitoring.initializeMonitoring.bind(monitoring);
export const trackMetric = monitoring.trackMetric.bind(monitoring);
export const trackPerformance = monitoring.trackPerformance.bind(monitoring);
export const trackUserAction = monitoring.trackUserAction.bind(monitoring);
export const trackAPICall = monitoring.trackAPICall.bind(monitoring);
export const trackDatabaseQuery = monitoring.trackDatabaseQuery.bind(monitoring);
export const trackAIOperation = monitoring.trackAIOperation.bind(monitoring);
export const trackError = monitoring.trackError.bind(monitoring);
export const captureException = monitoring.captureException.bind(monitoring);
export const captureMessage = monitoring.captureMessage.bind(monitoring);
export const setUserContext = monitoring.setUserContext.bind(monitoring);
export const clearUserContext = monitoring.clearUserContext.bind(monitoring);
