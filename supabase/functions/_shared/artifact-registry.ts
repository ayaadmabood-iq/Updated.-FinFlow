// ============= Artifact Registry v2.0 =============
// Versioning and artifact tracking for RAG training platform
// Enables reproducible processing, re-indexing, and experiment tracking
// Enhanced with embedding version governance and needs_reindexing support
// Version: 2.0

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// ============= Constants =============
export const CURRENT_PIPELINE_VERSION = 'v6.0-semantic';
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_MODEL_VERSION = '2024-01';
export const EMBEDDING_VECTOR_DIMENSION = 1536;

// ============= Types =============
export interface ArtifactReferences {
  extracted_text_ref: string;
  chunks_ref: string;
  embeddings_ref: string;
}

export interface ArtifactMetadata {
  pipeline_version: string;
  extracted_text_hash?: string;
  chunking_config_hash?: string;
  embedding_model?: string;
  embedding_model_version?: string;
  artifacts: ArtifactReferences;
  last_extraction_at?: string;
  last_chunking_at?: string;
  last_indexing_at?: string;
}

export interface VersionInfo {
  pipeline_version: string;
  executor_version: string;
  chunking_config_hash?: string;
  embedding_model?: string;
  embedding_model_version?: string;
  extracted_text_hash?: string;
}

export interface ChunkVersionMetadata {
  chunk_version: string;
  embedding_model?: string;
  embedding_model_version?: string;
  vector_dimension?: number;
  created_at: string;
}

// ============= Hashing Functions =============

/**
 * Simple hash function for config/text versioning
 * @param input String to hash
 * @returns Hex hash string
 */
export function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Compute hash of chunking configuration for version tracking
 */
export function computeChunkingConfigHash(
  chunkSize: number,
  chunkOverlap: number,
  chunkStrategy: string
): string {
  const config = `${chunkSize}-${chunkOverlap}-${chunkStrategy}`;
  return simpleHash(config);
}

/**
 * Compute hash of extracted text for change detection
 */
export function computeTextHash(text: string): string {
  // Use first and last 5000 chars + length for faster hashing
  const sample = text.length > 10000 
    ? text.substring(0, 5000) + text.substring(text.length - 5000) + text.length.toString()
    : text;
  return simpleHash(sample);
}

// ============= Artifact Metadata Operations =============

/**
 * Get current artifact metadata from document
 */
export async function getArtifactMetadata(
  supabase: AnySupabaseClient,
  documentId: string
): Promise<{ metadata: ArtifactMetadata | null; error: string | null }> {
  const { data, error } = await supabase
    .from('documents')
    .select('processing_metadata')
    .eq('id', documentId)
    .single();

  if (error) {
    return { metadata: null, error: error.message };
  }

  const metadata = data?.processing_metadata as ArtifactMetadata | null;
  return { metadata, error: null };
}

/**
 * Save or merge artifact metadata to document
 */
export async function saveArtifactMetadata(
  supabase: AnySupabaseClient,
  documentId: string,
  newMetadata: Partial<ArtifactMetadata>
): Promise<{ success: boolean; error: string | null }> {
  // Get existing metadata
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('processing_metadata')
    .eq('id', documentId)
    .single();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  // Merge with existing
  const existingMetadata = (doc?.processing_metadata as ArtifactMetadata) || {
    pipeline_version: CURRENT_PIPELINE_VERSION,
    artifacts: {
      extracted_text_ref: 'pending',
      chunks_ref: 'pending',
      embeddings_ref: 'pending',
    },
  };

  const mergedMetadata: ArtifactMetadata = {
    ...existingMetadata,
    ...newMetadata,
    artifacts: {
      ...existingMetadata.artifacts,
      ...(newMetadata.artifacts || {}),
    },
  };

  // Save back
  const { error: updateError } = await supabase
    .from('documents')
    .update({ processing_metadata: mergedMetadata })
    .eq('id', documentId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true, error: null };
}

// ============= Stage-Specific Artifact Updates =============

/**
 * Update artifact metadata after text extraction
 */
export async function updateAfterExtraction(
  supabase: AnySupabaseClient,
  documentId: string,
  extractedTextHash: string
): Promise<void> {
  await saveArtifactMetadata(supabase, documentId, {
    pipeline_version: CURRENT_PIPELINE_VERSION,
    extracted_text_hash: extractedTextHash,
    last_extraction_at: new Date().toISOString(),
    artifacts: {
      extracted_text_ref: 'documents.extracted_text',
      chunks_ref: 'pending',
      embeddings_ref: 'pending',
    },
  });
}

/**
 * Update artifact metadata after chunking
 */
export async function updateAfterChunking(
  supabase: AnySupabaseClient,
  documentId: string,
  chunkingConfigHash: string,
  chunkIds: string[]
): Promise<void> {
  // Get existing metadata to preserve extraction info
  const { metadata } = await getArtifactMetadata(supabase, documentId);

  await saveArtifactMetadata(supabase, documentId, {
    chunking_config_hash: chunkingConfigHash,
    last_chunking_at: new Date().toISOString(),
    artifacts: {
      extracted_text_ref: metadata?.artifacts?.extracted_text_ref || 'documents.extracted_text',
      chunks_ref: `chunks table (document_id=${documentId}, chunk_version=${chunkingConfigHash}, count=${chunkIds.length})`,
      embeddings_ref: 'pending',
    },
  });
}

/**
 * Update artifact metadata after indexing
 */
export async function updateAfterIndexing(
  supabase: AnySupabaseClient,
  documentId: string,
  embeddedChunkIds: string[],
  documentEmbedding: boolean
): Promise<void> {
  // Get existing metadata to preserve extraction and chunking info
  const { metadata } = await getArtifactMetadata(supabase, documentId);

  await saveArtifactMetadata(supabase, documentId, {
    embedding_model: EMBEDDING_MODEL,
    embedding_model_version: EMBEDDING_MODEL_VERSION,
    last_indexing_at: new Date().toISOString(),
    artifacts: {
      extracted_text_ref: metadata?.artifacts?.extracted_text_ref || 'documents.extracted_text',
      chunks_ref: metadata?.artifacts?.chunks_ref || 'chunks table',
      embeddings_ref: `documents.embedding (${documentEmbedding ? 'yes' : 'no'}) + chunks.embedding (${embeddedChunkIds.length} embedded)`,
    },
  });
}

// ============= Chunk Version Tracking =============

/**
 * Update chunks with version metadata
 */
export async function updateChunksWithVersion(
  supabase: AnySupabaseClient,
  documentId: string,
  chunkingConfigHash: string,
  chunkIds: string[]
): Promise<{ success: boolean; error: string | null }> {
  if (chunkIds.length === 0) {
    return { success: true, error: null };
  }

  const versionMetadata: ChunkVersionMetadata = {
    chunk_version: chunkingConfigHash,
    created_at: new Date().toISOString(),
  };

  // Update each chunk individually with merged metadata
  for (const chunkId of chunkIds) {
    const { data: chunk } = await supabase
      .from('chunks')
      .select('metadata')
      .eq('id', chunkId)
      .single();

    const existingMeta = (chunk?.metadata as Record<string, unknown>) || {};
    const mergedMeta = { ...existingMeta, ...versionMetadata };

    await supabase
      .from('chunks')
      .update({ metadata: mergedMeta })
      .eq('id', chunkId);
  }

  return { success: true, error: null };
}

/**
 * Update chunk embeddings with model version - now also updates dedicated columns
 */
export async function updateChunkEmbeddingMetadata(
  supabase: AnySupabaseClient,
  chunkId: string
): Promise<void> {
  const { data: chunk } = await supabase
    .from('chunks')
    .select('metadata')
    .eq('id', chunkId)
    .single();

  const existingMeta = (chunk?.metadata as Record<string, unknown>) || {};
  const updatedMeta = {
    ...existingMeta,
    embedding_model: EMBEDDING_MODEL,
    embedding_model_version: EMBEDDING_MODEL_VERSION,
    embedded_at: new Date().toISOString(),
  };

  // Update both metadata JSON and dedicated columns for efficient querying
  await supabase
    .from('chunks')
    .update({ 
      metadata: updatedMeta,
      embedding_model_version: EMBEDDING_MODEL_VERSION,
      vector_dimension: EMBEDDING_VECTOR_DIMENSION,
    })
    .eq('id', chunkId);
}

// ============= Needs Reindexing Management =============

/**
 * Mark all documents in a project as needing reindexing
 * Called when project embedding settings change
 */
export async function markProjectForReindexing(
  supabase: AnySupabaseClient,
  projectId: string
): Promise<{ count: number; error: string | null }> {
  const { data, error } = await supabase
    .from('documents')
    .update({ needs_reindexing: true })
    .eq('project_id', projectId)
    .eq('status', 'ready')
    .is('deleted_at', null)
    .select('id');

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: data?.length || 0, error: null };
}

/**
 * Clear needs_reindexing flag for a document after successful reprocessing
 */
export async function clearReindexingFlag(
  supabase: AnySupabaseClient,
  documentId: string
): Promise<void> {
  await supabase
    .from('documents')
    .update({ needs_reindexing: false })
    .eq('id', documentId);
}

/**
 * Get documents that need reindexing in a project
 */
export async function getDocumentsNeedingReindexing(
  supabase: AnySupabaseClient,
  projectId: string
): Promise<{ ids: string[]; error: string | null }> {
  const { data, error } = await supabase
    .from('documents')
    .select('id')
    .eq('project_id', projectId)
    .eq('needs_reindexing', true)
    .is('deleted_at', null);

  if (error) {
    return { ids: [], error: error.message };
  }

  return { ids: data?.map(d => d.id) || [], error: null };
}

// ============= Enriched Metadata Storage =============

/**
 * Store enriched metadata (entities, keywords) for a document
 */
export async function saveEnrichedMetadata(
  supabase: AnySupabaseClient,
  documentId: string,
  enrichedMetadata: Record<string, unknown>
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('documents')
    .update({ enriched_metadata: enrichedMetadata })
    .eq('id', documentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// ============= Chunk Cleanup for Reprocessing =============

/**
 * Delete all chunks and embeddings for a document before reprocessing
 * Returns the count of deleted chunks for logging
 */
export async function cleanupDocumentChunks(
  supabase: AnySupabaseClient,
  documentId: string
): Promise<{ deletedCount: number; error: string | null }> {
  // First count existing chunks
  const { count } = await supabase
    .from('chunks')
    .select('*', { count: 'exact', head: true })
    .eq('document_id', documentId);

  // Delete all chunks for this document
  const { error } = await supabase
    .from('chunks')
    .delete()
    .eq('document_id', documentId);

  if (error) {
    return { deletedCount: 0, error: error.message };
  }

  // Clear document embedding as well
  await supabase
    .from('documents')
    .update({ embedding: null })
    .eq('id', documentId);

  return { deletedCount: count || 0, error: null };
}

// ============= Version Checking =============

/**
 * Check if chunking needs to be re-run based on config changes
 */
export async function shouldReChunk(
  supabase: AnySupabaseClient,
  documentId: string,
  newChunkSize: number,
  newChunkOverlap: number,
  newChunkStrategy: string
): Promise<{ shouldReChunk: boolean; reason: string }> {
  const { metadata, error } = await getArtifactMetadata(supabase, documentId);

  if (error || !metadata) {
    return { shouldReChunk: true, reason: 'No existing metadata found' };
  }

  const newConfigHash = computeChunkingConfigHash(newChunkSize, newChunkOverlap, newChunkStrategy);
  
  if (!metadata.chunking_config_hash) {
    return { shouldReChunk: true, reason: 'No previous chunking config hash' };
  }

  if (metadata.chunking_config_hash !== newConfigHash) {
    return { 
      shouldReChunk: true, 
      reason: `Config changed: ${metadata.chunking_config_hash} -> ${newConfigHash}` 
    };
  }

  return { shouldReChunk: false, reason: 'Config unchanged' };
}

/**
 * Check if re-indexing is needed based on text or chunk changes
 */
export async function shouldReIndex(
  supabase: AnySupabaseClient,
  documentId: string
): Promise<{ shouldReIndex: boolean; reason: string }> {
  const { metadata, error } = await getArtifactMetadata(supabase, documentId);

  if (error || !metadata) {
    return { shouldReIndex: true, reason: 'No existing metadata found' };
  }

  // Check if embedding model changed
  if (metadata.embedding_model !== EMBEDDING_MODEL) {
    return { 
      shouldReIndex: true, 
      reason: `Embedding model changed: ${metadata.embedding_model} -> ${EMBEDDING_MODEL}` 
    };
  }

  // Check if chunks were re-created after last indexing
  if (metadata.last_chunking_at && metadata.last_indexing_at) {
    const chunkingTime = new Date(metadata.last_chunking_at).getTime();
    const indexingTime = new Date(metadata.last_indexing_at).getTime();
    
    if (chunkingTime > indexingTime) {
      return { shouldReIndex: true, reason: 'Chunks updated after last indexing' };
    }
  }

  return { shouldReIndex: false, reason: 'No changes detected' };
}

// ============= Version Info Builder =============

/**
 * Build version info object for processing_steps
 */
export function buildVersionInfo(
  stage: string,
  executorVersion: string,
  additionalInfo?: Partial<VersionInfo>
): VersionInfo {
  return {
    pipeline_version: CURRENT_PIPELINE_VERSION,
    executor_version: `${stage}-executor-${executorVersion}`,
    ...additionalInfo,
  };
}
