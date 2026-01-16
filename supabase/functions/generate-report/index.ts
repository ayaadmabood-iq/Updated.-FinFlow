import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { executeAIRequest } from "../_shared/unified-ai-executor.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

interface TemplateSection {
  id: string;
  title: string;
  title_ar: string;
  prompt: string;
  order: number;
}

interface GenerateReportRequest {
  projectId: string;
  templateId: string;
  documentIds: string[];
  reportName: string;
  language?: 'auto' | 'en' | 'ar';
}

interface SectionResult {
  section_id: string;
  title: string;
  content: string;
  sources: { document_id: string; chunk_ids: string[] }[];
}

// Detect if text is Arabic
function isArabic(text: string): boolean {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  return arabicPattern.test(text);
}

// ✅ PROTECTED: Call AI using unified executor
async function callAI(
  systemPrompt: string,
  userPrompt: string,
  _isArabicContext: boolean,
  userId: string,
  projectId: string
): Promise<{ content: string; tokens: number; cost: number }> {
  const result = await executeAIRequest({
    userId,
    projectId,
    operation: 'report_generation',
    userInput: userPrompt,
    systemPrompt,
    model: 'google/gemini-2.5-flash',
    temperature: 0.5,
    maxTokens: 4000,
  });

  if (result.blocked) {
    throw new Error(`Request blocked: ${result.reason}`);
  }

  return {
    content: result.response || '',
    tokens: result.usage.totalTokens,
    cost: result.cost,
  };
}

// Get relevant chunks using hybrid search
async function getRelevantChunks(
  supabase: any,
  documentIds: string[],
  sectionPrompt: string,
  limit = 15
): Promise<{ chunks: any[]; chunkIds: string[] }> {
  // Use semantic search to find relevant chunks
  const { data: searchResults, error } = await supabase.rpc('hybrid_search_documents', {
    search_query: sectionPrompt,
    project_id_filter: null,
    similarity_threshold: 0.5,
    keyword_weight: 0.3,
    result_limit: limit * 2,
  });

  if (error) {
    console.error('Search error:', error);
    return { chunks: [], chunkIds: [] };
  }

  // Filter to only include chunks from selected documents
  const filteredChunks = (searchResults || []).filter((chunk: any) =>
    documentIds.includes(chunk.document_id)
  ).slice(0, limit);

  return {
    chunks: filteredChunks,
    chunkIds: filteredChunks.map((c: any) => c.id),
  };
}

// Generate a single section
async function generateSection(
  supabase: any,
  section: TemplateSection,
  documentIds: string[],
  projectContext: string,
  language: string,
  isArabicContext: boolean
): Promise<{ result: SectionResult; tokens: number }> {
  // Get relevant chunks for this section
  const { chunks, chunkIds } = await getRelevantChunks(supabase, documentIds, section.prompt);

  // Build context from chunks
  const chunksContext = chunks.map((c: any, i: number) =>
    `[Source ${i + 1}: ${c.document_name || 'Document'}]\n${c.content}`
  ).join('\n\n---\n\n');

  // Build the system prompt
  const languageInstruction = language === 'ar' || (language === 'auto' && isArabicContext)
    ? 'Respond in Arabic. Use proper Arabic formatting and right-to-left text conventions.'
    : 'Respond in English.';

  const systemPrompt = `You are an expert document analyst and report writer. 
${languageInstruction}
When using information from the sources, cite them using [Source N] notation.
Focus on synthesizing information across sources to avoid redundancy.
Use a formal, professional tone.
Format your response in clean Markdown.`;

  const sectionTitle = isArabicContext ? section.title_ar : section.title;

  const userPrompt = `## Project Context
${projectContext}

## Task
${section.prompt}

## Available Sources
${chunksContext || 'No relevant sources found for this section.'}

Generate the content for the section titled "${sectionTitle}". Be thorough but concise.`;

  const { content, tokens } = await callAI(systemPrompt, userPrompt, isArabicContext);

  // Group sources by document
  const sourcesByDoc: Record<string, string[]> = {};
  chunks.forEach((c: any) => {
    if (!sourcesByDoc[c.document_id]) {
      sourcesByDoc[c.document_id] = [];
    }
    sourcesByDoc[c.document_id].push(c.id);
  });

  const sources = Object.entries(sourcesByDoc).map(([docId, chunkIds]) => ({
    document_id: docId,
    chunk_ids: chunkIds,
  }));

  return {
    result: {
      section_id: section.id,
      title: sectionTitle,
      content,
      sources,
    },
    tokens,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

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
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;
    const {
      projectId,
      templateId,
      documentIds,
      reportName,
      language = 'auto'
    }: GenerateReportRequest = await req.json();

    console.log(`Starting report generation for project ${projectId}`);

    // Validate inputs
    if (!projectId || !templateId || !documentIds?.length || !reportName) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, description')
      .eq('id', projectId)
      .eq('owner_id', userId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: 'Project not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('report_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return new Response(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get documents info
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, name, summary, extracted_text')
      .in('id', documentIds)
      .eq('owner_id', userId);

    if (docsError || !documents?.length) {
      return new Response(JSON.stringify({ error: 'Documents not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create report record
    const { data: report, error: reportError } = await supabase
      .from('generated_reports')
      .insert({
        project_id: projectId,
        template_id: templateId,
        user_id: userId,
        name: reportName,
        status: 'generating',
        source_document_ids: documentIds,
        language,
      })
      .select()
      .single();

    if (reportError) {
      console.error('Error creating report:', reportError);
      return new Response(JSON.stringify({ error: 'Failed to create report' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine language context
    const sampleText = documents.map(d => d.summary || d.extracted_text?.slice(0, 500) || '').join(' ');
    const isArabicContext = language === 'ar' || (language === 'auto' && isArabic(sampleText));

    // Build project context
    const projectContext = `Project: ${project.name}
Description: ${project.description || 'No description provided'}
Documents: ${documents.map(d => d.name).join(', ')}`;

    // Parse template sections
    const sections: TemplateSection[] = template.sections as TemplateSection[];
    const sortedSections = sections.sort((a, b) => a.order - b.order);

    // Generate each section
    const sectionResults: SectionResult[] = [];
    let totalTokens = 0;

    for (const section of sortedSections) {
      console.log(`Generating section: ${section.title}`);
      
      try {
        const { result, tokens } = await generateSection(
          supabase,
          section,
          documentIds,
          projectContext,
          language,
          isArabicContext
        );
        sectionResults.push(result);
        totalTokens += tokens;

        // Update progress in report
        await supabase
          .from('generated_reports')
          .update({
            sections_data: sectionResults,
            total_tokens_used: totalTokens,
          })
          .eq('id', report.id);

      } catch (sectionError) {
        console.error(`Error generating section ${section.title}:`, sectionError);
        sectionResults.push({
          section_id: section.id,
          title: isArabicContext ? section.title_ar : section.title,
          content: `*Error generating this section. Please try regenerating.*`,
          sources: [],
        });
      }
    }

    // Build final markdown
    const reportTitle = `# ${reportName}`;
    const reportMeta = `
*Generated on ${new Date().toLocaleDateString(isArabicContext ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}*

**Project:** ${project.name}  
**Sources:** ${documents.length} document(s)

---
`;

    const sectionsMarkdown = sectionResults.map(s =>
      `## ${s.title}\n\n${s.content}`
    ).join('\n\n---\n\n');

    const footer = `
---

*Generated by FineFlow • ${new Date().toISOString()}*
`;

    const contentMarkdown = `${reportTitle}\n\n${reportMeta}\n\n${sectionsMarkdown}\n\n${footer}`;

    // Calculate cost (approximate)
    const costUsd = totalTokens * 0.00002; // Rough estimate

    // Update report with final content
    const generationTimeMs = Date.now() - startTime;
    
    const { error: updateError } = await supabase
      .from('generated_reports')
      .update({
        status: 'ready',
        content_markdown: contentMarkdown,
        sections_data: sectionResults,
        total_tokens_used: totalTokens,
        generation_cost_usd: costUsd,
        generation_time_ms: generationTimeMs,
        completed_at: new Date().toISOString(),
      })
      .eq('id', report.id);

    if (updateError) {
      console.error('Error updating report:', updateError);
    }

    console.log(`Report ${report.id} generated in ${generationTimeMs}ms, ${totalTokens} tokens`);

    return new Response(JSON.stringify({
      success: true,
      reportId: report.id,
      contentMarkdown,
      sectionsData: sectionResults,
      totalTokens,
      generationTimeMs,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Report generation error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
