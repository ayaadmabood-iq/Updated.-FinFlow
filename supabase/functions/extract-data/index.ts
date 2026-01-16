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

interface ExtractionField {
  name: string;
  type: 'string' | 'number' | 'date' | 'currency';
  description: string;
}

interface ExtractDataRequest {
  projectId: string;
  documentIds: string[];
  extractionName: string;
  fields: ExtractionField[];
}

interface ExtractedRow {
  document_id: string;
  document_name: string;
  values: Record<string, unknown>;
}

// Extract data from a single document using unified AI executor
async function extractFromDocument(
  document: { id: string; name: string; extracted_text: string | null; summary: string | null },
  fields: ExtractionField[],
  userId: string,
  projectId: string
): Promise<{ row: ExtractedRow; tokens: number; cost: number }> {
  const fieldDescriptions = fields.map(f =>
    `- ${f.name} (${f.type}): ${f.description}`
  ).join('\n');

  const documentText = document.extracted_text || document.summary || 'No text content available.';
  
  const userPrompt = `Extract the following fields from this document:

Fields to extract:
${fieldDescriptions}

Document: "${document.name}"
Content:
${documentText.slice(0, 8000)}

Return a JSON object with field names as keys and extracted values. 
For fields not found, use null.
For currency, include the value as a number (no symbols).
For dates, use ISO format (YYYY-MM-DD).

Example output:
{
  "field_name": "value",
  "amount": 1500.00,
  "date": "2024-01-15"
}`;

  // ✅ PROTECTED: Use unified AI executor with prompt injection protection
  const result = await executeAIRequest({
    userId,
    projectId,
    operation: 'data_extraction',
    userInput: userPrompt,
    systemPrompt: `You are a data extraction expert. Extract structured data from documents.
Output ONLY valid JSON in the exact format specified. No additional text.`,
    model: 'google/gemini-2.5-flash',
    temperature: 0.2,
    maxTokens: 2000,
  });

  if (result.blocked) {
    console.warn('Data extraction blocked:', result.reason);
    throw new Error(`Extraction blocked: ${result.reason}`);
  }

  if (!result.success || !result.response) {
    throw new Error(result.error || 'AI extraction failed');
  }

  // Parse the JSON response
  let extractedValues: Record<string, unknown> = {};
  try {
    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      extractedValues = JSON.parse(jsonMatch[0]);
    }
  } catch (parseError) {
    console.error('Failed to parse extraction response:', parseError);
  }

  return {
    row: {
      document_id: document.id,
      document_name: document.name,
      values: extractedValues,
    },
    tokens: result.usage.totalTokens,
    cost: result.cost,
  };
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

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { projectId, documentIds, extractionName, fields }: ExtractDataRequest = await req.json();

    if (!projectId || !documentIds?.length || !fields?.length) {
      throw new Error('Missing required fields: projectId, documentIds, fields');
    }

    // Verify project access
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found or access denied');
    }

    // Fetch documents
    const { data: documents, error: docError } = await supabaseClient
      .from('documents')
      .select('id, name, extracted_text, summary')
      .in('id', documentIds)
      .eq('project_id', projectId);

    if (docError || !documents) {
      throw new Error('Failed to fetch documents');
    }

    // Create extraction job record
    const { data: extraction, error: extractionError } = await supabaseClient
      .from('data_extractions')
      .insert({
        project_id: projectId,
        user_id: user.id,
        name: extractionName || 'Untitled Extraction',
        fields: fields,
        source_document_ids: documentIds,
        status: 'processing',
      })
      .select()
      .single();

    if (extractionError) {
      throw new Error('Failed to create extraction record');
    }

    // Extract from each document
    const results: ExtractedRow[] = [];
    let totalTokens = 0;
    let totalCost = 0;
    const errors: string[] = [];

    for (const doc of documents) {
      try {
        const { row, tokens, cost } = await extractFromDocument(
          doc,
          fields,
          user.id,
          projectId
        );
        results.push(row);
        totalTokens += tokens;
        totalCost += cost;
      } catch (docErr) {
        const errorMsg = docErr instanceof Error ? docErr.message : 'Unknown error';
        errors.push(`${doc.name}: ${errorMsg}`);
        console.error(`Extraction failed for ${doc.name}:`, docErr);
      }
    }

    // Update extraction record with results
    await supabaseClient
      .from('data_extractions')
      .update({
        status: errors.length === documents.length ? 'failed' : 'completed',
        extracted_data: results,
        total_tokens_used: totalTokens,
        extraction_cost_usd: totalCost,
        completed_at: new Date().toISOString(),
        error_message: errors.length > 0 ? errors.join('; ') : null,
      })
      .eq('id', extraction.id);

    return new Response(JSON.stringify({
      success: true,
      extractionId: extraction.id,
      results,
      totalTokens,
      totalCost,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in extract-data:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
