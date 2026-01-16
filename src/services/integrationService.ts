import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type IntegrationProvider = 'google_drive' | 'gmail' | 'slack' | 'microsoft_teams' | 'webhook';
export type IntegrationStatus = 'pending' | 'active' | 'expired' | 'revoked' | 'error';

export interface Integration {
  id: string;
  user_id: string;
  project_id: string | null;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  config: Record<string, unknown>;
  webhook_url: string | null;
  webhook_events: string[];
  display_name: string | null;
  last_sync_at: string | null;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  project_id: string | null;
  key_prefix: string;
  name: string;
  scopes: string[];
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  last_used_at: string | null;
  usage_count: number;
  is_active: boolean;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

/** Metadata for integration events */
export interface IntegrationEventMetadata {
  source?: string;
  target?: string;
  action?: string;
  resourceUrl?: string;
  [key: string]: unknown;
}

export interface IntegrationEvent {
  id: string;
  user_id: string;
  project_id: string | null;
  integration_id: string | null;
  event_type: string;
  provider: IntegrationProvider | null;
  title: string;
  description: string | null;
  metadata: IntegrationEventMetadata;
  resource_type: string | null;
  resource_id: string | null;
  resource_name: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

// Generate a secure API key
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const prefix = 'ff_';
  let key = prefix;
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Hash API key for storage
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const integrationService = {
  // Get all integrations for a user
  async getIntegrations(projectId?: string): Promise<Integration[]> {
    let query = supabase.from('integrations').select('*').order('created_at', { ascending: false });
    
    if (projectId) {
      query = query.or(`project_id.eq.${projectId},project_id.is.null`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data as Integration[];
  },

  // Create a new integration
  async createIntegration(integration: {
    provider: IntegrationProvider;
    project_id?: string;
    display_name?: string;
    webhook_url?: string;
    webhook_events?: string[];
    config?: Record<string, unknown>;
  }): Promise<Integration> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('integrations')
      .insert({
        provider: integration.provider,
        project_id: integration.project_id || null,
        display_name: integration.display_name || null,
        webhook_url: integration.webhook_url || null,
        webhook_events: integration.webhook_events || [],
        config: integration.config || {},
        status: integration.webhook_url ? 'active' : 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data as Integration;
  },

  // Update an integration
  async updateIntegration(id: string, updates: Partial<Integration>): Promise<Integration> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('integrations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Integration;
  },

  // Delete an integration
  async deleteIntegration(id: string): Promise<void> {
    const { error } = await supabase.from('integrations').delete().eq('id', id);
    if (error) throw error;
  },

  // Test webhook connection
  async testWebhook(integrationId: string): Promise<{ success: boolean; error?: string }> {
    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (!integration?.webhook_url) {
      return { success: false, error: 'No webhook URL configured' };
    }

    try {
      const testPayload = {
        type: 'test',
        message: 'FineFlow webhook test',
        timestamp: new Date().toISOString()
      };

      const response = await fetch(integration.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      return { success: response.ok, error: response.ok ? undefined : `HTTP ${response.status}` };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // API Key Management
  async getApiKeys(projectId?: string): Promise<ApiKey[]> {
    let query = supabase.from('api_keys').select('*').order('created_at', { ascending: false });
    
    if (projectId) {
      query = query.or(`project_id.eq.${projectId},project_id.is.null`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data as ApiKey[];
  },

  async createApiKey(params: {
    name: string;
    project_id?: string;
    scopes?: string[];
    rate_limit_per_minute?: number;
    rate_limit_per_day?: number;
    expires_at?: string;
  }): Promise<{ apiKey: ApiKey; secretKey: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const secretKey = generateApiKey();
    const keyPrefix = secretKey.substring(0, 8);
    const keyHash = await hashApiKey(secretKey);

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        name: params.name,
        project_id: params.project_id,
        scopes: params.scopes || ['ingest:write', 'documents:read'],
        rate_limit_per_minute: params.rate_limit_per_minute || 60,
        rate_limit_per_day: params.rate_limit_per_day || 1000,
        expires_at: params.expires_at
      })
      .select()
      .single();

    if (error) throw error;
    return { apiKey: data as ApiKey, secretKey };
  },

  async revokeApiKey(id: string): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .update({ 
        is_active: false, 
        revoked_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteApiKey(id: string): Promise<void> {
    const { error } = await supabase.from('api_keys').delete().eq('id', id);
    if (error) throw error;
  },

  // Integration Events (Activity Feed)
  async getEvents(params?: {
    project_id?: string;
    limit?: number;
    event_type?: string;
  }): Promise<IntegrationEvent[]> {
    let query = supabase
      .from('integration_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(params?.limit || 50);

    if (params?.project_id) {
      query = query.eq('project_id', params.project_id);
    }
    if (params?.event_type) {
      query = query.eq('event_type', params.event_type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as IntegrationEvent[];
  },

  // Subscribe to real-time events
  subscribeToEvents(
    callback: (event: IntegrationEvent) => void,
    projectId?: string
  ) {
    const channel = supabase
      .channel('integration_events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'integration_events',
          ...(projectId ? { filter: `project_id=eq.${projectId}` } : {})
        },
        (payload) => {
          callback(payload.new as IntegrationEvent);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
