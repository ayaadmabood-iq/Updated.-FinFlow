import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CancelTrainingRequest {
  jobId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.user.id;
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, userId, 'default', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { jobId } = await req.json() as CancelTrainingRequest;

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'jobId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get job and verify ownership
    const { data: job, error: jobError } = await supabase
      .from('training_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (jobError || !job) {
      console.error('Job fetch error:', jobError);
      return new Response(JSON.stringify({ error: 'Training job not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if job can be cancelled
    const cancellableStatuses = ['pending', 'queued', 'uploading', 'validating', 'running', 'paused', 'training'];
    if (!cancellableStatuses.includes(job.status)) {
      return new Response(JSON.stringify({ 
        error: `Cannot cancel job with status: ${job.status}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // If we have a provider job ID, try to cancel at OpenAI
    if (job.provider_job_id && job.provider === 'openai') {
      // We need to get the API key from user_api_keys
      const { data: apiKeyRecord } = await serviceClient
        .from('user_api_keys')
        .select('openai_key_encrypted')
        .eq('user_id', userId)
        .single();

      if (apiKeyRecord?.openai_key_encrypted) {
        try {
          const cancelResponse = await fetch(
            `https://api.openai.com/v1/fine_tuning/jobs/${job.provider_job_id}/cancel`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKeyRecord.openai_key_encrypted}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!cancelResponse.ok) {
            const errorData = await cancelResponse.json();
            console.warn('OpenAI cancel failed:', errorData);
            // Continue with local cancellation even if OpenAI fails
          } else {
            console.log(`Cancelled OpenAI job: ${job.provider_job_id}`);
          }
        } catch (error) {
          console.warn('Error cancelling OpenAI job:', error);
          // Continue with local cancellation
        }
      }
    }

    // Update job status to cancelled
    const { error: updateError } = await serviceClient
      .from('training_jobs')
      .update({
        status: 'cancelled',
        error_message: 'Cancelled by user',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Job update error:', updateError);
      throw new Error('Failed to update training job status');
    }

    // Update dataset status back to ready
    if (job.dataset_id) {
      await serviceClient
        .from('training_datasets')
        .update({ status: 'ready' })
        .eq('id', job.dataset_id);
    }

    console.log(`Cancelled training job: ${jobId}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Training job cancelled successfully',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Cancel training error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
