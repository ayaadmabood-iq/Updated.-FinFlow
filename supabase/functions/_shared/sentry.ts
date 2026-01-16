/**
 * Sentry integration for Supabase Edge Functions
 * Provides error tracking, message logging, and performance monitoring
 */

export interface SentryEvent {
  message: string;
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  extra?: Record<string, unknown>;
  tags?: Record<string, string>;
  user?: {
    id?: string;
    email?: string;
    ip_address?: string;
  };
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: {
        frames: Array<{
          filename?: string;
          function?: string;
          lineno?: number;
          colno?: number;
        }>;
      };
    }>;
  };
  timestamp?: number;
  platform?: string;
  environment?: string;
  release?: string;
  request?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
  };
}

interface SentryContext {
  userId?: string;
  projectId?: string;
  operation?: string;
  extra?: Record<string, unknown>;
  request?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
  };
}

// Parse Sentry DSN into components
function parseDSN(dsn: string): { publicKey: string; host: string; projectId: string } | null {
  try {
    // DSN format: https://<key>@<host>/<project-id>
    const url = new URL(dsn);
    const publicKey = url.username;
    const host = url.host;
    const projectId = url.pathname.slice(1); // Remove leading slash
    
    if (!publicKey || !host || !projectId) {
      return null;
    }
    
    return { publicKey, host, projectId };
  } catch {
    return null;
  }
}

// Format timestamp for Sentry
function getSentryTimestamp(): number {
  return Date.now() / 1000;
}

// Parse error stack trace
function parseStackTrace(stack?: string): Array<{
  filename?: string;
  function?: string;
  lineno?: number;
  colno?: number;
}> {
  if (!stack) return [];
  
  const frames: Array<{
    filename?: string;
    function?: string;
    lineno?: number;
    colno?: number;
  }> = [];
  
  const lines = stack.split('\n');
  for (const line of lines) {
    // Parse stack trace lines like: "    at functionName (filename:line:col)"
    const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);
    if (match) {
      frames.push({
        function: match[1] || '<anonymous>',
        filename: match[2],
        lineno: parseInt(match[3], 10),
        colno: parseInt(match[4], 10),
      });
    }
  }
  
  return frames.reverse(); // Sentry expects frames in reverse order
}

// Sanitize data to remove sensitive information
function sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'authorization', 
    'cookie', 'session', 'apikey', 'api_key', 'auth'
  ];
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '[Filtered]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Capture an exception and send it to Sentry
 */
export async function captureException(
  error: Error,
  context?: SentryContext
): Promise<void> {
  const sentryDsn = Deno.env.get('SENTRY_DSN');
  
  if (!sentryDsn) {
    console.error('[Sentry] SENTRY_DSN not configured, logging locally:', error.message);
    return;
  }
  
  const dsnParts = parseDSN(sentryDsn);
  if (!dsnParts) {
    console.error('[Sentry] Invalid SENTRY_DSN format');
    return;
  }
  
  const event: SentryEvent = {
    message: error.message,
    level: 'error',
    platform: 'deno',
    environment: Deno.env.get('ENVIRONMENT') || 'production',
    release: Deno.env.get('SENTRY_RELEASE') || 'fineflow-edge@1.0.0',
    timestamp: getSentryTimestamp(),
    exception: {
      values: [{
        type: error.name || 'Error',
        value: error.message,
        stacktrace: {
          frames: parseStackTrace(error.stack),
        },
      }],
    },
    extra: context?.extra ? sanitizeData(context.extra) : undefined,
    tags: {
      operation: context?.operation || 'unknown',
      ...(context?.projectId && { projectId: context.projectId }),
    },
    user: context?.userId ? {
      id: context.userId,
    } : undefined,
    request: context?.request ? {
      url: context.request.url,
      method: context.request.method,
      headers: context.request.headers ? sanitizeData(context.request.headers) as Record<string, string> : undefined,
    } : undefined,
  };
  
  try {
    const storeUrl = `https://${dsnParts.host}/api/${dsnParts.projectId}/store/`;
    
    const response = await fetch(storeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=fineflow-edge/1.0.0, sentry_key=${dsnParts.publicKey}`,
      },
      body: JSON.stringify(event),
    });
    
    if (!response.ok) {
      console.error('[Sentry] Failed to send exception:', response.status, await response.text());
    }
  } catch (err) {
    console.error('[Sentry] Failed to send exception to Sentry:', err);
  }
}

/**
 * Capture a message and send it to Sentry
 */
export async function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: SentryContext
): Promise<void> {
  const sentryDsn = Deno.env.get('SENTRY_DSN');
  
  if (!sentryDsn) {
    console.log(`[Sentry] ${level.toUpperCase()}: ${message}`);
    return;
  }
  
  const dsnParts = parseDSN(sentryDsn);
  if (!dsnParts) {
    console.error('[Sentry] Invalid SENTRY_DSN format');
    return;
  }
  
  const event: SentryEvent = {
    message,
    level,
    platform: 'deno',
    environment: Deno.env.get('ENVIRONMENT') || 'production',
    release: Deno.env.get('SENTRY_RELEASE') || 'fineflow-edge@1.0.0',
    timestamp: getSentryTimestamp(),
    extra: context?.extra ? sanitizeData(context.extra) : undefined,
    tags: {
      operation: context?.operation || 'unknown',
      ...(context?.projectId && { projectId: context.projectId }),
    },
    user: context?.userId ? {
      id: context.userId,
    } : undefined,
    request: context?.request ? {
      url: context.request.url,
      method: context.request.method,
    } : undefined,
  };
  
  try {
    const storeUrl = `https://${dsnParts.host}/api/${dsnParts.projectId}/store/`;
    
    const response = await fetch(storeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=fineflow-edge/1.0.0, sentry_key=${dsnParts.publicKey}`,
      },
      body: JSON.stringify(event),
    });
    
    if (!response.ok) {
      console.error('[Sentry] Failed to send message:', response.status);
    }
  } catch (err) {
    console.error('[Sentry] Failed to send message to Sentry:', err);
  }
}

/**
 * Create a breadcrumb for tracking user actions
 */
export function createBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
): {
  category: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
} {
  return {
    category,
    message,
    data: data ? sanitizeData(data) : undefined,
    timestamp: getSentryTimestamp(),
  };
}

/**
 * Helper to wrap async functions with error tracking
 */
export function withSentry<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  operation: string
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const startTime = Date.now();
    
    try {
      const result = await fn(...args);
      
      // Log successful operation timing
      const duration = Date.now() - startTime;
      if (duration > 5000) {
        await captureMessage(`Slow operation: ${operation}`, 'warning', {
          operation,
          extra: { duration_ms: duration },
        });
      }
      
      return result as Awaited<ReturnType<T>>;
    } catch (error) {
      await captureException(error as Error, {
        operation,
        extra: {
          duration_ms: Date.now() - startTime,
        },
      });
      throw error;
    }
  };
}

/**
 * Performance tracking helper
 */
export async function trackPerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Omit<SentryContext, 'operation'>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    
    const duration = Date.now() - startTime;
    
    // Report slow operations as warnings
    if (duration > 5000) {
      await captureMessage(`Slow operation: ${operation} took ${duration}ms`, 'warning', {
        ...context,
        operation,
        extra: {
          ...context?.extra,
          duration_ms: duration,
        },
      });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    await captureException(error as Error, {
      ...context,
      operation,
      extra: {
        ...context?.extra,
        duration_ms: duration,
      },
    });
    
    throw error;
  }
}
