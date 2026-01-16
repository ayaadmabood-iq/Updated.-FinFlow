import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateScheduledTask, unauthorizedResponse, logAuthAttempt } from '../_shared/internal-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY: Validate scheduled task authentication (cron or shared secret)
  const authResult = validateScheduledTask(req);
  logAuthAttempt('reset-monthly-quotas', authResult);

  if (!authResult.isAuthorized) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the reset_monthly_usage SQL function
    const { error: resetError } = await supabase.rpc('reset_monthly_usage');

    if (resetError) {
      console.error('Error resetting monthly usage:', resetError);
      throw resetError;
    }

    

    // Log to audit_logs
    const { error: auditError } = await supabase.from('audit_logs').insert({
      user_id: '00000000-0000-0000-0000-000000000000', // System user
      user_name: 'System',
      action: 'reset_monthly_quota',
      resource_type: 'system',
      resource_id: 'monthly-quota-reset',
      resource_name: 'Monthly Quota Reset',
      details: {
        quota: 'processing',
        scope: 'all_users',
        timestamp: new Date().toISOString(),
      },
    });

    if (auditError) {
      console.warn('Failed to create audit log entry:', auditError);
      // Don't fail the reset if audit log fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Monthly quota reset completed',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to reset monthly quotas';
    console.error('Error in reset-monthly-quotas:', errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
