import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateInternalCall, unauthorizedResponse, logAuthAttempt } from '../_shared/internal-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

interface NotificationPayload {
  user_id: string;
  type: 'processing_complete' | 'processing_failed' | 'quota_warning' | 'quota_exceeded';
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY: Validate internal authentication
  const authResult = validateInternalCall(req);
  logAuthAttempt('send-notification', authResult);

  if (!authResult.isAuthorized) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();
    

    // Validate required fields
    if (!payload.user_id || !payload.type || !payload.title || !payload.message) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: user_id, type, title, message' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      );
    }

    // Validate notification type
    const validTypes = ['processing_complete', 'processing_failed', 'quota_warning', 'quota_exceeded'];
    if (!validTypes.includes(payload.type)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      );
    }

    // Insert notification
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: payload.user_id,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting notification:', error);
      throw error;
    }

    

    return new Response(
      JSON.stringify({ success: true, notification: data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 201 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send notification';
    console.error('Error in send-notification:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
