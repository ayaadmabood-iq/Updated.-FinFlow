/**
 * @fileoverview API Boundary Contracts
 *
 * This module defines the contracts (interfaces) between the frontend and backend providers.
 * These interfaces abstract the underlying implementation, allowing for easy provider swapping
 * (e.g., from Supabase to a custom REST API or NestJS backend).
 * 
 * @module lib/api/contracts
 * @version 1.0.0
 * 
 * @example
 * ```typescript
 * import { IBackendProvider, AuthUser } from '@/lib/api/contracts';
 * 
 * // Implement a custom backend provider
 * const myBackend: IBackendProvider = {
 *   auth: myAuthProvider,
 *   database: myDatabaseProvider,
 *   storage: myStorageProvider,
 *   functions: myFunctionProvider,
 * };
 * ```
 */

// ============================================================================
// Auth Provider Contract
// ============================================================================

/**
 * Represents an authenticated user in the system.
 * 
 * @interface AuthUser
 * @property {string} id - Unique identifier (UUID)
 * @property {string} email - User's email address
 * @property {string} name - User's display name
 * @property {string} [avatar] - URL to user's avatar image
 * @property {('admin' | 'user' | 'super_admin')} role - User's role for authorization
 * @property {('free' | 'starter' | 'pro' | 'enterprise')} [subscriptionTier] - User's subscription level
 * @property {('active' | 'suspended')} [status] - Account status
 * @property {string} createdAt - ISO 8601 timestamp of account creation
 * @property {string} updatedAt - ISO 8601 timestamp of last update
 * 
 * @example
 * ```typescript
 * const user: AuthUser = {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   email: 'user@example.com',
 *   name: 'John Doe',
 *   role: 'user',
 *   subscriptionTier: 'pro',
 *   status: 'active',
 *   createdAt: '2024-01-01T00:00:00Z',
 *   updatedAt: '2024-01-01T00:00:00Z',
 * };
 * ```
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'user' | 'super_admin';
  subscriptionTier?: 'free' | 'starter' | 'pro' | 'enterprise';
  status?: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents an authenticated session with tokens.
 * 
 * @interface AuthSession
 * @property {AuthUser} user - The authenticated user
 * @property {string} accessToken - JWT access token for API requests
 * @property {string} [refreshToken] - Token for refreshing the session
 * @property {number} expiresAt - Unix timestamp when the session expires
 * 
 * @example
 * ```typescript
 * const session: AuthSession = {
 *   user: { id: 'user-123', ... },
 *   accessToken: 'eyJhbGciOiJIUzI1NiIs...',
 *   refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
 *   expiresAt: 1704067200,
 * };
 * ```
 */
export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

/**
 * Credentials required for user login.
 * 
 * @interface LoginCredentials
 * @property {string} email - User's email address
 * @property {string} password - User's password
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Credentials required for user registration.
 * 
 * @interface RegisterCredentials
 * @property {string} email - User's email address
 * @property {string} password - User's chosen password
 * @property {string} name - User's display name
 */
export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

/**
 * Contract for authentication operations.
 * 
 * Providers implementing this interface handle all authentication-related
 * functionality including login, registration, session management, and
 * profile updates.
 * 
 * @interface IAuthProvider
 * 
 * @example
 * ```typescript
 * const authProvider: IAuthProvider = {
 *   async login({ email, password }) {
 *     const response = await fetch('/api/auth/login', {
 *       method: 'POST',
 *       body: JSON.stringify({ email, password }),
 *     });
 *     return response.json();
 *   },
 *   // ... other methods
 * };
 * ```
 */
export interface IAuthProvider {
  /**
   * Authenticate a user with credentials.
   * @param credentials - Login credentials
   * @returns Promise resolving to user and token
   */
  login(credentials: LoginCredentials): Promise<{ user: AuthUser; token: string }>;
  
  /**
   * Register a new user account.
   * @param credentials - Registration credentials
   * @returns Promise resolving to user and token
   */
  register(credentials: RegisterCredentials): Promise<{ user: AuthUser; token: string }>;
  
  /**
   * Log out the current user and invalidate the session.
   */
  logout(): Promise<void>;
  
  /**
   * Get the current session if one exists.
   * @returns Promise resolving to session or null
   */
  getSession(): Promise<AuthSession | null>;
  
  /**
   * Get the current authenticated user.
   * @returns Promise resolving to user or null
   */
  getUser(): Promise<AuthUser | null>;
  
  /**
   * Update the current user's profile.
   * @param updates - Partial user data to update
   * @returns Promise resolving to updated user
   */
  updateProfile(updates: Partial<AuthUser>): Promise<AuthUser>;
  
  /**
   * Subscribe to authentication state changes.
   * @param callback - Function called when auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void;
}

// ============================================================================
// Database Provider Contract
// ============================================================================

/**
 * Options for database queries.
 * 
 * @interface QueryOptions
 * @property {string} [select] - Columns to select (comma-separated or '*')
 * @property {{ column: string; ascending?: boolean }} [orderBy] - Ordering configuration
 * @property {number} [limit] - Maximum number of rows to return
 * @property {number} [offset] - Number of rows to skip
 * @property {Record<string, unknown>} [filters] - Key-value filter conditions
 * 
 * @example
 * ```typescript
 * const options: QueryOptions = {
 *   select: 'id, name, status',
 *   orderBy: { column: 'created_at', ascending: false },
 *   limit: 20,
 *   offset: 0,
 *   filters: { status: 'active' },
 * };
 * ```
 */
export interface QueryOptions {
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
}

/**
 * Paginated query result.
 * 
 * @interface PaginatedResult
 * @template T - The type of items in the result
 * @property {T[]} data - Array of items for the current page
 * @property {number} total - Total number of items across all pages
 * @property {number} page - Current page number (1-indexed)
 * @property {number} pageSize - Number of items per page
 * @property {number} totalPages - Total number of pages
 * 
 * @example
 * ```typescript
 * const result: PaginatedResult<Document> = {
 *   data: [doc1, doc2, doc3],
 *   total: 100,
 *   page: 1,
 *   pageSize: 20,
 *   totalPages: 5,
 * };
 * ```
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Contract for database operations.
 * 
 * Providers implementing this interface handle all database CRUD operations
 * and remote procedure calls.
 * 
 * @interface IDatabaseProvider
 * 
 * @example
 * ```typescript
 * const dbProvider: IDatabaseProvider = {
 *   async query(table, options) {
 *     return supabase.from(table).select(options?.select).limit(options?.limit);
 *   },
 *   // ... other methods
 * };
 * ```
 */
export interface IDatabaseProvider {
  /**
   * Query multiple rows from a table.
   * @template T - Expected row type
   * @param table - Table name
   * @param options - Query options
   * @returns Promise resolving to array of rows
   */
  query<T>(table: string, options?: QueryOptions): Promise<T[]>;
  
  /**
   * Query a single row by ID.
   * @template T - Expected row type
   * @param table - Table name
   * @param id - Row ID
   * @returns Promise resolving to row or null
   */
  queryOne<T>(table: string, id: string): Promise<T | null>;
  
  /**
   * Insert a new row.
   * @template T - Row type
   * @param table - Table name
   * @param data - Data to insert
   * @returns Promise resolving to inserted row
   */
  insert<T>(table: string, data: Partial<T>): Promise<T>;
  
  /**
   * Update an existing row.
   * @template T - Row type
   * @param table - Table name
   * @param id - Row ID
   * @param data - Data to update
   * @returns Promise resolving to updated row
   */
  update<T>(table: string, id: string, data: Partial<T>): Promise<T>;
  
  /**
   * Delete a row.
   * @param table - Table name
   * @param id - Row ID
   */
  delete(table: string, id: string): Promise<void>;
  
  /**
   * Call a database function (RPC).
   * @template T - Expected return type
   * @param functionName - Name of the database function
   * @param params - Function parameters
   * @returns Promise resolving to function result
   */
  rpc<T>(functionName: string, params?: Record<string, unknown>): Promise<T>;
}

// ============================================================================
// Storage Provider Contract
// ============================================================================

/**
 * Result of a file upload operation.
 * 
 * @interface StorageUploadResult
 * @property {string} path - Path where the file was stored
 * @property {string} [publicUrl] - Public URL if the bucket is public
 */
export interface StorageUploadResult {
  path: string;
  publicUrl?: string;
}

/**
 * Result of a signed URL request.
 * 
 * @interface SignedUrlResult
 * @property {string} url - The signed URL
 * @property {string} expiresAt - ISO 8601 timestamp when the URL expires
 */
export interface SignedUrlResult {
  url: string;
  expiresAt: string;
}

/**
 * Contract for file storage operations.
 * 
 * Providers implementing this interface handle file uploads, downloads,
 * deletions, and URL generation.
 * 
 * @interface IStorageProvider
 * 
 * @example
 * ```typescript
 * const storageProvider: IStorageProvider = {
 *   async upload(bucket, path, file) {
 *     const { data, error } = await supabase.storage
 *       .from(bucket)
 *       .upload(path, file);
 *     return { path: data.path };
 *   },
 *   // ... other methods
 * };
 * ```
 */
export interface IStorageProvider {
  /**
   * Upload a file to storage.
   * @param bucket - Storage bucket name
   * @param path - Path within the bucket
   * @param file - File or Blob to upload
   * @returns Promise resolving to upload result
   */
  upload(bucket: string, path: string, file: File | Blob): Promise<StorageUploadResult>;
  
  /**
   * Download a file from storage.
   * @param bucket - Storage bucket name
   * @param path - Path within the bucket
   * @returns Promise resolving to file Blob
   */
  download(bucket: string, path: string): Promise<Blob>;
  
  /**
   * Delete a file from storage.
   * @param bucket - Storage bucket name
   * @param path - Path within the bucket
   */
  delete(bucket: string, path: string): Promise<void>;
  
  /**
   * Get a signed URL for temporary file access.
   * @param bucket - Storage bucket name
   * @param path - Path within the bucket
   * @param expiresIn - Seconds until URL expires (default: 3600)
   * @returns Promise resolving to signed URL result
   */
  getSignedUrl(bucket: string, path: string, expiresIn?: number): Promise<SignedUrlResult>;
  
  /**
   * Get the public URL for a file in a public bucket.
   * @param bucket - Storage bucket name
   * @param path - Path within the bucket
   * @returns Public URL string
   */
  getPublicUrl(bucket: string, path: string): string;
}

// ============================================================================
// Function/API Provider Contract
// ============================================================================

/**
 * Options for invoking edge functions.
 * 
 * @interface FunctionInvokeOptions
 * @property {Record<string, unknown>} [body] - Request body
 * @property {Record<string, string>} [headers] - Additional headers
 */
export interface FunctionInvokeOptions {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

/**
 * Response from a function invocation.
 * 
 * @interface FunctionResponse
 * @template T - Expected response data type
 * @property {T} data - Response data
 * @property {Error | null} error - Error if the invocation failed
 */
export interface FunctionResponse<T = unknown> {
  data: T;
  error: Error | null;
}

/**
 * Contract for serverless function operations.
 * 
 * Providers implementing this interface handle invocation of edge/serverless
 * functions.
 * 
 * @interface IFunctionProvider
 * 
 * @example
 * ```typescript
 * const functionProvider: IFunctionProvider = {
 *   async invoke(name, options) {
 *     const { data, error } = await supabase.functions.invoke(name, {
 *       body: options?.body,
 *     });
 *     return { data, error };
 *   },
 * };
 * ```
 */
export interface IFunctionProvider {
  /**
   * Invoke a serverless function.
   * @template T - Expected response type
   * @param functionName - Name of the function to invoke
   * @param options - Invocation options
   * @returns Promise resolving to function response
   */
  invoke<T = unknown>(
    functionName: string,
    options?: FunctionInvokeOptions
  ): Promise<FunctionResponse<T>>;
}

// ============================================================================
// Combined Backend Provider (facade)
// ============================================================================

/**
 * Combined backend provider facade.
 * 
 * Aggregates all provider interfaces into a single unified interface,
 * providing a consistent API for all backend operations.
 * 
 * @interface IBackendProvider
 * @property {IAuthProvider} auth - Authentication operations
 * @property {IDatabaseProvider} database - Database operations
 * @property {IStorageProvider} storage - File storage operations
 * @property {IFunctionProvider} functions - Serverless function operations
 * 
 * @example
 * ```typescript
 * import { backend } from '@/lib/api';
 * 
 * // Authentication
 * const { user } = await backend.auth.login({ email, password });
 * 
 * // Database queries
 * const projects = await backend.database.query('projects', { limit: 10 });
 * 
 * // File storage
 * const { path } = await backend.storage.upload('documents', 'file.pdf', file);
 * 
 * // Edge functions
 * const { data } = await backend.functions.invoke('process-document', { body: { docId } });
 * ```
 */
export interface IBackendProvider {
  auth: IAuthProvider;
  database: IDatabaseProvider;
  storage: IStorageProvider;
  functions: IFunctionProvider;
}

// ============================================================================
// AI Provider Contract
// ============================================================================

/**
 * Request configuration for AI completions.
 * 
 * @interface AICompletionRequest
 * @property {string} model - AI model to use (e.g., 'gpt-4o', 'gpt-4o-mini')
 * @property {Array<{ role: 'system' | 'user' | 'assistant'; content: string }>} messages - Conversation messages
 * @property {number} [maxTokens] - Maximum tokens in response
 * @property {number} [temperature] - Sampling temperature (0-2)
 * @property {boolean} [stream] - Whether to stream the response
 * 
 * @example
 * ```typescript
 * const request: AICompletionRequest = {
 *   model: 'gpt-4o-mini',
 *   messages: [
 *     { role: 'system', content: 'You are a helpful assistant.' },
 *     { role: 'user', content: 'Summarize this document.' },
 *   ],
 *   maxTokens: 500,
 *   temperature: 0.7,
 * };
 * ```
 */
export interface AICompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

/**
 * Response from an AI completion request.
 * 
 * @interface AICompletionResponse
 * @property {string} content - Generated text content
 * @property {string} model - Model that generated the response
 * @property {{ promptTokens: number; completionTokens: number; totalTokens: number }} [usage] - Token usage statistics
 */
export interface AICompletionResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Request configuration for text embeddings.
 * 
 * @interface AIEmbeddingRequest
 * @property {string | string[]} input - Text(s) to embed
 * @property {string} [model] - Embedding model to use
 * 
 * @example
 * ```typescript
 * const request: AIEmbeddingRequest = {
 *   input: ['First document', 'Second document'],
 *   model: 'text-embedding-3-small',
 * };
 * ```
 */
export interface AIEmbeddingRequest {
  input: string | string[];
  model?: string;
}

/**
 * Response from an embedding request.
 * 
 * @interface AIEmbeddingResponse
 * @property {number[][]} embeddings - Array of embedding vectors
 * @property {string} model - Model that generated the embeddings
 * @property {{ promptTokens: number; totalTokens: number }} [usage] - Token usage statistics
 */
export interface AIEmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

/**
 * Contract for AI operations.
 * 
 * Providers implementing this interface handle AI completions,
 * embeddings, and streaming responses.
 * 
 * @interface IAIProvider
 * 
 * @example
 * ```typescript
 * const aiProvider: IAIProvider = {
 *   async complete(request) {
 *     const response = await openai.chat.completions.create({
 *       model: request.model,
 *       messages: request.messages,
 *     });
 *     return {
 *       content: response.choices[0].message.content,
 *       model: request.model,
 *       usage: { ... },
 *     };
 *   },
 *   // ... other methods
 * };
 * ```
 */
export interface IAIProvider {
  /**
   * Generate a text completion.
   * @param request - Completion request configuration
   * @returns Promise resolving to completion response
   */
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
  
  /**
   * Generate text embeddings.
   * @param request - Embedding request configuration
   * @returns Promise resolving to embedding response
   */
  embed(request: AIEmbeddingRequest): Promise<AIEmbeddingResponse>;
  
  /**
   * Generate a streaming text completion.
   * @param request - Completion request configuration
   * @param onChunk - Callback for each streamed chunk
   * @returns Promise resolving to final completion response
   */
  streamComplete(
    request: AICompletionRequest,
    onChunk: (chunk: string) => void
  ): Promise<AICompletionResponse>;
}
