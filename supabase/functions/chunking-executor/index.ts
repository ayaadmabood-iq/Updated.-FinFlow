// ============= Chunking Executor v3 =============
// Responsibility: Create chunks from stored extracted_text
// Supports: Fixed, Sentence, Heuristic Semantic, AI Topic Detection, Embedding Cluster
// Enhanced with entity extraction and enriched metadata
// Input: documentId, projectId, chunkSize, chunkOverlap, chunkStrategy
// Output: StageResult<ChunkingResultData>
// Reads from: documents.extracted_text, documents.original_name, documents.language
// Writes to: chunks table, documents.word_count, documents.quality_score,
//            documents.processing_metadata, documents.enriched_metadata
// Stateless - Internal function protected by shared secret auth
// SECURITY: Only callable by pipeline-orchestrator or other internal functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateInternalCall, unauthorizedResponse, logAuthAttempt } from '../_shared/internal-auth.ts';
import {
  validateChunkingInput,
  buildStageResult,
  EXECUTOR_CONTRACTS,
  type StageResult,
  type ChunkingResultData,
  type ChunkingInput,
} from '../_shared/execution-contracts.ts';
import type { ProcessedChunk } from '../_shared/pipeline-types.ts';
import {
  extractMetadata,
  calculateQualityScore,
  calculateChunkQuality,
  simpleHash,
  createChunksWithStrategy,
} from '../_shared/stage-helpers.ts';
import {
  createServiceClient,
  corsResponse,
  successResponse,
  getDocumentText,
  getDocumentMetadata,
} from '../_shared/executor-utils.ts';
import {
  computeChunkingConfigHash,
  updateAfterChunking,
  updateChunksWithVersion,
  saveEnrichedMetadata,
  clearReindexingFlag,
  cleanupDocumentChunks,
  EMBEDDING_MODEL_VERSION,
} from '../_shared/artifact-registry.ts';
import {
  createSemanticChunksWithEmbeddings,
  createHeuristicSemanticChunks,
  createAITopicChunks,
  buildEnrichedMetadata,
} from '../_shared/semantic-chunking.ts';
import { createMetricsCollector } from '../_shared/metrics-collector.ts';

// Bump version to v3 for enhanced semantic chunking
const VERSION = 'v3';

// Extended strategy type to include AI topic detection
type ExtendedChunkStrategy = 'semantic' | 'fixed' | 'sentence' | 'embedding_cluster' | 'heuristic_semantic' | 'ai_topic';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  console.log(`[chunking-executor:${VERSION}] Request ${requestId} started`);

  // SECURITY: Validate internal authentication
  const authResult = validateInternalCall(req);
  logAuthAttempt('chunking-executor', authResult, requestId);

  if (!authResult.isAuthorized) {
    return unauthorizedResponse(authResult.error);
  }

  const supabase = createServiceClient();
  let metrics: ReturnType<typeof createMetricsCollector> | null = null;
  let documentId = '';

  try {
    const input: unknown = await req.json();

    // Validate input contract strictly
    const validation = validateChunkingInput(input);
    if (!validation.valid) {
      console.error(`[chunking-executor:${VERSION}] ${requestId} - Contract violation: ${validation.errors.join(', ')}`);
      const result = buildStageResult<ChunkingResultData>(
        false,
        VERSION,
        startTime,
        undefined,
        `Contract validation failed: ${validation.errors.join(', ')}`
      );
      return successResponse(result);
    }

    const { documentId: docId, projectId, chunkSize, chunkOverlap, chunkStrategy: rawStrategy } = input as ChunkingInput;
    documentId = docId;
    
    // Normalize strategy - 'semantic' now means heuristic for backward compatibility
    const chunkStrategy: ExtendedChunkStrategy = rawStrategy === 'semantic' 
      ? 'heuristic_semantic' 
      : rawStrategy as ExtendedChunkStrategy;

    // Initialize metrics collector
    metrics = createMetricsCollector(supabase, documentId, 'chunking', VERSION);

    // Clean up old chunks before creating new ones (prevents search pollution)
    const { deletedCount, error: cleanupError } = await cleanupDocumentChunks(supabase, documentId);
    if (cleanupError) {
      console.warn(`[chunking-executor:${VERSION}] ${requestId} - Cleanup warning: ${cleanupError}`);
    } else if (deletedCount > 0) {
      console.log(`[chunking-executor:${VERSION}] ${requestId} - Cleaned up ${deletedCount} old chunks`);
    }

    // Read extracted text from database (reference-based)
    const { text: cleanedText, error: textError } = await getDocumentText(supabase, documentId);
    if (textError || !cleanedText) {
      throw new Error(textError || 'No extracted text available for chunking');
    }

    metrics.setInputSize(cleanedText.length);

    // Read document metadata from database (reference-based)
    const { data: docMeta, error: metaError } = await getDocumentMetadata(supabase, documentId);
    if (metaError || !docMeta) {
      throw new Error(metaError || 'Could not fetch document metadata');
    }

    const { original_name: originalName, language = 'en', mime_type: mimeType } = docMeta;

    console.log(`[chunking-executor:${VERSION}] ${requestId} - Strategy: ${chunkStrategy}, Size: ${chunkSize}`);

    // Calculate metadata
    const metadata = extractMetadata(cleanedText, mimeType, originalName);
    const qualityScore = calculateQualityScore(cleanedText, metadata);

    // Create chunks based on strategy
    let rawChunks: string[];
    let chunkingMethod: string = chunkStrategy;
    let coherenceScore: number | undefined;
    let topicLabels: string[] = [];

    switch (chunkStrategy) {
      case 'ai_topic': {
        // NEW: AI-powered topic detection chunking (highest quality)
        console.log(`[chunking-executor:${VERSION}] ${requestId} - Using AI topic detection chunking`);
        const result = await createAITopicChunks(
          cleanedText,
          chunkSize,
          Math.max(100, chunkSize / 5),
          language
        );
        rawChunks = result.chunks;
        chunkingMethod = result.method;
        coherenceScore = result.avgCoherence;
        topicLabels = result.topicLabels || [];
        break;
      }
      
      case 'embedding_cluster': {
        // True semantic chunking using embedding clustering
        console.log(`[chunking-executor:${VERSION}] ${requestId} - Using embedding-based semantic chunking`);
        const result = await createSemanticChunksWithEmbeddings(
          cleanedText,
          chunkSize,
          Math.max(100, chunkSize / 5),
          language,
          0.7
        );
        rawChunks = result.chunks;
        chunkingMethod = result.method;
        coherenceScore = result.avgCoherence;
        break;
      }
      
      case 'heuristic_semantic': {
        // Renamed original "semantic" to be explicit it's heuristic-based
        console.log(`[chunking-executor:${VERSION}] ${requestId} - Using heuristic semantic chunking`);
        rawChunks = createHeuristicSemanticChunks(cleanedText, chunkSize, chunkOverlap, language);
        break;
      }
      
      case 'sentence':
      case 'fixed':
      default: {
        rawChunks = createChunksWithStrategy(
          cleanedText,
          chunkStrategy === 'sentence' ? 'sentence' : 'fixed',
          chunkSize,
          chunkOverlap,
          language
        );
        break;
      }
    }

    // Extract entities and build enriched metadata (NEW)
    console.log(`[chunking-executor:${VERSION}] ${requestId} - Extracting entities and keywords`);
    const enrichedMetadata = await buildEnrichedMetadata(cleanedText, language, topicLabels);

    // Deduplicate chunks
    const { uniqueChunks, duplicateCount } = await deduplicateChunks(
      supabase,
      rawChunks,
      projectId,
      documentId
    );

    // Insert new chunks with enhanced metadata
    const chunkIds: string[] = [];
    if (uniqueChunks.length > 0) {
      const chunkInserts = uniqueChunks.map((chunk, index) => ({
        document_id: documentId,
        content: chunk.content,
        index,
        hash: chunk.hash,
        is_duplicate: chunk.isDuplicate,
        quality_score: calculateChunkQuality(chunk.content),
        chunking_strategy: chunkStrategy,
        chunking_version: VERSION,
        embedding_model_version: EMBEDDING_MODEL_VERSION,
        metadata: {
          char_count: chunk.content.length,
          word_count: chunk.content.split(/\s+/).length,
          chunking_method: chunkingMethod,
          ...(coherenceScore !== undefined ? { coherence_score: coherenceScore } : {}),
        },
      }));

      const { data: insertedChunks, error: insertError } = await supabase
        .from('chunks')
        .insert(chunkInserts)
        .select('id');

      if (insertError) {
        throw new Error(`Failed to save chunks: ${insertError.message}`);
      }

      if (insertedChunks) {
        chunkIds.push(...insertedChunks.map(c => c.id));
      }
    }

    // Compute chunking config hash for version tracking
    const chunkingConfigHash = computeChunkingConfigHash(chunkSize, chunkOverlap, chunkStrategy);

    // Update chunks with version metadata
    await updateChunksWithVersion(supabase, documentId, chunkingConfigHash, chunkIds);

    // Save enriched metadata to document (NEW)
    await saveEnrichedMetadata(supabase, documentId, enrichedMetadata as unknown as Record<string, unknown>);
    
    // Clear needs_reindexing flag since we just reprocessed
    await clearReindexingFlag(supabase, documentId);

    // Update document metadata with artifact tracking
    await supabase
      .from('documents')
      .update({
        word_count: metadata.wordCount,
        quality_score: qualityScore,
        needs_reindexing: false, // Clear flag since we just processed
        processing_metadata: {
          ...metadata,
          duplicateChunksRemoved: duplicateCount,
          chunkingConfig: {
            strategy: chunkStrategy,
            size: chunkSize,
            overlap: chunkOverlap,
            method: chunkingMethod,
            ...(coherenceScore !== undefined ? { avgCoherence: coherenceScore } : {}),
          },
          topicLabels: topicLabels.slice(0, 10), // Store up to 10 topic labels
          entityCounts: {
            dates: enrichedMetadata.entities.dates.length,
            names: enrichedMetadata.entities.names.length,
            locations: enrichedMetadata.entities.locations.length,
            organizations: enrichedMetadata.entities.organizations.length,
          },
          keywordCount: enrichedMetadata.keywords.length,
          processingVersion: `6.0-semantic-${VERSION}`,
        },
      })
      .eq('id', documentId);

    // Update artifact registry
    await updateAfterChunking(supabase, documentId, chunkingConfigHash, chunkIds);

    // Record success metrics
    const outputSize = uniqueChunks.reduce((sum, c) => sum + c.content.length, 0);
    await metrics.recordSuccess(outputSize, {
      chunkCount: chunkIds.length,
      strategy: chunkStrategy,
      method: chunkingMethod,
      coherenceScore,
    });

    console.log(`[chunking-executor:${VERSION}] ${requestId} - Created ${chunkIds.length} chunks via ${chunkingMethod}`);

    const result = buildStageResult<ChunkingResultData>(
      true,
      VERSION,
      startTime,
      {
        chunkCount: chunkIds.length,
        duplicateCount,
        wordCount: metadata.wordCount,
        qualityScore,
        chunkIds,
        chunkingConfigHash,
      },
      undefined,
      {
        inputSizeBytes: cleanedText.length,
        outputSizeBytes: outputSize,
        additionalInfo: {
          strategy: chunkStrategy,
          method: chunkingMethod,
          coherenceScore,
        },
      }
    );

    return successResponse(result);

  } catch (error) {
    console.error(`[chunking-executor:${VERSION}] ${requestId} - Error:`, error);
    
    // Record failure metrics
    if (metrics) {
      await metrics.recordFailure(error instanceof Error ? error.message : 'Unknown error');
    }
    
    const result = buildStageResult<ChunkingResultData>(
      false,
      VERSION,
      startTime,
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return successResponse(result);
  }
});

// ============= Chunking Helpers =============

async function deduplicateChunks(
  supabase: ReturnType<typeof createServiceClient>,
  chunks: string[],
  projectId: string,
  currentDocumentId: string
): Promise<{ uniqueChunks: ProcessedChunk[]; duplicateCount: number }> {
  const result: ProcessedChunk[] = [];
  let duplicateCount = 0;

  // Get existing chunk hashes in project
  const { data: existingChunks } = await supabase
    .from('chunks')
    .select('hash')
    .neq('document_id', currentDocumentId)
    .not('hash', 'is', null);

  const existingHashes = new Set(existingChunks?.map(c => c.hash) || []);
  const newHashes = new Set<string>();

  for (const content of chunks) {
    const hash = simpleHash(content);
    const isDuplicate = existingHashes.has(hash) || newHashes.has(hash);

    if (isDuplicate) duplicateCount++;

    result.push({ content, hash, isDuplicate });
    newHashes.add(hash);
  }

  return { uniqueChunks: result, duplicateCount };
}
