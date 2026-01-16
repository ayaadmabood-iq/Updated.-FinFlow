// ============= Training Data Generator with AI Safety Guards =============
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from '../_shared/ai-call.ts';
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";
import {
  checkIdempotency,
  createIdempotencyKey,
  storeIdempotencyResult,
  markIdempotencyFailed,
  getIdempotencyKey,
  isValidIdempotencyKey,
} from '../_shared/idempotency.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface GenerateRequest {
  projectId: string;
  datasetName: string;
  format: 'openai' | 'anthropic' | 'alpaca' | 'sharegpt';
  mode: 'auto' | 'qa' | 'instruction' | 'conversation';
  systemPrompt?: string;
  documentIds?: string[];
}

interface TrainingPair {
  system?: string;
  user: string;
  assistant: string;
  sourceChunkId?: string;
  sourceDocumentId?: string;
  tokenCount: number;
  qualityScore: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for idempotency
    const idempotencyKey = getIdempotencyKey(req);

    if (idempotencyKey && isValidIdempotencyKey(idempotencyKey)) {
      const { isIdempotent, cachedResponse } = await checkIdempotency(
        supabase,
        idempotencyKey,
        user.id
      );

      if (isIdempotent && cachedResponse) {
        console.log('Returning cached training data generation response (idempotency replay)');
        return new Response(cachedResponse.response, {
          status: cachedResponse.status_code,
          headers: {
            ...corsHeaders,
            'X-Idempotency-Replay': 'true',
            'Content-Type': 'application/json'
          }
        });
      }

      // Create key to mark as processing
      await createIdempotencyKey(supabase, idempotencyKey, user.id);
    }

    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, user.id, 'generate', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const request: GenerateRequest = await req.json();
    const { projectId, datasetName, format, mode, systemPrompt, documentIds } = request;

    console.log(`Generating training data for project ${projectId}, format: ${format}, mode: ${mode}`);

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: dataset, error: datasetError } = await supabase
      .from('training_datasets')
      .insert({
        project_id: projectId,
        user_id: user.id,
        name: datasetName,
        format,
        pair_generation_mode: mode,
        system_prompt: systemPrompt,
        status: 'generating',
      })
      .select()
      .single();

    if (datasetError) {
      console.error('Dataset creation error:', datasetError);
      throw new Error('Failed to create dataset');
    }

    let documentsQuery = supabase
      .from('documents')
      .select('id, name, extracted_text, summary, language, quality_score')
      .eq('project_id', projectId)
      .eq('owner_id', user.id)
      .eq('status', 'ready')
      .is('deleted_at', null);

    if (documentIds && documentIds.length > 0) {
      documentsQuery = documentsQuery.in('id', documentIds);
    }

    const { data: documents, error: docsError } = await documentsQuery;

    if (docsError || !documents || documents.length === 0) {
      await supabase
        .from('training_datasets')
        .update({ status: 'failed', error_message: 'No documents found' })
        .eq('id', dataset.id);
      
      return new Response(JSON.stringify({ error: 'No ready documents found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${documents.length} documents`);

    const { data: chunks, error: chunksError } = await supabase
      .from('chunks')
      .select('id, document_id, content, quality_score, is_duplicate')
      .in('document_id', documents.map(d => d.id))
      .eq('is_duplicate', false)
      .order('document_id')
      .order('index');

    if (chunksError) {
      throw new Error('Failed to fetch chunks');
    }

    console.log(`Found ${chunks?.length || 0} non-duplicate chunks`);

    const allPairs: TrainingPair[] = [];
    
    for (const doc of documents) {
      const docChunks = chunks?.filter(c => c.document_id === doc.id) || [];
      
      for (const chunk of docChunks) {
        try {
          const pairs = await generatePairsFromChunk(
            chunk.content,
            mode,
            systemPrompt,
            doc.name,
            chunk.id,
            doc.id,
            chunk.quality_score,
            projectId,
            user.id
          );
          allPairs.push(...pairs);
        } catch (err) {
          console.error(`Failed to generate pairs for chunk ${chunk.id}:`, err);
        }
      }
    }

    console.log(`Generated ${allPairs.length} training pairs`);

    if (allPairs.length > 0) {
      const pairInserts = allPairs.map(pair => ({
        dataset_id: dataset.id,
        system_message: pair.system,
        user_message: pair.user,
        assistant_message: pair.assistant,
        source_chunk_id: pair.sourceChunkId,
        source_document_id: pair.sourceDocumentId,
        token_count: pair.tokenCount,
        quality_score: pair.qualityScore,
        is_valid: true,
      }));

      const { error: pairsError } = await supabase
        .from('training_pairs')
        .insert(pairInserts);

      if (pairsError) {
        console.error('Pairs insert error:', pairsError);
      }
    }

    const jsonlContent = generateJsonl(allPairs, format, systemPrompt);
    const totalTokens = allPairs.reduce((sum, p) => sum + p.tokenCount, 0);
    const estimatedCost = calculateEstimatedCost(totalTokens, format);
    const validationResult = validateDataset(allPairs, format);

    await supabase
      .from('training_datasets')
      .update({
        status: 'ready',
        total_pairs: allPairs.length,
        total_tokens: totalTokens,
        estimated_cost: estimatedCost,
        jsonl_content: jsonlContent,
        validation_result: validationResult,
        generated_at: new Date().toISOString(),
      })
      .eq('id', dataset.id);

    // Prepare response data
    const responseData = {
      success: true,
      datasetId: dataset.id,
      totalPairs: allPairs.length,
      totalTokens,
      estimatedCost,
      validation: validationResult,
    };

    // Store idempotency result if key was provided
    if (idempotencyKey) {
      await storeIdempotencyResult(supabase, idempotencyKey, user.id, {
        response: JSON.stringify(responseData),
        statusCode: 200,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Generation error:', error);

    // Mark idempotency as failed if key was provided
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
          const idempotencyKey = getIdempotencyKey(req);
          if (idempotencyKey) {
            await markIdempotencyFailed(
              supabase,
              idempotencyKey,
              user.id,
              error instanceof Error ? error.message : 'Generation failed'
            );
          }
        }
      }
    } catch (idempotencyError) {
      console.error('Failed to mark idempotency as failed:', idempotencyError);
    }

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Generation failed',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Generate training pairs using centralized AI call
async function generatePairsFromChunk(
  content: string,
  mode: string,
  systemPrompt: string | undefined,
  documentName: string,
  chunkId: string,
  documentId: string,
  chunkQuality: number | null,
  projectId: string,
  userId: string
): Promise<TrainingPair[]> {
  const modePrompts: Record<string, string> = {
    auto: `Analyze the document content and generate appropriate question-answer pairs, instructions, or conversational exchanges based on what fits best.`,
    qa: `Generate question and answer pairs from the document content. Create questions that someone might ask about this topic and provide accurate answers based on the content.`,
    instruction: `Generate instruction-response pairs from the document content. Create clear instructions/tasks and provide helpful responses based on the content.`,
    conversation: `Generate natural conversational exchanges from the document content. Create realistic user messages and helpful assistant responses.`,
  };

  const aiSystemPrompt = `## GENERATION GUIDELINES
${modePrompts[mode] || modePrompts.auto}

Generate 1-3 high-quality training pairs from the provided document content.

Return a JSON array of objects with this structure:
[
  {
    "user": "The user's message or question",
    "assistant": "The assistant's helpful response"
  }
]

Rules:
- Each pair must be self-contained and make sense independently
- Responses should be informative and accurate based on the document FACTS only
- Avoid generic or trivial pairs
- Keep responses focused and concise
- Only return valid JSON, no other text`;

  const result = await callAI({
    taskType: 'training_data',
    systemPrompt: aiSystemPrompt,
    userContent: `Source document: ${documentName}\n\n---BEGIN DOCUMENT CONTENT---\n${content.substring(0, 3000)}\n---END DOCUMENT CONTENT---`,
    projectId,
    userId,
  }, supabase);

  if (!result.success || !result.content) {
    console.error('AI generation failed:', result.error);
    return [];
  }

  let pairs: Array<{ user: string; assistant: string }> = [];
  try {
    const jsonMatch = result.content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      pairs = JSON.parse(jsonMatch[0]);
    }
  } catch {
    console.error('Failed to parse AI response:', result.content);
    return [];
  }

  return pairs.map(pair => ({
    system: systemPrompt,
    user: pair.user,
    assistant: pair.assistant,
    sourceChunkId: chunkId,
    sourceDocumentId: documentId,
    tokenCount: estimateTokens(pair.user + pair.assistant),
    qualityScore: chunkQuality || 0.7,
  }));
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function generateJsonl(
  pairs: TrainingPair[],
  format: string,
  systemPrompt?: string
): string {
  const lines = pairs.map(pair => {
    switch (format) {
      case 'openai':
        return JSON.stringify({
          messages: [
            ...(pair.system ? [{ role: 'system', content: pair.system }] : []),
            { role: 'user', content: pair.user },
            { role: 'assistant', content: pair.assistant },
          ],
        });

      case 'anthropic':
        return JSON.stringify({
          prompt: `${pair.system ? pair.system + '\n\n' : ''}Human: ${pair.user}\n\nAssistant:`,
          completion: ` ${pair.assistant}`,
        });

      case 'alpaca':
        return JSON.stringify({
          instruction: pair.user,
          input: '',
          output: pair.assistant,
        });

      case 'sharegpt':
        return JSON.stringify({
          conversations: [
            ...(pair.system ? [{ from: 'system', value: pair.system }] : []),
            { from: 'human', value: pair.user },
            { from: 'gpt', value: pair.assistant },
          ],
        });

      default:
        return JSON.stringify({
          system: pair.system,
          user: pair.user,
          assistant: pair.assistant,
        });
    }
  });

  return lines.join('\n');
}

function calculateEstimatedCost(totalTokens: number, format: string): number {
  const costPerMillionTokens: Record<string, number> = {
    openai: 8.0,
    anthropic: 15.0,
    alpaca: 0,
    sharegpt: 0,
  };

  const rate = costPerMillionTokens[format] || 8.0;
  return (totalTokens / 1000000) * rate;
}

function validateDataset(
  pairs: TrainingPair[],
  format: string
): { valid: boolean; errors: string[]; warnings: string[]; stats: Record<string, number> } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (pairs.length < 10) {
    errors.push(`Minimum 10 training examples required, got ${pairs.length}`);
  }

  const emptyPairs = pairs.filter(p => !p.user.trim() || !p.assistant.trim());
  if (emptyPairs.length > 0) {
    errors.push(`${emptyPairs.length} pairs have empty user or assistant messages`);
  }

  const shortResponses = pairs.filter(p => p.assistant.length < 20);
  if (shortResponses.length > pairs.length * 0.2) {
    warnings.push(`${shortResponses.length} pairs have very short responses (<20 chars)`);
  }

  const uniquePairs = new Set(pairs.map(p => p.user.toLowerCase().trim()));
  if (uniquePairs.size < pairs.length * 0.9) {
    warnings.push(`Potential duplicate questions detected`);
  }

  const avgTokens = pairs.length > 0 
    ? Math.round(pairs.reduce((s, p) => s + p.tokenCount, 0) / pairs.length)
    : 0;
  const avgQuality = pairs.length > 0
    ? Math.round(pairs.reduce((s, p) => s + p.qualityScore, 0) / pairs.length * 100) / 100
    : 0;

  if (format === 'openai') {
    const longPairs = pairs.filter(p => p.tokenCount > 4096);
    if (longPairs.length > 0) {
      warnings.push(`${longPairs.length} pairs exceed 4096 tokens`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalPairs: pairs.length,
      avgTokensPerPair: avgTokens,
      avgQualityScore: avgQuality,
      uniqueQuestions: uniquePairs.size,
    },
  };
}
