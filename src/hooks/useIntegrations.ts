import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationService, Integration, ApiKey, IntegrationEvent, IntegrationProvider } from '@/services/integrationService';
import { toast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

// Integrations hooks
export function useIntegrations(projectId?: string) {
  return useQuery({
    queryKey: ['integrations', projectId],
    queryFn: () => integrationService.getIntegrations(projectId),
  });
}

export function useCreateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      provider: IntegrationProvider;
      project_id?: string;
      display_name?: string;
      webhook_url?: string;
      webhook_events?: string[];
      config?: Record<string, unknown>;
    }) => integrationService.createIntegration(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast({
        title: 'Integration created',
        description: 'Your integration has been set up successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create integration',
        description: error.message,
      });
    },
  });
}

export function useUpdateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Integration> }) =>
      integrationService.updateIntegration(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast({
        title: 'Integration updated',
        description: 'Your integration has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update integration',
        description: error.message,
      });
    },
  });
}

export function useDeleteIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => integrationService.deleteIntegration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast({
        title: 'Integration deleted',
        description: 'The integration has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to delete integration',
        description: error.message,
      });
    },
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: (integrationId: string) => integrationService.testWebhook(integrationId),
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Webhook test successful',
          description: 'The webhook endpoint is responding correctly.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Webhook test failed',
          description: result.error || 'The webhook endpoint did not respond correctly.',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Webhook test failed',
        description: error.message,
      });
    },
  });
}

// API Keys hooks
export function useApiKeys(projectId?: string) {
  return useQuery({
    queryKey: ['apiKeys', projectId],
    queryFn: () => integrationService.getApiKeys(projectId),
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      name: string;
      project_id?: string;
      scopes?: string[];
      rate_limit_per_minute?: number;
      rate_limit_per_day?: number;
      expires_at?: string;
    }) => integrationService.createApiKey(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create API key',
        description: error.message,
      });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => integrationService.revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast({
        title: 'API key revoked',
        description: 'The API key has been revoked and can no longer be used.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to revoke API key',
        description: error.message,
      });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => integrationService.deleteApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast({
        title: 'API key deleted',
        description: 'The API key has been permanently deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to delete API key',
        description: error.message,
      });
    },
  });
}

// Integration Events hooks
export function useIntegrationEvents(params?: {
  project_id?: string;
  limit?: number;
  event_type?: string;
}) {
  return useQuery({
    queryKey: ['integrationEvents', params],
    queryFn: () => integrationService.getEvents(params),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useRealtimeEvents(projectId?: string) {
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = integrationService.subscribeToEvents(
      (event) => {
        setEvents(prev => [event, ...prev].slice(0, 100));
        queryClient.invalidateQueries({ queryKey: ['integrationEvents'] });
      },
      projectId
    );

    return unsubscribe;
  }, [projectId, queryClient]);

  return events;
}
