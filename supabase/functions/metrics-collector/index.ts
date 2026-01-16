import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateInternalCall, unauthorizedResponse, logAuthAttempt } from '../_shared/internal-auth.ts';

interface Metric {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY: Validate internal authentication
  const authResult = validateInternalCall(req);
  logAuthAttempt('metrics-collector', authResult);

  if (!authResult.isAuthorized) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { metrics } = await req.json() as { metrics: Metric[] };

    if (!Array.isArray(metrics) || metrics.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid metrics data' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Batch insert metrics
    const metricsToInsert = metrics.map(metric => ({
      name: metric.name,
      value: metric.value,
      tags: metric.tags || {},
      timestamp: metric.timestamp ? new Date(metric.timestamp).toISOString() : new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('metrics')
      .insert(metricsToInsert);

    if (error) {
      console.error('Error storing metrics:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to store metrics', details: error.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[Metrics] Stored ${metrics.length} metrics`);

    return new Response(
      JSON.stringify({ success: true, count: metrics.length }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in metrics-collector:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
