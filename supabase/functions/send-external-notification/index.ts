import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateInternalCall, unauthorizedResponse, logAuthAttempt } from '../_shared/internal-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

interface NotificationPayload {
  user_id: string;
  project_id?: string;
  event_type: 'document_processed' | 'research_complete' | 'conflict_detected' | 'error' | 'custom';
  title: string;
  message: string;
  data?: Record<string, any>;
  providers?: ('slack' | 'microsoft_teams')[];
}

// Format message for Slack
function formatSlackMessage(payload: NotificationPayload): Record<string, any> {
  const emoji = {
    document_processed: ':white_check_mark:',
    research_complete: ':mag:',
    conflict_detected: ':warning:',
    error: ':x:',
    custom: ':bell:'
  }[payload.event_type] || ':bell:';

  const color = {
    document_processed: '#36a64f',
    research_complete: '#2196F3',
    conflict_detected: '#ff9800',
    error: '#f44336',
    custom: '#9c27b0'
  }[payload.event_type] || '#9c27b0';

  return {
    attachments: [{
      color,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *${payload.title}*\n${payload.message}`
          }
        },
        ...(payload.data ? [{
          type: 'context',
          elements: Object.entries(payload.data).slice(0, 5).map(([key, value]) => ({
            type: 'mrkdwn',
            text: `*${key}:* ${String(value).substring(0, 100)}`
          }))
        }] : [])
      ]
    }]
  };
}

// Format message for Microsoft Teams
function formatTeamsMessage(payload: NotificationPayload): Record<string, any> {
  const themeColor = {
    document_processed: '36a64f',
    research_complete: '2196F3',
    conflict_detected: 'ff9800',
    error: 'f44336',
    custom: '9c27b0'
  }[payload.event_type] || '9c27b0';

  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor,
    summary: payload.title,
    sections: [{
      activityTitle: payload.title,
      activitySubtitle: new Date().toISOString(),
      text: payload.message,
      facts: payload.data ? Object.entries(payload.data).slice(0, 5).map(([name, value]) => ({
        name,
        value: String(value).substring(0, 100)
      })) : []
    }]
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY: Validate internal authentication
  const authResult = validateInternalCall(req);
  logAuthAttempt('send-external-notification', authResult);

  if (!authResult.isAuthorized) {
    return unauthorizedResponse(authResult.error);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: NotificationPayload = await req.json();
    const results: Array<{ provider: string; success: boolean; error?: string }> = [];

    // Get active integrations for the user
    let query = supabase
      .from('integrations')
      .select('*')
      .eq('user_id', payload.user_id)
      .eq('status', 'active')
      .in('provider', ['slack', 'microsoft_teams']);

    if (payload.project_id) {
      query = query.or(`project_id.eq.${payload.project_id},project_id.is.null`);
    }

    const { data: integrations, error: intError } = await query;

    if (intError) {
      throw new Error(`Failed to fetch integrations: ${intError.message}`);
    }

    // Filter by requested providers if specified
    const targetIntegrations = payload.providers 
      ? integrations?.filter(i => payload.providers!.includes(i.provider as 'slack' | 'microsoft_teams'))
      : integrations;

    for (const integration of targetIntegrations || []) {
      // Check if this event type is enabled for the integration
      const webhookEvents = integration.webhook_events || [];
      if (webhookEvents.length > 0 && !webhookEvents.includes(payload.event_type) && !webhookEvents.includes('all')) {
        continue;
      }

      const webhookUrl = integration.webhook_url;
      if (!webhookUrl) {
        results.push({ provider: integration.provider, success: false, error: 'No webhook URL configured' });
        continue;
      }

      try {
        let body: Record<string, any>;
        
        if (integration.provider === 'slack') {
          body = formatSlackMessage(payload);
        } else if (integration.provider === 'microsoft_teams') {
          body = formatTeamsMessage(payload);
        } else {
          body = { title: payload.title, message: payload.message, data: payload.data };
        }

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        results.push({ provider: integration.provider, success: true });

        // Log success event
        await supabase.from('integration_events').insert({
          user_id: payload.user_id,
          project_id: payload.project_id,
          integration_id: integration.id,
          provider: integration.provider,
          event_type: 'notification_sent',
          title: `Notification sent to ${integration.provider}`,
          description: payload.title,
          metadata: { event_type: payload.event_type },
          status: 'success'
        });

      } catch (error) {
        const errMsg = (error as Error).message;
        results.push({ provider: integration.provider, success: false, error: errMsg });

        // Log failure event
        await supabase.from('integration_events').insert({
          user_id: payload.user_id,
          project_id: payload.project_id,
          integration_id: integration.id,
          provider: integration.provider,
          event_type: 'notification_failed',
          title: `Failed to send notification to ${integration.provider}`,
          description: errMsg,
          metadata: { event_type: payload.event_type },
          status: 'error',
          error_message: errMsg
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: results.every(r => r.success),
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Send external notification error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
