// ============= Executor Utilities =============
// Shared utilities for isolated executors
// Uses unified AI executor for all AI operations

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  executeEmbeddingRequest,
  executeEmbeddingBatch,
  executeTranscriptionRequest,
  type EmbeddingResponse,
  type AIOperation,
} from "./unified-ai-executor.ts";

// Use any for Supabase client to avoid version conflicts
// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// ============= Supabase Client Factory =============
export function createServiceClient(): AnySupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key);
}

// ============= CORS Headers =============
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= Response Helpers =============
export function successResponse<T>(data: T) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(error: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function corsResponse() {
  return new Response(null, { headers: corsHeaders });
}

// ============= Document Helpers =============
export async function getDocumentText(
  supabase: AnySupabaseClient,
  documentId: string
): Promise<{ text: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('documents')
    .select('extracted_text')
    .eq('id', documentId)
    .single();

  if (error) {
    return { text: null, error: error.message };
  }

  return { text: data?.extracted_text || null, error: null };
}

export async function getDocumentMetadata(
  supabase: AnySupabaseClient,
  documentId: string
): Promise<{
  data: {
    original_name: string;
    language: string;
    mime_type: string;
    storage_path: string;
  } | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('documents')
    .select('original_name, language, mime_type, storage_path')
    .eq('id', documentId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ============= Storage Helpers =============
export async function downloadFromStorage(
  supabase: AnySupabaseClient,
  storagePath: string,
  bucket = 'project-documents'
): Promise<{ data: Blob | null; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(storagePath);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ============= AI API Helpers (using unified executor) =============

export function hasLovableAPI(): boolean {
  return !!Deno.env.get('LOVABLE_API_KEY');
}

export function hasOpenAIAPI(): boolean {
  return !!Deno.env.get('OPENAI_API_KEY');
}

// Wrapper for Lovable AI calls - NOW uses unified executor for protection
export async function callLovableAI(
  model: string,
  messages: Array<{ role: string; content: unknown }>,
  timeoutMs = 25000,
  userId = 'system',
  projectId = 'system',
  operation: AIOperation = 'custom'
): Promise<{ content: string | null; error: string | null }> {
  // Import executeAIRequest dynamically to use unified executor
  const { executeAIRequest } = await import('./unified-ai-executor.ts');

  // Extract system and user messages
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessage = messages.find(m => m.role === 'user');

  if (!userMessage || typeof userMessage.content !== 'string') {
    return { content: null, error: 'No valid user message found' };
  }

  try {
    const result = await executeAIRequest({
      userId,
      projectId,
      operation,
      userInput: userMessage.content,
      systemPrompt: systemMessage && typeof systemMessage.content === 'string' ? systemMessage.content : undefined,
      model,
      maxTokens: 2000,
      temperature: 0.7,
    });

    if (result.blocked) {
      return {
        content: null,
        error: `Request blocked: ${result.reason}. Threats: ${result.threats?.join(', ')}`,
      };
    }

    if (!result.success) {
      return { content: null, error: result.error || 'AI request failed' };
    }

    return { content: result.response || null, error: null };
  } catch (err) {
    return { content: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============= Embedding via Unified Executor =============

export async function callOpenAIEmbedding(
  text: string,
  maxLength = 8000,
  userId = 'system',
  projectId = 'system'
): Promise<{ embedding: number[] | null; error: string | null; tokensUsed: number }> {
  const result = await executeEmbeddingRequest({
    userId,
    projectId,
    text,
    maxLength,
  });

  return {
    embedding: result.embedding,
    error: result.error || null,
    tokensUsed: result.tokensUsed,
  };
}

// ============= Batch Embedding via Unified Executor =============

export interface BatchEmbeddingResult {
  embeddings: (number[] | null)[];
  errors: (string | null)[];
  totalTokensUsed: number;
}

export async function callOpenAIEmbeddingBatch(
  texts: string[],
  maxLengthPerText = 8000,
  userId = 'system',
  projectId = 'system'
): Promise<BatchEmbeddingResult> {
  const result = await executeEmbeddingBatch({
    userId,
    projectId,
    texts,
    maxLengthPerText,
  });

  return {
    embeddings: result.embeddings,
    errors: result.errors,
    totalTokensUsed: result.totalTokensUsed,
  };
}

// ============= Transcription via Unified Executor =============

export async function callWhisperTranscription(
  audioBlob: Blob,
  userId = 'system',
  projectId = 'system'
): Promise<{ text: string | null; error: string | null }> {
  const result = await executeTranscriptionRequest({
    userId,
    projectId,
    audioBlob,
  });

  return {
    text: result.text,
    error: result.error || null,
  };
}

// ============= Validation Helpers =============
export function validateRequiredFields<T extends object>(
  input: T,
  requiredFields: (keyof T)[]
): string | null {
  for (const field of requiredFields) {
    if (input[field] === undefined || input[field] === null) {
      return `Missing required field: ${String(field)}`;
    }
  }
  return null;
}
