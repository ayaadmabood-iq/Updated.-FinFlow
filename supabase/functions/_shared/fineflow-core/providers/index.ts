/**
 * FineFlow Provider Interfaces
 * 
 * Abstract interfaces for database, storage, and AI operations.
 * These enable switching between Supabase and NestJS backends.
 */

// ============= Common Types =============

export interface QueryOptions {
  select?: string;
  where?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

export interface OperationResult<T> {
  data: T | null;
  error: string | null;
}

// ============= Database Provider Interface =============

export interface IDatabaseProvider {
  // Document operations
  getDocument(id: string): Promise<OperationResult<DocumentRecord>>;
  updateDocument(id: string, updates: Partial<DocumentRecord>): Promise<OperationResult<DocumentRecord>>;
  getDocumentText(id: string): Promise<OperationResult<{ extractedText: string }>>;
  
  // Chunk operations
  insertChunks(chunks: ChunkInsert[]): Promise<OperationResult<{ insertedCount: number }>>;
  getDocumentChunks(documentId: string): Promise<OperationResult<ChunkRecord[]>>;
  updateChunkEmbeddings(updates: Array<{ id: string; embedding: number[] }>): Promise<OperationResult<{ updatedCount: number }>>;
  
  // Project operations
  getProject(id: string): Promise<OperationResult<ProjectRecord>>;
  
  // Generic query operations
  query<T>(table: string, options?: QueryOptions): Promise<OperationResult<T[]>>;
  insert<T>(table: string, data: Record<string, unknown>): Promise<OperationResult<T>>;
  update<T>(table: string, id: string, data: Record<string, unknown>): Promise<OperationResult<T>>;
  delete(table: string, id: string): Promise<OperationResult<void>>;
  
  // RPC/Function calls
  rpc<T>(functionName: string, params?: Record<string, unknown>): Promise<OperationResult<T>>;
}

// ============= Storage Provider Interface =============

export interface IStorageProvider {
  download(bucket: string, path: string): Promise<OperationResult<Blob>>;
  upload(bucket: string, path: string, data: Blob | ArrayBuffer): Promise<OperationResult<{ path: string }>>;
  delete(bucket: string, path: string): Promise<OperationResult<void>>;
  getSignedUrl(bucket: string, path: string, expiresIn?: number): Promise<OperationResult<{ url: string }>>;
}

// ============= AI Provider Interface =============

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  model: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface AICompletionResult {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface EmbeddingOptions {
  model?: string;
  maxLength?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  tokensUsed: number;
}

export interface BatchEmbeddingResult {
  embeddings: (number[] | null)[];
  errors: (string | null)[];
  totalTokensUsed: number;
}

export interface IAIProvider {
  complete(options: AICompletionOptions): Promise<OperationResult<AICompletionResult>>;
  embed(text: string, options?: EmbeddingOptions): Promise<OperationResult<EmbeddingResult>>;
  embedBatch(texts: string[], options?: EmbeddingOptions): Promise<BatchEmbeddingResult>;
  isAvailable(): boolean;
}

// ============= Provider Factory Interface =============

export interface IProviderFactory {
  getDatabase(): IDatabaseProvider;
  getStorage(): IStorageProvider;
  getAI(): IAIProvider;
}

// ============= Entity Types =============

export interface DocumentRecord {
  id: string;
  name: string;
  original_name: string;
  project_id: string;
  owner_id: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  extracted_text?: string;
  summary?: string;
  language?: string;
  word_count?: number;
  quality_score?: number;
  processing_steps?: unknown[];
  processing_cost_usd?: number;
  total_tokens_used?: number;
  trace_id?: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
  deleted_at?: string;
  error_message?: string;
}

export interface ChunkRecord {
  id: string;
  document_id: string;
  content: string;
  index: number;
  embedding?: number[];
  hash?: string;
  is_duplicate?: boolean;
  quality_score?: number;
  chunking_strategy?: string;
  chunking_version?: string;
  embedding_model?: string;
  embedding_model_version?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ChunkInsert {
  document_id: string;
  content: string;
  index: number;
  hash?: string;
  is_duplicate?: boolean;
  quality_score?: number;
  chunking_strategy?: string;
  chunking_version?: string;
  metadata?: Record<string, unknown>;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  status: string;
  chunk_size?: number;
  chunk_overlap?: number;
  chunk_strategy?: string;
  monthly_budget_usd?: number;
  max_cost_per_query_usd?: number;
  budget_enforcement_mode?: string;
  document_count: number;
  created_at: string;
  updated_at: string;
}

// ============= Export Provider Implementations =============

export { SupabaseProvider } from './supabase-provider.ts';
