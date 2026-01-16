import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-call.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, user.id, 'search', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { query, projectId, sourceLanguage, targetLanguage } = await req.json();

    if (!query || !projectId) {
      return new Response(JSON.stringify({ error: 'Missing query or projectId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Translate query using centralized AI call
    let translatedQuery = query;
    if (sourceLanguage !== targetLanguage) {
      const translatePrompt = sourceLanguage === 'ar'
        ? `Translate this Arabic text to English. Only output the translation, nothing else: "${query}"`
        : `Translate this English text to Arabic. Only output the translation, nothing else: "${query}"`;

      const result = await callAI({
        taskType: 'translation',
        userContent: translatePrompt,
        projectId,
        userId: user.id,
        maxTokens: 500,
        temperature: 0.3,
      }, supabase);

      if (result.success && result.content) {
        translatedQuery = result.content.trim();
      }
    }

    // Cache the translation
    await supabase.from('cross_language_queries').insert({
      project_id: projectId,
      user_id: user.id,
      source_query: query,
      source_language: sourceLanguage || 'auto',
      translated_query: translatedQuery,
      target_language: targetLanguage || 'auto',
    });

    return new Response(JSON.stringify({
      success: true,
      originalQuery: query,
      translatedQuery,
      sourceLanguage,
      targetLanguage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Cross-language search error:', message, error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
