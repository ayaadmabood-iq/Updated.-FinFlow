import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { executeAIRequest } from "../_shared/unified-ai-executor.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApplyCorrectionRequest {
  projectId: string;
  goldStandardId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { projectId, goldStandardId }: ApplyCorrectionRequest = await req.json();
    
    if (!projectId || !goldStandardId) {
      throw new Error('Missing required fields: projectId, goldStandardId');
    }

    // Fetch the gold standard answer
    const { data: goldStandard, error: gsError } = await supabaseClient
      .from('gold_standard_answers')
      .select('*')
      .eq('id', goldStandardId)
      .single();

    if (gsError || !goldStandard) {
      throw new Error('Gold standard answer not found');
    }

    // Fetch all unapplied gold standards for this project
    const { data: allGoldStandards, error: allGsError } = await supabaseClient
      .from('gold_standard_answers')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_applied_to_prompt', false);

    if (allGsError) {
      throw new Error('Failed to fetch gold standards');
    }

    // Fetch existing prompt config
    const { data: existingConfig } = await supabaseClient
      .from('project_prompt_configs')
      .select('*')
      .eq('project_id', projectId)
      .single();

    // Use AI to generate improved instructions based on the gold standard
    const correctionsContext = allGoldStandards?.map(gs => 
      `Query: "${gs.query}"\nIncorrect response pattern: "${gs.incorrect_response.substring(0, 200)}..."\nCorrect approach: "${gs.gold_response.substring(0, 200)}..."\nNotes: ${gs.correction_notes || 'N/A'}`
    ).join('\n\n---\n\n');

    const userPrompt = `Based on these user corrections, generate additional instructions to improve the AI's responses.

Current additional instructions:
${existingConfig?.additional_instructions || 'None'}

User corrections to learn from:
${correctionsContext}

Generate a brief set of additional instructions (3-5 bullet points max) that would help the AI avoid these mistakes in the future. Be specific and actionable. Format as a simple list.`;

    // ✅ PROTECTED: Use unified AI executor with prompt injection protection
    const aiResult = await executeAIRequest({
      userId: user.id,
      projectId,
      operation: 'content_generation',
      userInput: userPrompt,
      systemPrompt: 'You are an expert at creating system prompts for AI assistants. Generate concise, actionable instructions that help avoid previous mistakes.',
      model: 'google/gemini-2.5-flash',
      temperature: 0.5,
      maxTokens: 1000,
    });

    if (aiResult.blocked) {
      console.warn('Correction request blocked:', aiResult.reason);
      return new Response(JSON.stringify({
        error: 'Correction request was blocked',
        reason: aiResult.reason,
        blocked: true,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!aiResult.success || !aiResult.response) {
      throw new Error(aiResult.error || 'AI request failed');
    }

    const newInstructions = aiResult.response;

    // Create a learned pattern entry
    const newPattern = {
      id: crypto.randomUUID(),
      query: goldStandard.query,
      incorrectPattern: goldStandard.incorrect_response.substring(0, 500),
      correctApproach: goldStandard.gold_response.substring(0, 500),
      notes: goldStandard.correction_notes,
      learnedAt: new Date().toISOString(),
    };

    const existingPatterns = (existingConfig?.learned_patterns as unknown[]) || [];
    const updatedPatterns = [...existingPatterns, newPattern];

    // Update or create prompt config
    if (existingConfig) {
      const { error: updateError } = await supabaseClient
        .from('project_prompt_configs')
        .update({
          additional_instructions: newInstructions,
          learned_patterns: updatedPatterns,
          version: (existingConfig.version || 1) + 1,
          last_updated_by: user.id,
        })
        .eq('id', existingConfig.id);

      if (updateError) {
        throw new Error('Failed to update prompt config');
      }
    } else {
      const { error: insertError } = await supabaseClient
        .from('project_prompt_configs')
        .insert({
          project_id: projectId,
          user_id: user.id,
          system_prompt: 'You are a helpful AI assistant.',
          additional_instructions: newInstructions,
          learned_patterns: [newPattern],
          version: 1,
          last_updated_by: user.id,
        });

      if (insertError) {
        throw new Error('Failed to create prompt config');
      }
    }

    // Mark gold standard as applied
    await supabaseClient
      .from('gold_standard_answers')
      .update({ is_applied_to_prompt: true })
      .eq('id', goldStandardId);

    return new Response(JSON.stringify({
      success: true,
      newInstructions,
      patternsCount: updatedPatterns.length,
      usage: aiResult.usage,
      cost: aiResult.cost,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in apply-correction:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
