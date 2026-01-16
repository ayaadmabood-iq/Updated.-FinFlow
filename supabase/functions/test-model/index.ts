import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { executeAIRequest } from "../_shared/unified-ai-executor.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestModelRequest {
  modelId: string;
  systemPrompt: string;
  userMessage: string;
  projectId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, user.id, 'generate', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { modelId, systemPrompt, userMessage, projectId }: TestModelRequest = await req.json();

    if (!modelId || !userMessage) {
      return new Response(
        JSON.stringify({ error: 'Model ID and user message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is a fine-tuned model (starts with 'ft:')
    const isFineTunedModel = modelId.startsWith('ft:');

    if (isFineTunedModel) {
      // For fine-tuned models, we need the user's own OpenAI API key
      const { data: apiKeyData, error: keyError } = await supabase
        .from('user_api_keys')
        .select('openai_key_encrypted')
        .eq('user_id', user.id)
        .maybeSingle();

      if (keyError) {
        console.error('Error fetching API key:', keyError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch API key' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!apiKeyData?.openai_key_encrypted) {
        return new Response(
          JSON.stringify({ error: 'No OpenAI API key configured. Please add your API key in the Training settings.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Decrypt API key (simple base64 for demo)
      const apiKey = atob(apiKeyData.openai_key_encrypted);

      // Use unified executor with custom API key for fine-tuned models
      const aiResult = await executeAIRequest({
        userId: user.id,
        projectId: projectId || 'test-model',
        operation: 'test_model',
        userInput: userMessage,
        systemPrompt: systemPrompt || 'You are a helpful assistant.',
        model: modelId,
        customApiKey: apiKey,
        temperature: 0.7,
        maxTokens: 1024,
      });

      if (aiResult.blocked) {
        return new Response(
          JSON.stringify({ 
            error: 'Request was blocked due to security concerns',
            reason: aiResult.reason,
            blocked: true 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          response: aiResult.response,
          usage: aiResult.usage,
          cost: aiResult.cost,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For standard models, use unified executor with Lovable API
    // Map OpenAI model names to Lovable-supported models
    const modelMapping: Record<string, string> = {
      'gpt-4o': 'google/gemini-2.5-pro',
      'gpt-4o-mini': 'google/gemini-2.5-flash',
      'gpt-3.5-turbo': 'google/gemini-2.5-flash-lite',
    };

    const mappedModel = modelMapping[modelId] || 'google/gemini-2.5-flash';

    // ✅ PROTECTED: Use unified AI executor with prompt injection protection
    const aiResult = await executeAIRequest({
      userId: user.id,
      projectId: projectId || 'test-model',
      operation: 'test_model',
      userInput: userMessage,
      systemPrompt: systemPrompt || 'You are a helpful assistant.',
      model: mappedModel,
      temperature: 0.7,
      maxTokens: 1024,
    });

    if (aiResult.blocked) {
      return new Response(
        JSON.stringify({ 
          error: 'Request was blocked due to security concerns',
          reason: aiResult.reason,
          blocked: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!aiResult.success) {
      return new Response(
        JSON.stringify({ error: aiResult.error || 'AI request failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        response: aiResult.response,
        usage: aiResult.usage,
        cost: aiResult.cost,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in test-model function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
