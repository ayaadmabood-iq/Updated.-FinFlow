/**
 * Monitoring Initialization
 * Central initialization point for all monitoring systems
 */

import { logger } from '@/lib/logger';
import { initializeSentry, setSentryUser, clearSentryUser } from './sentry';
import { initializeWebVitals, trackPageLoad } from './performance';
import { startHealthCheckMonitoring, runHealthChecks } from './health-check';
import { initializeAlerts, alertCritical, alertWarning } from './alerts';

export interface MonitoringConfig {
  enableSentry?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableHealthChecks?: boolean;
  enableAlerts?: boolean;
  healthCheckInterval?: number; // milliseconds
}

const defaultConfig: MonitoringConfig = {
  enableSentry: true,
  enablePerformanceMonitoring: true,
  enableHealthChecks: true,
  enableAlerts: true,
  healthCheckInterval: 60000, // 1 minute
};

let isInitialized = false;

/**
 * Initialize all monitoring systems
 */
export function initializeMonitoring(config: MonitoringConfig = {}): void {
  if (isInitialized) {
    console.warn('[Monitoring] Already initialized');
    return;
  }

  const mergedConfig = { ...defaultConfig, ...config };

  logger.info('Initializing monitoring systems', {
    config: mergedConfig,
    component: 'MonitoringInit'
  });

  try {
    // Initialize Sentry error monitoring
    if (mergedConfig.enableSentry) {
      initializeSentry();
      logger.info('Sentry initialized', { component: 'MonitoringInit' });
    }

    // Initialize performance monitoring
    if (mergedConfig.enablePerformanceMonitoring) {
      initializeWebVitals();
      logger.info('Performance monitoring initialized', { component: 'MonitoringInit' });
    }

    // Initialize health checks
    if (mergedConfig.enableHealthChecks && mergedConfig.healthCheckInterval) {
      startHealthCheckMonitoring(mergedConfig.healthCheckInterval);
      logger.info('Health check monitoring started', { component: 'MonitoringInit' });
    }

    // Initialize alert system
    if (mergedConfig.enableAlerts) {
      initializeAlerts();
      logger.info('Alert system initialized', { component: 'MonitoringInit' });
    }

    // Set up global error handlers
    setupGlobalErrorHandlers();

    // Set up unhandled rejection handler
    setupUnhandledRejectionHandler();

    // Set up performance observer for long tasks
    setupLongTaskObserver();

    isInitialized = true;
    logger.info('All monitoring systems initialized successfully', { component: 'MonitoringInit' });
  } catch (error) {
    console.error('[Monitoring] Failed to initialize monitoring:', error);
    throw error;
  }
}

/**
 * Setup global error handlers
 */
function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    console.error('[Monitoring] Global error:', event.error);

    if (import.meta.env.PROD) {
      alertCritical('Application Error', event.error?.message || 'Unknown error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    }
  });
}

/**
 * Setup unhandled promise rejection handler
 */
function setupUnhandledRejectionHandler(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Monitoring] Unhandled rejection:', event.reason);

    if (import.meta.env.PROD) {
      alertCritical('Unhandled Promise Rejection', event.reason?.message || 'Unknown error', {
        reason: event.reason,
        promise: event.promise,
      });
    }
  });
}

/**
 * Setup long task observer
 * Alerts when tasks take longer than 50ms (blocking the main thread)
 */
function setupLongTaskObserver(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn('[Monitoring] Long task detected:', {
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
          });

          if (import.meta.env.PROD && entry.duration > 100) {
            alertWarning('Long Task Detected', `Task took ${entry.duration.toFixed(2)}ms`, {
              name: entry.name,
              duration: entry.duration,
            });
          }
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
  } catch (error) {
    console.warn('[Monitoring] Long task observer not supported:', error);
  }
}

/**
 * Track page navigation
 */
export function trackPageNavigation(pageName: string): void {
  if (!isInitialized) {
    console.warn('[Monitoring] Not initialized, call initializeMonitoring first');
    return;
  }

  trackPageLoad(pageName);
}

/**
 * Set user context for monitoring
 */
export function setMonitoringUser(user: {
  id: string;
  email: string;
  username?: string;
}): void {
  if (!isInitialized) return;

  try {
    setSentryUser(user);
  } catch (error) {
    console.error('[Monitoring] Failed to set user context:', error);
  }
}

/**
 * Clear user context (on logout)
 */
export function clearMonitoringUser(): void {
  if (!isInitialized) return;

  try {
    clearSentryUser();
  } catch (error) {
    console.error('[Monitoring] Failed to clear user context:', error);
  }
}

/**
 * Get current monitoring status
 */
export async function getMonitoringStatus(): Promise<{
  initialized: boolean;
  sentry: boolean;
  performance: boolean;
  healthChecks: any;
}> {
  const healthChecks = isInitialized ? await runHealthChecks() : null;

  return {
    initialized: isInitialized,
    sentry: import.meta.env.PROD && !!import.meta.env.VITE_SENTRY_DSN,
    performance: isInitialized,
    healthChecks,
  };
}

/**
 * Shutdown monitoring (cleanup)
 */
export function shutdownMonitoring(): void {
  if (!isInitialized) return;

  logger.info('Shutting down monitoring systems', { component: 'MonitoringInit' });
  isInitialized = false;
}

// Auto-initialize in production
if (import.meta.env.PROD && typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeMonitoring();
    });
  } else {
    initializeMonitoring();
  }
}

// Export all monitoring functions
export {
  // Sentry
  initializeSentry,
  setSentryUser,
  clearSentryUser,
  captureEvent,
  addBreadcrumb,
  captureException,
  setTag,
  setContext,
} from './sentry';

export {
  // Performance
  trackPageLoad,
  trackAPICall,
  trackOperation,
  trackAIOperation,
  trackDatabaseQuery,
  getWebVitals,
  checkPerformanceBudget,
  mark,
  measure,
} from './performance';

export {
  // Health Checks
  runHealthChecks,
  registerHealthCheck,
  checkSupabase,
  checkAPI,
  checkBrowser,
  checkMemory,
  checkNetwork,
} from './health-check';

export {
  // Alerts
  sendAlert,
  alertInfo,
  alertWarning,
  alertError,
  alertCritical,
  registerAlertChannel,
  createSlackChannel,
  createEmailChannel,
  createWebhookChannel,
  requestNotificationPermission,
  getEnabledChannelCount,
  getEnabledChannels,
} from './alerts';
