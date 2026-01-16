/**
 * Alerting System
 * Handles sending alerts via various channels (Slack, email, webhooks)
 */

import { logger } from '@/lib/logger';

export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';

export interface Alert {
  level: AlertLevel;
  title: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AlertChannel {
  name: string;
  send: (alert: Alert) => Promise<boolean>;
  enabled: boolean;
}

// Alert channels registry
const alertChannels: AlertChannel[] = [];

/**
 * Register an alert channel
 */
export function registerAlertChannel(channel: AlertChannel) {
  alertChannels.push(channel);
}

/**
 * Send an alert through all enabled channels
 */
export async function sendAlert(
  level: AlertLevel,
  title: string,
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  const alert: Alert = {
    level,
    title,
    message,
    timestamp: new Date().toISOString(),
    metadata,
  };

  // Log to console in development
  if (import.meta.env.DEV) {
    logger.debug(`Alert ${level.toUpperCase()}: ${title}`, {
      message,
      metadata,
      component: 'AlertSystem'
    });
    return;
  }

  // Send through all enabled channels
  const promises = alertChannels
    .filter((channel) => channel.enabled)
    .map((channel) =>
      channel.send(alert).catch((error) => {
        console.error(`Failed to send alert via ${channel.name}:`, error);
        return false;
      })
    );

  await Promise.allSettled(promises);
}

/**
 * Slack alert channel
 */
export function createSlackChannel(webhookUrl: string): AlertChannel {
  return {
    name: 'Slack',
    enabled: !!webhookUrl,
    send: async (alert: Alert) => {
      try {
        const color = {
          info: '#36a64f',
          warning: '#ff9900',
          error: '#ff0000',
          critical: '#8b0000',
        }[alert.level];

        const emoji = {
          info: ':information_source:',
          warning: ':warning:',
          error: ':x:',
          critical: ':rotating_light:',
        }[alert.level];

        const payload = {
          text: `${emoji} *${alert.title}*`,
          attachments: [
            {
              color,
              fields: [
                {
                  title: 'Message',
                  value: alert.message,
                  short: false,
                },
                {
                  title: 'Level',
                  value: alert.level.toUpperCase(),
                  short: true,
                },
                {
                  title: 'Time',
                  value: new Date(alert.timestamp).toLocaleString(),
                  short: true,
                },
              ],
              footer: 'FineFlow Monitoring',
              ts: Math.floor(new Date(alert.timestamp).getTime() / 1000),
            },
          ],
        };

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        return response.ok;
      } catch (error) {
        console.error('Slack alert failed:', error);
        return false;
      }
    },
  };
}

/**
 * Email alert channel (via API)
 */
export function createEmailChannel(apiEndpoint: string, apiKey?: string): AlertChannel {
  return {
    name: 'Email',
    enabled: !!apiEndpoint,
    send: async (alert: Alert) => {
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            subject: `[${alert.level.toUpperCase()}] ${alert.title}`,
            message: alert.message,
            metadata: alert.metadata,
            timestamp: alert.timestamp,
          }),
        });

        return response.ok;
      } catch (error) {
        console.error('Email alert failed:', error);
        return false;
      }
    },
  };
}

/**
 * Webhook alert channel (generic)
 */
export function createWebhookChannel(webhookUrl: string, apiKey?: string): AlertChannel {
  return {
    name: 'Webhook',
    enabled: !!webhookUrl,
    send: async (alert: Alert) => {
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(alert),
        });

        return response.ok;
      } catch (error) {
        console.error('Webhook alert failed:', error);
        return false;
      }
    },
  };
}

/**
 * Browser notification channel
 */
export function createBrowserNotificationChannel(): AlertChannel {
  return {
    name: 'Browser Notification',
    enabled: typeof Notification !== 'undefined' && Notification.permission === 'granted',
    send: async (alert: Alert) => {
      try {
        if (Notification.permission !== 'granted') {
          return false;
        }

        const icon = {
          info: '💡',
          warning: '⚠️',
          error: '❌',
          critical: '🚨',
        }[alert.level];

        new Notification(`${icon} ${alert.title}`, {
          body: alert.message,
          icon: '/favicon.ico',
          tag: alert.level,
        });

        return true;
      } catch (error) {
        console.error('Browser notification failed:', error);
        return false;
      }
    },
  };
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Convenience functions for different alert levels
 */
export const alertInfo = (title: string, message: string, metadata?: Record<string, any>) =>
  sendAlert('info', title, message, metadata);

export const alertWarning = (title: string, message: string, metadata?: Record<string, any>) =>
  sendAlert('warning', title, message, metadata);

export const alertError = (title: string, message: string, metadata?: Record<string, any>) =>
  sendAlert('error', title, message, metadata);

export const alertCritical = (title: string, message: string, metadata?: Record<string, any>) =>
  sendAlert('critical', title, message, metadata);

/**
 * Initialize alert system with environment variables
 */
export function initializeAlerts() {
  // Register Slack channel if webhook URL is provided
  const slackWebhook = import.meta.env.VITE_SLACK_WEBHOOK_URL;
  if (slackWebhook) {
    registerAlertChannel(createSlackChannel(slackWebhook));
  }

  // Register email channel if API endpoint is provided
  const emailEndpoint = import.meta.env.VITE_EMAIL_API_ENDPOINT;
  const emailApiKey = import.meta.env.VITE_EMAIL_API_KEY;
  if (emailEndpoint) {
    registerAlertChannel(createEmailChannel(emailEndpoint, emailApiKey));
  }

  // Register webhook channel if URL is provided
  const webhookUrl = import.meta.env.VITE_ALERT_WEBHOOK_URL;
  const webhookApiKey = import.meta.env.VITE_ALERT_WEBHOOK_API_KEY;
  if (webhookUrl) {
    registerAlertChannel(createWebhookChannel(webhookUrl, webhookApiKey));
  }

  // Register browser notifications (only if user has granted permission)
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    registerAlertChannel(createBrowserNotificationChannel());
  }
}

/**
 * Get count of enabled alert channels
 */
export function getEnabledChannelCount(): number {
  return alertChannels.filter((c) => c.enabled).length;
}

/**
 * Get list of enabled channels
 */
export function getEnabledChannels(): string[] {
  return alertChannels.filter((c) => c.enabled).map((c) => c.name);
}
