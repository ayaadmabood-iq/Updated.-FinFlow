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

// Service role client ONLY for token validation
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Validate token and get user id
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const id = body?.id as string | undefined;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing body.id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // User-scoped client (RLS should apply) by forwarding the user's JWT
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Fetch owner_id as seen under RLS
    const { data: doc, error: selectError } = await supabaseUser
      .from('documents')
      .select('id, owner_id, deleted_at')
      .eq('id', id)
      .maybeSingle();

    // Attempt the same soft-delete update
    const { data: updated, error: updateError } = await supabaseUser
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, owner_id, deleted_at')
      .maybeSingle();

    return new Response(
      JSON.stringify({
        ok: !updateError,
        userId: user.id,
        document: doc ?? null,
        updated: updated ?? null,
        selectError: selectError
          ? {
              message: selectError.message,
              details: selectError.details,
              hint: selectError.hint,
              code: selectError.code,
            }
          : null,
        updateError: updateError
          ? {
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint,
              code: updateError.code,
            }
          : null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('debug-documents-rls error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
