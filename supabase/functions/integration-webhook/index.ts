import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verify Slack signature
async function verifySlackSignature(
  body: string, 
  timestamp: string, 
  signature: string, 
  signingSecret: string
): Promise<boolean> {
  const baseString = `v0:${timestamp}:${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(baseString));
  const computedSignature = 'v0=' + Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return computedSignature === signature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const provider = pathParts[1]; // e.g., 'google-drive', 'gmail', 'slack'
    const integrationId = pathParts[2];

    console.log(`Webhook received for provider: ${provider}, integration: ${integrationId}`);

    if (provider === 'google-drive') {
      // Handle Google Drive push notification
      const channelId = req.headers.get('x-goog-channel-id');
      const resourceState = req.headers.get('x-goog-resource-state');

      if (resourceState === 'sync') {
        // Initial sync confirmation
        return new Response('OK', { status: 200, headers: corsHeaders });
      }

      if (resourceState === 'change') {
        // Get integration details
        const { data: integration, error: intError } = await supabase
          .from('integrations')
          .select('*')
          .eq('id', integrationId)
          .eq('provider', 'google_drive')
          .single();

        if (intError || !integration) {
          console.error('Integration not found:', integrationId);
          return new Response('Integration not found', { status: 404, headers: corsHeaders });
        }

        // Log the webhook event
        await supabase.from('integration_events').insert({
          user_id: integration.user_id,
          project_id: integration.project_id,
          integration_id: integration.id,
          provider: 'google_drive',
          event_type: 'webhook_received',
          title: 'Google Drive change detected',
          description: 'New file activity detected in watched folder',
          metadata: { channel_id: channelId, resource_state: resourceState },
          status: 'success'
        });

        // Note: Full Drive sync would require fetching changes API
        // This is a placeholder for the webhook handling structure

        return new Response('OK', { status: 200, headers: corsHeaders });
      }
    }

    if (provider === 'gmail') {
      // Handle Gmail push notification (Pub/Sub)
      const body = await req.json();
      
      if (body.message?.data) {
        const decodedData = JSON.parse(atob(body.message.data));
        const historyId = decodedData.historyId;
        const emailAddress = decodedData.emailAddress;

        // Find integration by email
        const { data: integrations } = await supabase
          .from('integrations')
          .select('*')
          .eq('provider', 'gmail')
          .eq('status', 'active');

        for (const integration of integrations || []) {
          if (integration.config?.email === emailAddress) {
            await supabase.from('integration_events').insert({
              user_id: integration.user_id,
              project_id: integration.project_id,
              integration_id: integration.id,
              provider: 'gmail',
              event_type: 'webhook_received',
              title: 'New Gmail activity detected',
              description: `History ID: ${historyId}`,
              metadata: { history_id: historyId, email: emailAddress },
              status: 'success'
            });
          }
        }

        return new Response('OK', { status: 200, headers: corsHeaders });
      }
    }

    if (provider === 'slack') {
      // Handle Slack events
      const bodyText = await req.text();
      const body = JSON.parse(bodyText);

      // URL verification challenge
      if (body.type === 'url_verification') {
        return new Response(body.challenge, { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
        });
      }

      // Verify signature if we have signing secret
      const slackSigningSecret = Deno.env.get('SLACK_SIGNING_SECRET');
      if (slackSigningSecret) {
        const timestamp = req.headers.get('x-slack-request-timestamp') || '';
        const signature = req.headers.get('x-slack-signature') || '';
        
        const isValid = await verifySlackSignature(bodyText, timestamp, signature, slackSigningSecret);
        if (!isValid) {
          return new Response('Invalid signature', { status: 401, headers: corsHeaders });
        }
      }

      // Handle event callbacks
      if (body.type === 'event_callback') {
        const event = body.event;
        
        // Find integration by team ID
        const { data: integration } = await supabase
          .from('integrations')
          .select('*')
          .eq('provider', 'slack')
          .eq('status', 'active')
          .contains('config', { team_id: body.team_id })
          .single();

        if (integration) {
          await supabase.from('integration_events').insert({
            user_id: integration.user_id,
            project_id: integration.project_id,
            integration_id: integration.id,
            provider: 'slack',
            event_type: `slack_${event.type}`,
            title: `Slack event: ${event.type}`,
            description: JSON.stringify(event).substring(0, 200),
            metadata: { event_type: event.type, team_id: body.team_id },
            status: 'success'
          });
        }

        return new Response('OK', { status: 200, headers: corsHeaders });
      }
    }

    // Generic webhook handler for custom integrations
    if (integrationId) {
      const { data: integration } = await supabase
        .from('integrations')
        .select('*')
        .eq('id', integrationId)
        .single();

      if (integration) {
        const body = await req.json().catch(() => ({}));
        
        await supabase.from('integration_events').insert({
          user_id: integration.user_id,
          project_id: integration.project_id,
          integration_id: integration.id,
          provider: integration.provider,
          event_type: 'webhook_received',
          title: `Webhook received from ${integration.provider}`,
          description: 'Custom webhook payload received',
          metadata: { body, headers: Object.fromEntries(req.headers) },
          status: 'success'
        });

        return new Response('OK', { status: 200, headers: corsHeaders });
      }
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
