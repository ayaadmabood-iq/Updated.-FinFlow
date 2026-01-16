import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { executeAIRequest } from "../_shared/unified-ai-executor.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface TransformRequest {
  contentId?: string;
  text: string;
  transformation: 
    | "professional"
    | "casual"
    | "simplify"
    | "formal_arabic"
    | "technical"
    | "concise"
    | "expand"
    | "translate"
    | "custom";
  targetLanguage?: string;
  customInstructions?: string;
  projectId?: string;
}

const TRANSFORMATION_PROMPTS: Record<string, string> = {
  professional: `Rewrite the following text to be more professional and business-appropriate. 
Maintain the core message while:
- Using formal vocabulary
- Removing casual expressions
- Ensuring clarity and precision
- Keeping a respectful, authoritative tone`,

  casual: `Rewrite the following text in a casual, conversational tone.
Maintain the core message while:
- Using everyday language
- Adding a friendly, approachable feel
- Keeping it engaging and relatable
- Shortening sentences where appropriate`,

  simplify: `Simplify the following text for a non-technical audience.
Guidelines:
- Replace jargon with plain language
- Break complex ideas into simpler concepts
- Use shorter sentences
- Add brief explanations for any necessary technical terms
- Target a general reader with no specialized knowledge`,

  formal_arabic: `Translate and adapt the following text to Formal Modern Standard Arabic (الفصحى).
Guidelines:
- Use proper MSA grammar and vocabulary
- Maintain formal register appropriate for official documents
- Ensure cultural appropriateness
- Keep technical terms with Arabic equivalents where available
- Preserve the original meaning and intent`,

  technical: `Rewrite the following text for a technical audience.
Guidelines:
- Use precise technical terminology
- Add relevant technical details
- Maintain accuracy and specificity
- Include industry-standard terms
- Structure for technical documentation`,

  concise: `Condense the following text while preserving all key information.
Guidelines:
- Remove redundancy
- Combine related points
- Use active voice
- Cut unnecessary modifiers
- Aim for 50% reduction in length`,

  expand: `Expand the following text with more detail and context.
Guidelines:
- Add relevant examples
- Elaborate on key points
- Include supporting evidence
- Maintain the original structure
- Add transitions for better flow
- Aim for 2x the original length`,

  translate: `Translate the following text accurately to the target language.
Guidelines:
- Maintain the original meaning and intent
- Use appropriate idioms in the target language
- Preserve formatting and structure
- Keep proper nouns unchanged unless there's a common translation`,

  custom: `Transform the following text according to the user's specific instructions.`,
};

function computeSimpleDiff(original: string, transformed: string): { additions: number; deletions: number; similarity: number } {
  const originalWords = original.toLowerCase().split(/\s+/);
  const transformedWords = transformed.toLowerCase().split(/\s+/);
  
  const originalSet = new Set(originalWords);
  const transformedSet = new Set(transformedWords);
  
  let common = 0;
  for (const word of transformedSet) {
    if (originalSet.has(word)) common++;
  }
  
  const additions = transformedWords.length - common;
  const deletions = originalWords.length - common;
  const similarity = common / Math.max(originalSet.size, transformedSet.size);
  
  return { additions, deletions, similarity: Math.round(similarity * 100) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, user.id, 'generate', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: TransformRequest = await req.json();
    const { contentId, text, transformation, targetLanguage, customInstructions, projectId } = body;

    if (!text || !transformation) {
      return new Response(
        JSON.stringify({ error: "text and transformation are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build transformation prompt
    let systemPrompt = TRANSFORMATION_PROMPTS[transformation] || TRANSFORMATION_PROMPTS.custom;
    
    if (transformation === "translate" && targetLanguage) {
      systemPrompt += `\n\nTarget language: ${targetLanguage}`;
    }
    
    if (transformation === "custom" && customInstructions) {
      systemPrompt += `\n\nUser instructions: ${customInstructions}`;
    }

    // ✅ PROTECTED: Use unified AI executor with prompt injection protection
    const aiResult = await executeAIRequest({
      userId: user.id,
      projectId: projectId || 'content-transform',
      operation: 'content_generation',
      userInput: `Transform this text:\n\n${text}`,
      systemPrompt,
      model: 'google/gemini-3-flash-preview',
      temperature: 0.5,
      maxTokens: 2000,
    });

    if (aiResult.blocked) {
      console.warn('Content transformation blocked:', aiResult.reason);
      return new Response(JSON.stringify({
        error: 'Content transformation was blocked',
        reason: aiResult.reason,
        blocked: true,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!aiResult.success || !aiResult.response) {
      throw new Error(aiResult.error || 'AI transformation failed');
    }

    const transformedText = aiResult.response;
    const diff = computeSimpleDiff(text, transformedText);

    // If contentId provided, save a version
    if (contentId) {
      const { data: existingContent } = await supabase
        .from("generated_content")
        .select("id")
        .eq("id", contentId)
        .single();

      if (existingContent) {
        // Get current version number
        const { count } = await supabase
          .from("content_versions")
          .select("*", { count: "exact", head: true })
          .eq("generated_content_id", contentId);

        // Save new version
        await supabase.from("content_versions").insert({
          generated_content_id: contentId,
          user_id: user.id,
          content: transformedText,
          version_number: (count || 0) + 1,
          changes_summary: `${transformation} transformation applied`,
          diff_from_previous: diff,
        });

        // Update main content
        await supabase
          .from("generated_content")
          .update({
            content: transformedText,
            tokens_used: aiResult.usage.totalTokens,
          })
          .eq("id", contentId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        transformedText,
        diff,
        usage: aiResult.usage,
        cost: aiResult.cost,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in transform-content:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
