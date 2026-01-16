// ============= Indexing Executor v3 =============
// Responsibility: Generate embeddings for document and chunks
// Input: documentId, projectId (references only)
// Output: StageResult<IndexingResultData>
// v3: Batch embedding support for improved performance and cost tracking
// SECURITY: Only callable by pipeline-orchestrator or other internal functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateInternalCall, unauthorizedResponse, logAuthAttempt } from '../_shared/internal-auth.ts';
import {
  validateIndexingInput,
  buildStageResult,
  EXECUTOR_CONTRACTS,
  type StageResult,
  type IndexingResultData,
  type IndexingInput,
  type UsageMetrics,
} from '../_shared/execution-contracts.ts';
import {
  createServiceClient,
  corsResponse,
  successResponse,
  getDocumentText,
  callOpenAIEmbedding,
  callOpenAIEmbeddingBatch,
  hasOpenAIAPI,
} from '../_shared/executor-utils.ts';
import {
  EMBEDDING_MODEL,
  EMBEDDING_MODEL_VERSION,
  EMBEDDING_VECTOR_DIMENSION,
  updateAfterIndexing,
  updateChunkEmbeddingMetadata,
} from '../_shared/artifact-registry.ts';
import {
  calculateEmbeddingCost,
  buildEmbeddingUsage,
} from '../_shared/cost-calculator.ts';

const VERSION = EXECUTOR_CONTRACTS.indexing.version;
const MAX_DOC_EMBEDDING_LENGTH = 25000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  console.log(`[indexing-executor:${VERSION}] Request ${requestId} started`);

  // SECURITY: Validate internal authentication
  const authResult = validateInternalCall(req);
  logAuthAttempt('indexing-executor', authResult, requestId);

  if (!authResult.isAuthorized) {
    return unauthorizedResponse(authResult.error);
  }

  // Track usage across all embedding calls
  let totalTokensUsed = 0;

  try {
    const input: unknown = await req.json();

    // Validate input contract strictly
    const validation = validateIndexingInput(input);
    if (!validation.valid) {
      console.error(`[indexing-executor:${VERSION}] ${requestId} - Contract violation: ${validation.errors.join(', ')}`);
      const result = buildStageResult<IndexingResultData>(
        false,
        VERSION,
        startTime,
        undefined,
        `Contract validation failed: ${validation.errors.join(', ')}`
      );
      return successResponse(result);
    }

    const { documentId } = input as IndexingInput;
    const supabase = createServiceClient();

    // Check if OpenAI API is available
    if (!hasOpenAIAPI()) {
      console.log(`[indexing-executor:${VERSION}] ${requestId} - OpenAI API not configured, skipping embeddings`);
      const result = buildStageResult<IndexingResultData>(
        true,
        VERSION,
        startTime,
        {
          documentEmbedding: false,
          chunkEmbeddingsCount: 0,
          embeddedChunkIds: [],
          embeddingModel: 'none',
          embeddingModelVersion: 'n/a',
        },
        undefined,
        { additionalInfo: { skippedReason: 'no_api_key' } }
      );
      return successResponse(result);
    }

    let documentEmbedding = false;
    const embeddedChunkIds: string[] = [];

    // Generate document embedding from extracted_text (reference-based)
    const { text: cleanedText, error: textError } = await getDocumentText(supabase, documentId);
    if (!textError && cleanedText) {
      const truncatedText = cleanedText.substring(0, MAX_DOC_EMBEDDING_LENGTH);
      const { embedding, error: embError, tokensUsed } = await callOpenAIEmbedding(truncatedText);
      totalTokensUsed += tokensUsed;

      if (!embError && embedding) {
        const { error: updateError } = await supabase
          .from('documents')
          .update({ embedding: JSON.stringify(embedding) })
          .eq('id', documentId);

        if (!updateError) {
          documentEmbedding = true;
          console.log(`[indexing-executor:${VERSION}] ${requestId} - Document embedding created (${tokensUsed} tokens)`);
        }
      } else {
        console.warn(`[indexing-executor:${VERSION}] ${requestId} - Document embedding failed: ${embError}`);
      }
    }

    // Fetch all chunks for batch processing
    const { data: chunks } = await supabase
      .from('chunks')
      .select('id, content')
      .eq('document_id', documentId)
      .order('index', { ascending: true });

    if (chunks && chunks.length > 0) {
      console.log(`[indexing-executor:${VERSION}] ${requestId} - Batch processing ${chunks.length} chunks`);

      // Extract content for batch embedding
      const contents = chunks.map(c => c.content);
      
      // Call batch embedding API
      const { embeddings, errors, totalTokensUsed: batchTokens } = await callOpenAIEmbeddingBatch(contents);
      totalTokensUsed += batchTokens;

      console.log(`[indexing-executor:${VERSION}] ${requestId} - Batch embedding completed (${batchTokens} tokens)`);

      // Update chunks with embeddings
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];
        const error = errors[i];

        if (!error && embedding) {
          const { error: updateError } = await supabase
            .from('chunks')
            .update({ 
              embedding: JSON.stringify(embedding),
              embedding_model: EMBEDDING_MODEL,
              embedding_model_version: EMBEDDING_MODEL_VERSION,
              vector_dimension: EMBEDDING_VECTOR_DIMENSION,
            })
            .eq('id', chunk.id);

          if (!updateError) {
            embeddedChunkIds.push(chunk.id);
          }
        } else {
          console.warn(`[indexing-executor:${VERSION}] ${requestId} - Chunk ${chunk.id} embedding failed: ${error}`);
        }
      }
    }

    // Update artifact registry
    await updateAfterIndexing(supabase, documentId, embeddedChunkIds, documentEmbedding);

    console.log(`[indexing-executor:${VERSION}] ${requestId} - Embedded ${embeddedChunkIds.length} chunks with ${EMBEDDING_MODEL}`);

    // Calculate cost
    const usageMetrics: UsageMetrics = {
      promptTokens: totalTokensUsed,
      completionTokens: 0,
      totalTokens: totalTokensUsed,
      estimatedCostUsd: calculateEmbeddingCost(EMBEDDING_MODEL, totalTokensUsed).totalCost,
      model: EMBEDDING_MODEL,
    };

    const result = buildStageResult<IndexingResultData>(
      true,
      VERSION,
      startTime,
      {
        documentEmbedding,
        chunkEmbeddingsCount: embeddedChunkIds.length,
        embeddedChunkIds,
        embeddingModel: EMBEDDING_MODEL,
        embeddingModelVersion: EMBEDDING_MODEL_VERSION,
      },
      undefined,
      {
        additionalInfo: { 
          totalChunks: chunks?.length || 0,
          successRate: chunks?.length ? (embeddedChunkIds.length / chunks.length) : 1,
          totalTokensUsed,
          batchProcessed: true,
        },
      },
      usageMetrics
    );

    return successResponse(result);

  } catch (error) {
    console.error(`[indexing-executor:${VERSION}] ${requestId} - Error:`, error);
    const result = buildStageResult<IndexingResultData>(
      false,
      VERSION,
      startTime,
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return successResponse(result);
  }
});