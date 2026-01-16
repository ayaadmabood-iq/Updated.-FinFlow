import * as Sentry from '@sentry/react';

export function initializeSentry() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],

      // Performance Monitoring
      tracesSampleRate: 0.1, // 10% of transactions

      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

      // Error filtering
      beforeSend(event, hint) {
        // Don't send errors in development
        if (import.meta.env.DEV) {
          return null;
        }

        // Filter out known non-critical errors
        const error = hint.originalException;
        if (error instanceof Error) {
          // Ignore network errors from ad blockers
          if (error.message.includes('ad') || error.message.includes('tracker')) {
            return null;
          }

          // Ignore browser extension errors
          if (error.message.includes('extension')) {
            return null;
          }

          // Ignore ResizeObserver errors (common browser quirk)
          if (error.message.includes('ResizeObserver')) {
            return null;
          }
        }

        return event;
      },

      // Add user context
      initialScope: {
        tags: {
          version: import.meta.env.VITE_APP_VERSION || '1.0.0',
        },
      },

      // Ignore specific errors
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        // Random plugins/extensions
        'originalCreateNotification',
        'canvas.contentDocument',
        'MyApp_RemoveAllHighlights',
        // Facebook errors
        'fb_xd_fragment',
        // Network errors
        'NetworkError',
        'Network request failed',
        // Chrome extensions
        'chrome-extension://',
        'moz-extension://',
      ],

      // Ignore specific URLs
      denyUrls: [
        // Browser extensions
        /extensions\//i,
        /^chrome:\/\//i,
        /^moz-extension:\/\//i,
      ],
    });
  }
}

// Helper to set user context
export function setSentryUser(user: { id: string; email: string; username?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

// Helper to clear user context (on logout)
export function clearSentryUser() {
  Sentry.setUser(null);
}

// Helper to capture custom events
export function captureEvent(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level);
}

// Helper to add breadcrumb
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
  });
}

// Helper to capture exception with context
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

// Helper to set custom tags
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

// Helper to set custom context
export function setContext(name: string, context: Record<string, any>) {
  Sentry.setContext(name, context);
}
