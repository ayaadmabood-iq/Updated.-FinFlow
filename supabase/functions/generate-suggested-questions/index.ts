import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { executeAIRequest } from "../_shared/unified-ai-executor.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface SuggestedQuestion {
  question: string;
  category: string;
}

serve(async (req) => {
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, user.id, 'generate', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { documentId } = await req.json();

    if (!documentId) {
      return new Response(JSON.stringify({ error: 'documentId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get document with summary
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, name, summary, extracted_text, language, owner_id, project_id')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify ownership
    if (document.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build content for question generation
    const content = document.summary || 
      (document.extracted_text ? document.extracted_text.substring(0, 2000) : '');

    if (!content) {
      return new Response(JSON.stringify({ 
        suggestions: [],
        message: 'Document has no content to generate questions from'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Detect language
    const isArabic = document.language === 'ar' || /[\u0600-\u06FF]/.test(content);
    const languageInstruction = isArabic
      ? 'Generate questions in Arabic.'
      : 'Generate questions in English.';

    const userPrompt = `Document: "${document.name}"\n\nContent:\n${content}\n\nGenerate 3 suggested questions about this document.`;

    // ✅ PROTECTED: Use unified AI executor with prompt injection protection
    const aiResult = await executeAIRequest({
      userId: user.id,
      projectId: document.project_id || 'system',
      operation: 'suggested_questions',
      userInput: userPrompt,
      systemPrompt: `You are a helpful assistant that generates relevant questions about documents.
${languageInstruction}
Generate exactly 3 insightful questions that a user might want to ask about this document.
Categories should be one of: summary, details, analysis, comparison, clarification.

Respond with a JSON array of objects with "question" and "category" fields.
Example: [{"question": "What are the main findings?", "category": "summary"}]`,
      model: 'google/gemini-3-flash-preview',
      temperature: 0.7,
      maxTokens: 500,
      tools: [
        {
          type: "function",
          function: {
            name: "suggest_questions",
            description: "Return 3 suggested questions for the document",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      category: { 
                        type: "string", 
                        enum: ["summary", "details", "analysis", "comparison", "clarification"]
                      }
                    },
                    required: ["question", "category"],
                    additionalProperties: false
                  }
                }
              },
              required: ["suggestions"],
              additionalProperties: false
            }
          }
        }
      ],
      toolChoice: { type: "function", function: { name: "suggest_questions" } },
    });

    if (aiResult.blocked) {
      console.warn('Question generation blocked:', aiResult.reason);
      return new Response(JSON.stringify({
        error: 'Question generation was blocked',
        reason: aiResult.reason,
        blocked: true,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse suggestions from tool calls or response
    let suggestions: SuggestedQuestion[] = [];

    if (aiResult.toolCalls && Array.isArray(aiResult.toolCalls)) {
      const toolCall = aiResult.toolCalls[0] as { function?: { arguments?: string } };
      if (toolCall?.function?.arguments) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          suggestions = args.suggestions || [];
        } catch (e) {
          console.error('Failed to parse tool call arguments:', e);
        }
      }
    } else if (aiResult.response) {
      // Try to parse from response
      try {
        const jsonMatch = aiResult.response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('Failed to parse suggestions from response:', e);
      }
    }

    // Ensure we have valid suggestions
    suggestions = suggestions.slice(0, 3).map(s => ({
      question: String(s.question || ''),
      category: String(s.category || 'summary'),
    })).filter(s => s.question.length > 0);

    return new Response(JSON.stringify({ 
      suggestions,
      usage: aiResult.usage,
      cost: aiResult.cost,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-suggested-questions:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
