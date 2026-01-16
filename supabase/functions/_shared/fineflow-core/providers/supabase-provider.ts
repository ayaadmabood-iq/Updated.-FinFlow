/**
 * Supabase Provider Implementation
 * 
 * Implements the abstract provider interfaces for Supabase/Deno environment.
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type {
  IDatabaseProvider,
  IStorageProvider,
  IAIProvider,
  IProviderFactory,
  QueryOptions,
  OperationResult,
  DocumentRecord,
  ChunkRecord,
  ChunkInsert,
  ProjectRecord,
  AICompletionOptions,
  AICompletionResult,
  EmbeddingOptions,
  EmbeddingResult,
  BatchEmbeddingResult,
} from './index.ts';
import { getConfig } from '../config.ts';

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// ============= Supabase Database Provider =============

export class SupabaseDatabaseProvider implements IDatabaseProvider {
  constructor(private client: AnySupabaseClient) {}

  async getDocument(id: string): Promise<OperationResult<DocumentRecord>> {
    const { data, error } = await this.client
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    return { data: data as DocumentRecord, error: error?.message || null };
  }

  async updateDocument(id: string, updates: Partial<DocumentRecord>): Promise<OperationResult<DocumentRecord>> {
    const { data, error } = await this.client
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data: data as DocumentRecord, error: error?.message || null };
  }

  async getDocumentText(id: string): Promise<OperationResult<{ extractedText: string }>> {
    const { data, error } = await this.client
      .from('documents')
      .select('extracted_text')
      .eq('id', id)
      .single();

    return { 
      data: data ? { extractedText: data.extracted_text || '' } : null, 
      error: error?.message || null 
    };
  }

  async insertChunks(chunks: ChunkInsert[]): Promise<OperationResult<{ insertedCount: number }>> {
    const { data, error } = await this.client
      .from('chunks')
      .insert(chunks)
      .select('id');

    return { 
      data: data ? { insertedCount: data.length } : null, 
      error: error?.message || null 
    };
  }

  async getDocumentChunks(documentId: string): Promise<OperationResult<ChunkRecord[]>> {
    const { data, error } = await this.client
      .from('chunks')
      .select('*')
      .eq('document_id', documentId)
      .order('index', { ascending: true });

    return { data: data as ChunkRecord[], error: error?.message || null };
  }

  async updateChunkEmbeddings(updates: Array<{ id: string; embedding: number[] }>): Promise<OperationResult<{ updatedCount: number }>> {
    let updatedCount = 0;
    const errors: string[] = [];

    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      for (const { id, embedding } of batch) {
        const embeddingString = `[${embedding.join(',')}]`;
        const { error } = await this.client
          .from('chunks')
          .update({ embedding: embeddingString })
          .eq('id', id);

        if (error) {
          errors.push(`Chunk ${id}: ${error.message}`);
        } else {
          updatedCount++;
        }
      }
    }

    return { 
      data: { updatedCount }, 
      error: errors.length > 0 ? errors.join('; ') : null 
    };
  }

  async getProject(id: string): Promise<OperationResult<ProjectRecord>> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    return { data: data as ProjectRecord, error: error?.message || null };
  }

  async query<T>(table: string, options?: QueryOptions): Promise<OperationResult<T[]>> {
    let query = this.client.from(table).select(options?.select || '*');

    if (options?.where) {
      for (const [key, value] of Object.entries(options.where)) {
        query = query.eq(key, value);
      }
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;
    return { data: data as T[], error: error?.message || null };
  }

  async insert<T>(table: string, data: Record<string, unknown>): Promise<OperationResult<T>> {
    const { data: result, error } = await this.client
      .from(table)
      .insert(data)
      .select()
      .single();

    return { data: result as T, error: error?.message || null };
  }

  async update<T>(table: string, id: string, data: Record<string, unknown>): Promise<OperationResult<T>> {
    const { data: result, error } = await this.client
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    return { data: result as T, error: error?.message || null };
  }

  async delete(table: string, id: string): Promise<OperationResult<void>> {
    const { error } = await this.client
      .from(table)
      .delete()
      .eq('id', id);

    return { data: null, error: error?.message || null };
  }

  async rpc<T>(functionName: string, params?: Record<string, unknown>): Promise<OperationResult<T>> {
    const { data, error } = await this.client.rpc(functionName, params);
    return { data: data as T, error: error?.message || null };
  }
}

// ============= Supabase Storage Provider =============

export class SupabaseStorageProvider implements IStorageProvider {
  constructor(private client: AnySupabaseClient) {}

  async download(bucket: string, path: string): Promise<OperationResult<Blob>> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .download(path);

    return { data, error: error?.message || null };
  }

  async upload(bucket: string, path: string, data: Blob | ArrayBuffer): Promise<OperationResult<{ path: string }>> {
    const { error } = await this.client.storage
      .from(bucket)
      .upload(path, data, { upsert: true });

    return { data: error ? null : { path }, error: error?.message || null };
  }

  async delete(bucket: string, path: string): Promise<OperationResult<void>> {
    const { error } = await this.client.storage
      .from(bucket)
      .remove([path]);

    return { data: null, error: error?.message || null };
  }

  async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<OperationResult<{ url: string }>> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    return { data: data ? { url: data.signedUrl } : null, error: error?.message || null };
  }
}

// ============= AI Provider (Lovable + OpenAI) =============

export class SupabaseAIProvider implements IAIProvider {
  private lovableApiKey?: string;
  private openaiApiKey?: string;

  constructor() {
    const config = getConfig();
    this.lovableApiKey = config.ai.lovableApiKey;
    this.openaiApiKey = config.ai.openaiApiKey;
  }

  isAvailable(): boolean {
    return !!(this.lovableApiKey || this.openaiApiKey);
  }

  async complete(options: AICompletionOptions): Promise<OperationResult<AICompletionResult>> {
    if (!this.lovableApiKey) {
      return { data: null, error: 'LOVABLE_API_KEY not configured' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 25000);

    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          max_tokens: options.maxTokens,
          temperature: options.temperature,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { data: null, error: `AI API returned ${response.status}` };
      }

      const result = await response.json();
      return {
        data: {
          content: result.choices[0]?.message?.content || '',
          model: options.model,
          usage: result.usage ? {
            promptTokens: result.usage.prompt_tokens,
            completionTokens: result.usage.completion_tokens,
            totalTokens: result.usage.total_tokens,
          } : undefined,
        },
        error: null,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        return { data: null, error: 'AI request timed out' };
      }
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async embed(text: string, options?: EmbeddingOptions): Promise<OperationResult<EmbeddingResult>> {
    if (!this.openaiApiKey) {
      return { data: null, error: 'OPENAI_API_KEY not configured for embeddings' };
    }

    const maxLength = options?.maxLength || 8000;
    const truncatedText = text.substring(0, maxLength);

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || 'text-embedding-3-small',
          input: truncatedText,
        }),
      });

      if (!response.ok) {
        return { data: null, error: `Embedding API returned ${response.status}` };
      }

      const result = await response.json();
      return {
        data: {
          embedding: result.data[0]?.embedding || [],
          tokensUsed: result.usage?.total_tokens || Math.ceil(truncatedText.length / 4),
        },
        error: null,
      };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async embedBatch(texts: string[], options?: EmbeddingOptions): Promise<BatchEmbeddingResult> {
    if (!this.openaiApiKey) {
      return {
        embeddings: texts.map(() => null),
        errors: texts.map(() => 'OPENAI_API_KEY not configured'),
        totalTokensUsed: 0,
      };
    }

    const maxLength = options?.maxLength || 8000;
    const batchSize = 20;
    const embeddings: (number[] | null)[] = [];
    const errors: (string | null)[] = [];
    let totalTokensUsed = 0;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const truncatedBatch = batch.map(t => t.substring(0, maxLength));

      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: options?.model || 'text-embedding-3-small',
            input: truncatedBatch,
          }),
        });

        if (!response.ok) {
          for (let j = 0; j < batch.length; j++) {
            embeddings.push(null);
            errors.push(`Embedding API returned ${response.status}`);
          }
          continue;
        }

        const result = await response.json();
        totalTokensUsed += result.usage?.total_tokens || 0;

        const sortedData = (result.data || []).sort((a: { index: number }, b: { index: number }) => a.index - b.index);

        for (let j = 0; j < batch.length; j++) {
          const embeddingData = sortedData[j];
          if (embeddingData?.embedding) {
            embeddings.push(embeddingData.embedding);
            errors.push(null);
          } else {
            embeddings.push(null);
            errors.push('No embedding returned');
          }
        }
      } catch (err) {
        for (let j = 0; j < batch.length; j++) {
          embeddings.push(null);
          errors.push(err instanceof Error ? err.message : 'Unknown error');
        }
      }
    }

    return { embeddings, errors, totalTokensUsed };
  }
}

// ============= Supabase Provider Factory =============

export class SupabaseProvider implements IProviderFactory {
  private client: AnySupabaseClient;
  private database: SupabaseDatabaseProvider;
  private storage: SupabaseStorageProvider;
  private ai: SupabaseAIProvider;

  constructor(client?: AnySupabaseClient) {
    if (client) {
      this.client = client;
    } else {
      const config = getConfig();
      this.client = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    }

    this.database = new SupabaseDatabaseProvider(this.client);
    this.storage = new SupabaseStorageProvider(this.client);
    this.ai = new SupabaseAIProvider();
  }

  getDatabase(): IDatabaseProvider {
    return this.database;
  }

  getStorage(): IStorageProvider {
    return this.storage;
  }

  getAI(): IAIProvider {
    return this.ai;
  }

  // Direct client access for advanced operations
  getClient(): AnySupabaseClient {
    return this.client;
  }
}

// ============= Singleton Factory =============

let providerInstance: SupabaseProvider | null = null;

export function getProvider(): SupabaseProvider {
  if (!providerInstance) {
    providerInstance = new SupabaseProvider();
  }
  return providerInstance;
}

export function createProvider(client?: AnySupabaseClient): SupabaseProvider {
  return new SupabaseProvider(client);
}
