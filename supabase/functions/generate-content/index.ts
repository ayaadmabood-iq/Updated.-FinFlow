import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { captureException } from "../_shared/sentry.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface GenerateContentRequest {
  projectId: string;
  documentIds: string[];
  targetFormat: string;
  title: string;
  tone?: string;
  language?: string;
  instructions?: string;
  customFormatDescription?: string;
  sourceText?: string;
}

interface Slide {
  slideNumber: number;
  title: string;
  bulletPoints: string[];
  suggestedVisuals: string;
  speakerNotes: string;
}

interface PresentationOutline {
  title: string;
  totalSlides: number;
  slides: Slide[];
}

const FORMAT_PROMPTS: Record<string, string> = {
  presentation_outline: `You are an expert presentation designer. Create a structured slide-by-slide outline for a professional presentation.

For each slide, provide:
- Slide number and title
- 3-5 bullet points (concise, impactful)
- Suggested visual (chart type, image concept, diagram idea)
- Speaker notes

Return a JSON object with this structure:
{
  "title": "Presentation Title",
  "totalSlides": number,
  "slides": [
    {
      "slideNumber": 1,
      "title": "Slide Title",
      "bulletPoints": ["Point 1", "Point 2", "Point 3"],
      "suggestedVisuals": "Description of visual element",
      "speakerNotes": "What to say during this slide"
    }
  ]
}`,

  linkedin_post: `You are a LinkedIn content strategist. Create an engaging LinkedIn post that will drive engagement and provide value.

Structure:
- Hook (first line to grab attention)
- Main content (insights, story, or value)
- Call to action
- Relevant hashtags (3-5)

Keep it professional but personable. Use line breaks for readability.`,

  twitter_thread: `You are a Twitter/X content strategist. Create a compelling thread.

Structure:
- Tweet 1: Hook (must grab attention immediately)
- Tweets 2-8: Main points (one key insight per tweet)
- Final tweet: Conclusion with CTA

Each tweet must be under 280 characters. Number them clearly (1/, 2/, etc.).`,

  executive_memo: `You are a senior executive communications specialist. Create a formal executive memo.

Structure:
- TO, FROM, DATE, RE headers
- Executive Summary (2-3 sentences)
- Background/Context
- Key Findings/Recommendations
- Next Steps
- Attachments/References (if applicable)

Use formal business language. Be concise and action-oriented.`,

  blog_post: `You are a professional content writer. Create a well-structured blog post.

Structure:
- Compelling headline
- Introduction with hook
- Main sections with subheadings (H2)
- Key takeaways or bullet points
- Conclusion with CTA

Aim for ~800-1200 words. Make it informative and engaging.`,

  email_draft: `You are a professional email writer. Create a clear, effective email.

Structure:
- Subject line
- Greeting
- Purpose statement (first paragraph)
- Key details/body
- Clear next steps or ask
- Professional closing

Keep it concise and action-oriented.`,

  contract_draft: `You are a legal document specialist. Create a draft contract or legal document.

Include:
- Parties involved
- Recitals/Background
- Key terms and definitions
- Main clauses and provisions
- Obligations of each party
- Term and termination
- Signatures section

Use clear legal language. Include placeholder brackets [FILL IN] where specific details are needed.`,

  report_summary: `You are a business analyst. Create a comprehensive report summary.

Structure:
- Executive Summary
- Key Metrics/Findings
- Analysis and Insights
- Recommendations
- Appendix (data sources, methodology)

Use bullet points and tables where appropriate. Focus on actionable insights.`,

  meeting_notes: `You are a professional meeting facilitator. Create structured meeting notes.

Structure:
- Meeting Details (date, attendees, duration)
- Agenda Items Covered
- Key Discussion Points
- Decisions Made
- Action Items (with owners and deadlines)
- Next Steps

Be clear and concise. Focus on outcomes and accountability.`,

  press_release: `You are a PR specialist. Create a professional press release.

Structure:
- FOR IMMEDIATE RELEASE header
- Headline (attention-grabbing)
- Dateline and lead paragraph (who, what, when, where, why)
- Body paragraphs (supporting details)
- Quote from key stakeholder
- Boilerplate (about the company)
- Contact information

Use AP style. Keep it newsworthy and factual.`,

  custom: `You are a versatile content creator. Generate content based on the user's specific requirements.`,
};

// ✅ PROTECTED: Call AI using unified executor - imported at top
// Note: callAI is now a wrapper that uses executeAIRequest internally
async function callAI(
  systemPrompt: string,
  userPrompt: string,
  _stream = false,
  userId?: string,
  projectId?: string
): Promise<{ content: string; tokens: number; cost: number }> {
  const { executeAIRequest } = await import("../_shared/unified-ai-executor.ts");
  
  const result = await executeAIRequest({
    userId: userId || 'system',
    projectId: projectId || 'content-generation',
    operation: 'content_generation',
    userInput: userPrompt,
    systemPrompt,
    model: 'google/gemini-3-flash-preview',
    temperature: 0.7,
    maxTokens: 4000,
  });

  if (result.blocked) {
    throw new Error(`Content generation blocked: ${result.reason}`);
  }

  return {
    content: result.response || "",
    tokens: result.usage.totalTokens,
    cost: result.cost,
  };
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

    const body: GenerateContentRequest = await req.json();
    const {
      projectId,
      documentIds,
      targetFormat,
      title,
      tone,
      language = "en",
      instructions,
      customFormatDescription,
      sourceText,
    } = body;

    // Verify project access
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather source content from documents
    let combinedContent = sourceText || "";

    if (documentIds && documentIds.length > 0) {
      const { data: documents, error: docsError } = await supabase
        .from("documents")
        .select("id, name, extracted_text, summary")
        .in("id", documentIds);

      if (docsError) {
        console.error("Error fetching documents:", docsError);
      } else if (documents) {
        for (const doc of documents) {
          combinedContent += `\n\n--- Document: ${doc.name} ---\n`;
          if (doc.summary) {
            combinedContent += `Summary: ${doc.summary}\n\n`;
          }
          if (doc.extracted_text) {
            // Limit text per document to avoid token limits
            combinedContent += doc.extracted_text.slice(0, 15000);
          }
        }
      }
    }

    if (!combinedContent.trim()) {
      return new Response(
        JSON.stringify({ error: "No source content provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create the generated content record
    const { data: contentRecord, error: insertError } = await supabase
      .from("generated_content")
      .insert({
        project_id: projectId,
        user_id: user.id,
        source_document_ids: documentIds || [],
        source_text: sourceText,
        title,
        target_format: targetFormat,
        custom_format_description: customFormatDescription,
        tone,
        language,
        instructions,
        status: "generating",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating content record:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create content record" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build the system prompt
    let systemPrompt = FORMAT_PROMPTS[targetFormat] || FORMAT_PROMPTS.custom;

    if (tone) {
      systemPrompt += `\n\nTone: ${tone}`;
    }
    if (language !== "en") {
      systemPrompt += `\n\nOutput language: ${language}`;
    }
    if (customFormatDescription) {
      systemPrompt += `\n\nCustom format requirements: ${customFormatDescription}`;
    }

    // Build user prompt
    let userPrompt = `Create a ${targetFormat.replace(/_/g, " ")} titled "${title}" based on the following source content:\n\n${combinedContent}`;

    if (instructions) {
      userPrompt += `\n\nAdditional instructions: ${instructions}`;
    }

    // Generate content
    const { content: generatedContent, tokens } = await callAI(systemPrompt, userPrompt);

    // Try to parse structured output for presentation_outline
    let structuredOutput: PresentationOutline | null = null;
    if (targetFormat === "presentation_outline") {
      try {
        // Extract JSON from the response
        const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          structuredOutput = JSON.parse(jsonMatch[0]) as PresentationOutline;
        }
      } catch (parseError) {
        console.log("Could not parse structured output:", parseError);
      }
    }

    // Update the record with generated content
    const { error: updateError } = await supabase
      .from("generated_content")
      .update({
        generated_content: generatedContent,
        structured_output: structuredOutput,
        status: "completed",
        tokens_used: tokens,
        generation_cost_usd: tokens * 0.000001, // Rough estimate
        completed_at: new Date().toISOString(),
      })
      .eq("id", contentRecord.id);

    if (updateError) {
      console.error("Error updating content record:", updateError);
    }

    // Create initial version
    await supabase.from("content_versions").insert({
      generated_content_id: contentRecord.id,
      user_id: user.id,
      version_number: 1,
      content: generatedContent,
      structured_output: structuredOutput,
      changes_summary: "Initial generation",
    });

    return new Response(
      JSON.stringify({
        id: contentRecord.id,
        content: generatedContent,
        structuredOutput,
        tokens,
        status: "completed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Generate content error:", message);
    
    // Capture error in Sentry
    await captureException(error as Error, {
      operation: 'generate-content',
    });
    
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
