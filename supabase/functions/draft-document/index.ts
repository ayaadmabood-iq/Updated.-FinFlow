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

interface DraftRequest {
  projectId: string;
  sourceDocumentId: string;
  targetDocumentType: string;
  modifications: string;
  title: string;
  additionalContext?: string;
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

    const body: DraftRequest = await req.json();
    const {
      projectId,
      sourceDocumentId,
      targetDocumentType,
      modifications,
      title,
      additionalContext,
    } = body;

    // Fetch source document
    const { data: sourceDoc, error: docError } = await supabase
      .from("documents")
      .select("id, name, extracted_text, summary")
      .eq("id", sourceDocumentId)
      .single();

    if (docError || !sourceDoc) {
      return new Response(JSON.stringify({ error: "Source document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sourceContent = sourceDoc.extracted_text || sourceDoc.summary || "";
    if (!sourceContent) {
      return new Response(
        JSON.stringify({ error: "Source document has no content" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const systemPrompt = `You are an expert document drafter. Create professional documents based on source materials.

Document Type Guidelines:
- Contract: Use formal legal language, include standard clauses, define parties clearly
- Letter: Use professional correspondence format, clear subject, proper salutation/closing
- Memo: Internal communication format, clear purpose, bullet points for key items
- Report: Structured sections, executive summary, findings, recommendations
- Proposal: Problem statement, proposed solution, benefits, timeline, cost
- Summary: Concise overview of key points from source material
- Agreement: Mutual terms, obligations, signatures section
- Policy: Clear rules, scope, enforcement, exceptions`;

    const userPrompt = `Create a ${targetDocumentType} titled "${title}" based on the following source document.

Source Document: "${sourceDoc.name}"
Content:
${sourceContent.slice(0, 6000)}

Modifications/Requirements:
${modifications}

${additionalContext ? `Additional Context:\n${additionalContext}` : ""}

Generate a professional ${targetDocumentType} that:
1. Incorporates relevant information from the source
2. Follows standard formatting for this document type
3. Applies the requested modifications
4. Is ready for review and finalization`;

    // ✅ PROTECTED: Use unified AI executor with prompt injection protection
    const aiResult = await executeAIRequest({
      userId: user.id,
      projectId,
      operation: 'content_generation',
      userInput: userPrompt,
      systemPrompt,
      model: 'google/gemini-3-flash-preview',
      temperature: 0.4,
      maxTokens: 8000,
    });

    if (aiResult.blocked) {
      console.warn('Document draft request blocked:', aiResult.reason);
      return new Response(JSON.stringify({
        error: 'Document draft request was blocked',
        reason: aiResult.reason,
        blocked: true,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!aiResult.success || !aiResult.response) {
      throw new Error(aiResult.error || 'AI generation failed');
    }

    // Save the drafted document
    const { data: newDoc, error: createError } = await supabase
      .from("documents")
      .insert({
        project_id: projectId,
        owner_id: user.id,
        name: title,
        file_type: "draft",
        status: "completed",
        extracted_text: aiResult.response,
        summary: `Draft ${targetDocumentType} based on "${sourceDoc.name}"`,
        processing_status: "completed",
      })
      .select()
      .single();

    if (createError) {
      console.error("Failed to save drafted document:", createError);
      // Return the content even if save fails
      return new Response(
        JSON.stringify({
          success: true,
          content: aiResult.response,
          saved: false,
          error: "Document generated but failed to save",
          usage: aiResult.usage,
          cost: aiResult.cost,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentId: newDoc.id,
        content: aiResult.response,
        saved: true,
        usage: aiResult.usage,
        cost: aiResult.cost,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in draft-document:", error);
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
