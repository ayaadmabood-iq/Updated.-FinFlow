// ============= Process Document v6 - Wrapper =============
// This function is now a thin wrapper that delegates to pipeline-orchestrator.
// All processing logic has been moved to the orchestrator for a single execution path.
// This ensures consistent queue-based processing with proper rate limiting.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkIdempotency,
  createIdempotencyKey,
  storeIdempotencyResult,
  markIdempotencyFailed,
  getIdempotencyKey,
  isValidIdempotencyKey,
} from '../_shared/idempotency.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[process-document:v6-wrapper] Request ${requestId} - Delegating to pipeline-orchestrator`);

  try {
    // Forward auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { documentId, resumeFrom, forceReprocess } = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get document details for enqueue
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for idempotency
    const idempotencyKey = getIdempotencyKey(req);

    if (idempotencyKey && isValidIdempotencyKey(idempotencyKey)) {
      const { isIdempotent, cachedResponse } = await checkIdempotency(
        supabase,
        idempotencyKey,
        user.id
      );

      if (isIdempotent && cachedResponse) {
        console.log(`[process-document:v6-wrapper] ${requestId} - Returning cached response (idempotency replay)`);
        return new Response(cachedResponse.response, {
          status: cachedResponse.status_code,
          headers: {
            ...corsHeaders,
            'X-Idempotency-Replay': 'true',
            'Content-Type': 'application/json'
          }
        });
      }

      // Create key to mark as processing
      await createIdempotencyKey(supabase, idempotencyKey, user.id);
    }

    // Fetch document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, project_id, storage_path, owner_id, status')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: 'Document not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delegate to pipeline-orchestrator with enqueue action
    const { data: orchestratorResult, error: orchestratorError } = await supabase.functions.invoke(
      'pipeline-orchestrator',
      {
        body: {
          action: 'enqueue',
          documentId: document.id,
          projectId: document.project_id,
          storagePath: document.storage_path,
          ownerId: document.owner_id,
          forceReprocess: forceReprocess || false,
          priority: 0,
        },
        headers: {
          Authorization: authHeader,
        },
      }
    );

    if (orchestratorError) {
      console.error(`[process-document:v6-wrapper] ${requestId} Orchestrator error:`, orchestratorError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: orchestratorError.message || 'Failed to enqueue document' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[process-document:v6-wrapper] ${requestId} Successfully delegated to orchestrator`);

    // Prepare response data
    const responseData = {
      success: true,
      documentId: document.id,
      jobId: orchestratorResult?.jobId,
      message: 'Document queued for processing via pipeline-orchestrator',
      // Legacy fields for backward compatibility
      chunkCount: 0, // Will be updated when processing completes
      extractedLength: 0,
    };

    // Store idempotency result if key was provided
    if (idempotencyKey) {
      await storeIdempotencyResult(supabase, idempotencyKey, user.id, {
        response: JSON.stringify(responseData),
        statusCode: 200,
        headers: corsHeaders,
      });
    }

    // Return response in legacy format for backward compatibility
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[process-document:v6-wrapper] ${requestId} Error:`, error);

    // Mark idempotency as failed if key was provided
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
          const idempotencyKey = getIdempotencyKey(req);
          if (idempotencyKey) {
            await markIdempotencyFailed(
              supabase,
              idempotencyKey,
              user.id,
              error instanceof Error ? error.message : 'Unknown error'
            );
          }
        }
      }
    } catch (idempotencyError) {
      console.error('Failed to mark idempotency as failed:', idempotencyError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
