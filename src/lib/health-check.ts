/**
 * Health Check System
 * Monitors the health of various system components
 */

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    [key: string]: {
      status: 'healthy' | 'unhealthy';
      message?: string;
      responseTime?: number;
      lastChecked: string;
    };
  };
}

interface HealthChecker {
  name: string;
  check: () => Promise<boolean>;
}

const healthCheckers: HealthChecker[] = [];

/**
 * Register a health check
 */
export function registerHealthCheck(name: string, check: () => Promise<boolean>) {
  healthCheckers.push({ name, check });
}

/**
 * Run all health checks
 */
export async function runHealthChecks(): Promise<HealthCheckResult> {
  const checks: HealthCheckResult['checks'] = {};
  const timestamp = new Date().toISOString();

  // Run all registered checks
  for (const checker of healthCheckers) {
    const startTime = performance.now();
    try {
      const result = await Promise.race([
        checker.check(),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        ),
      ]);

      const responseTime = performance.now() - startTime;

      checks[checker.name] = {
        status: result ? 'healthy' : 'unhealthy',
        responseTime: Math.round(responseTime),
        lastChecked: timestamp,
      };
    } catch (error) {
      checks[checker.name] = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: timestamp,
      };
    }
  }

  // Determine overall status
  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');
  const anyUnhealthy = Object.values(checks).some((c) => c.status === 'unhealthy');

  const status = allHealthy ? 'healthy' : anyUnhealthy ? 'unhealthy' : 'degraded';

  return {
    status,
    timestamp,
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    checks,
  };
}

/**
 * Check Supabase connectivity
 */
export async function checkSupabase(): Promise<boolean> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return false;
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Supabase health check failed:', error);
    return false;
  }
}

/**
 * Check API connectivity
 */
export async function checkAPI(): Promise<boolean> {
  try {
    // Check if we can reach our own origin
    const response = await fetch(window.location.origin, {
      method: 'HEAD',
    });

    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}

/**
 * Check browser capabilities
 */
export async function checkBrowser(): Promise<boolean> {
  try {
    // Check for required browser features
    const hasLocalStorage = typeof localStorage !== 'undefined';
    const hasSessionStorage = typeof sessionStorage !== 'undefined';
    const hasFetch = typeof fetch !== 'undefined';
    const hasPromise = typeof Promise !== 'undefined';

    return hasLocalStorage && hasSessionStorage && hasFetch && hasPromise;
  } catch (error) {
    console.error('Browser health check failed:', error);
    return false;
  }
}

/**
 * Check memory usage
 */
export async function checkMemory(): Promise<boolean> {
  try {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

      // Consider unhealthy if memory usage is over 90%
      return usagePercent < 90;
    }

    // If memory API not available, assume healthy
    return true;
  } catch (error) {
    console.error('Memory health check failed:', error);
    return false;
  }
}

/**
 * Check network connectivity
 */
export async function checkNetwork(): Promise<boolean> {
  try {
    // Check if online
    if (!navigator.onLine) {
      return false;
    }

    // Try to fetch a small resource
    const response = await fetch('/favicon.ico', {
      method: 'HEAD',
      cache: 'no-cache',
    });

    return response.ok;
  } catch (error) {
    console.error('Network health check failed:', error);
    return false;
  }
}

// Register default health checks
if (typeof window !== 'undefined') {
  registerHealthCheck('browser', checkBrowser);
  registerHealthCheck('network', checkNetwork);
  registerHealthCheck('memory', checkMemory);
  registerHealthCheck('api', checkAPI);
  registerHealthCheck('supabase', checkSupabase);
}

/**
 * Start periodic health checks
 */
export function startHealthCheckMonitoring(intervalMs: number = 60000) {
  setInterval(async () => {
    const result = await runHealthChecks();

    if (result.status !== 'healthy') {
      console.warn('[Health Check] System is not healthy:', result);

      // Send to monitoring service
      if (import.meta.env.PROD) {
        try {
          // Report to Sentry or other monitoring service
          if (window.Sentry) {
            window.Sentry.captureMessage(`Health check failed: ${result.status}`, {
              level: result.status === 'unhealthy' ? 'error' : 'warning',
              extra: result.checks,
            });
          }
        } catch (error) {
          console.error('Failed to report health check:', error);
        }
      }
    }
  }, intervalMs);
}

// Type for Sentry on window
declare global {
  interface Window {
    Sentry?: {
      captureMessage: (message: string, options?: any) => void;
      captureException: (error: Error, options?: any) => void;
    };
  }
}
