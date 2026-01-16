/**
 * @fileoverview Core domain types for FineFlow application.
 * 
 * This module contains all the core type definitions used throughout the FineFlow
 * application, including user management, project configuration, document processing,
 * and API response structures.
 * 
 * @module types
 * @version 1.0.0
 */

// ============================================================================
// User Types
// ============================================================================

/**
 * Represents a user in the FineFlow system.
 * 
 * Users are the primary entities that interact with the system. Each user
 * has authentication credentials, profile information, and subscription details.
 * 
 * @interface User
 * @property {string} id - Unique identifier (UUID) for the user
 * @property {string} email - User's email address (used for authentication)
 * @property {string} name - User's display name
 * @property {string} [avatar] - URL to user's avatar image (optional)
 * @property {('admin' | 'user' | 'super_admin')} role - User's role determining permissions
 * @property {SubscriptionTier} [subscriptionTier] - User's subscription level
 * @property {('active' | 'suspended')} [status] - Account status
 * @property {string} createdAt - ISO 8601 timestamp of account creation
 * @property {string} updatedAt - ISO 8601 timestamp of last update
 * 
 * @example
 * ```typescript
 * const user: User = {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   email: 'user@example.com',
 *   name: 'John Doe',
 *   avatar: 'https://example.com/avatar.jpg',
 *   role: 'user',
 *   subscriptionTier: 'pro',
 *   status: 'active',
 *   createdAt: '2024-01-01T00:00:00Z',
 *   updatedAt: '2024-01-01T00:00:00Z',
 * };
 * ```
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'user' | 'super_admin';
  subscriptionTier?: SubscriptionTier;
  status?: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

/**
 * User subscription tiers available in FineFlow.
 * 
 * Each tier provides different feature access and usage limits:
 * - `free` - Limited features, basic usage (suitable for evaluation)
 * - `starter` - Standard features, moderate usage limits
 * - `pro` - Advanced features, high usage limits (most popular)
 * - `enterprise` - All features, unlimited usage, priority support
 * 
 * @typedef {('free' | 'starter' | 'pro' | 'enterprise')} SubscriptionTier
 */
export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise';

// ============================================================================
// Chunking Configuration Types
// ============================================================================

/**
 * Available chunking strategies for document processing.
 * 
 * The chunking strategy determines how documents are split into smaller pieces
 * for embedding and retrieval:
 * 
 * - `semantic` - Heuristic sentence-based chunking (legacy name, kept for compatibility)
 * - `fixed` - Fixed-size chunks with configurable overlap
 * - `sentence` - Split on sentence boundaries
 * - `embedding_cluster` - True semantic chunking using embedding similarity
 * - `heuristic_semantic` - Explicit heuristic semantic (same as legacy 'semantic')
 * 
 * @typedef {('semantic' | 'fixed' | 'sentence' | 'embedding_cluster' | 'heuristic_semantic')} ChunkStrategy
 * 
 * @example
 * ```typescript
 * const strategy: ChunkStrategy = 'embedding_cluster';
 * ```
 */
export type ChunkStrategy = 'semantic' | 'fixed' | 'sentence' | 'embedding_cluster' | 'heuristic_semantic';

/**
 * Configuration settings for document chunking.
 * 
 * These settings control how documents are split into chunks for processing
 * and retrieval. Proper configuration affects RAG quality and performance.
 * 
 * @interface ChunkingSettings
 * @property {number} chunkSize - Target size of each chunk in characters (typically 500-2000)
 * @property {number} chunkOverlap - Number of overlapping characters between chunks (typically 50-200)
 * @property {ChunkStrategy} chunkStrategy - The strategy used for chunking
 * 
 * @example
 * ```typescript
 * const settings: ChunkingSettings = {
 *   chunkSize: 1000,
 *   chunkOverlap: 100,
 *   chunkStrategy: 'semantic',
 * };
 * ```
 */
export interface ChunkingSettings {
  chunkSize: number;
  chunkOverlap: number;
  chunkStrategy: ChunkStrategy;
}

// ============================================================================
// Processing & Analytics Types
// ============================================================================

/**
 * Metrics captured during document processing stages.
 * 
 * Used for performance monitoring, debugging, and optimization of the
 * document processing pipeline.
 * 
 * @interface ProcessingMetrics
 * @property {string} stage - Name of the processing stage
 * @property {string} executorVersion - Version of the executor that ran the stage
 * @property {string} pipelineVersion - Version of the overall pipeline
 * @property {number} durationMs - Duration of the stage in milliseconds
 * @property {boolean} success - Whether the stage completed successfully
 * @property {string} [errorMessage] - Error message if the stage failed
 * @property {number} [inputSizeBytes] - Size of input data in bytes
 * @property {number} [outputSizeBytes] - Size of output data in bytes
 * @property {number} [retryCount] - Number of retries attempted
 * 
 * @example
 * ```typescript
 * const metrics: ProcessingMetrics = {
 *   stage: 'text_extraction',
 *   executorVersion: '1.0.0',
 *   pipelineVersion: '2.0.0',
 *   durationMs: 1500,
 *   success: true,
 *   inputSizeBytes: 1024000,
 *   outputSizeBytes: 512000,
 * };
 * ```
 */
export interface ProcessingMetrics {
  stage: string;
  executorVersion: string;
  pipelineVersion: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  inputSizeBytes?: number;
  outputSizeBytes?: number;
  retryCount?: number;
}

/**
 * Result of a RAG (Retrieval-Augmented Generation) evaluation.
 * 
 * Used to assess the quality of document retrieval and chunk relevance.
 * 
 * @interface RAGEvaluationResult
 * @property {string} id - Unique identifier for the evaluation
 * @property {string} projectId - ID of the project being evaluated
 * @property {string} [documentId] - Optional ID of specific document evaluated
 * @property {('retrieval_precision' | 'chunk_coverage' | 'relevance')} evaluationType - Type of evaluation performed
 * @property {string} [query] - The query used for evaluation
 * @property {number} score - Evaluation score (0-1)
 * @property {Record<string, unknown>} metrics - Additional evaluation metrics
 * @property {string} createdAt - ISO 8601 timestamp of evaluation
 * @property {('system' | 'user' | 'auto')} evaluatedBy - Who triggered the evaluation
 * 
 * @example
 * ```typescript
 * const result: RAGEvaluationResult = {
 *   id: 'eval-123',
 *   projectId: 'proj-456',
 *   evaluationType: 'retrieval_precision',
 *   query: 'What is machine learning?',
 *   score: 0.85,
 *   metrics: { precision: 0.9, recall: 0.8 },
 *   createdAt: '2024-01-01T00:00:00Z',
 *   evaluatedBy: 'system',
 * };
 * ```
 */
export interface RAGEvaluationResult {
  id: string;
  projectId: string;
  documentId?: string;
  evaluationType: 'retrieval_precision' | 'chunk_coverage' | 'relevance';
  query?: string;
  score: number;
  metrics: Record<string, unknown>;
  createdAt: string;
  evaluatedBy: 'system' | 'user' | 'auto';
}

// ============================================================================
// Project Types
// ============================================================================

/**
 * Represents a project in the FineFlow system.
 * 
 * Projects are the primary organizational unit for documents and configurations.
 * Each project has its own chunking settings and document collection.
 * 
 * @interface Project
 * @property {string} id - Unique identifier (UUID) for the project
 * @property {string} name - Display name of the project
 * @property {string} description - Description of the project's purpose
 * @property {('active' | 'archived' | 'draft')} status - Current status of the project
 * @property {string} ownerId - UUID of the user who owns the project
 * @property {number} documentCount - Number of documents in the project
 * @property {number} chunkSize - Target chunk size in characters
 * @property {number} chunkOverlap - Overlap between chunks in characters
 * @property {ChunkStrategy} chunkStrategy - Chunking strategy for documents
 * @property {string} createdAt - ISO 8601 timestamp of creation
 * @property {string} updatedAt - ISO 8601 timestamp of last update
 * 
 * @example
 * ```typescript
 * const project: Project = {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   name: 'Legal Documents',
 *   description: 'Collection of legal contracts and policies',
 *   status: 'active',
 *   ownerId: 'user-456',
 *   documentCount: 25,
 *   chunkSize: 1000,
 *   chunkOverlap: 100,
 *   chunkStrategy: 'semantic',
 *   createdAt: '2024-01-01T00:00:00Z',
 *   updatedAt: '2024-01-15T00:00:00Z',
 * };
 * ```
 */
export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'draft';
  ownerId: string;
  documentCount: number;
  chunkSize: number;
  chunkOverlap: number;
  chunkStrategy: ChunkStrategy;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Document Types
// ============================================================================

/**
 * Possible statuses for a document during its lifecycle.
 * 
 * - `uploaded` - Document has been uploaded but not yet processed
 * - `ready` - Document has been fully processed and is ready for use
 * - `processing` - Document is currently being processed
 * - `error` - Document processing failed
 * 
 * @typedef {('uploaded' | 'ready' | 'processing' | 'error')} DocumentStatus
 */
export type DocumentStatus = 'uploaded' | 'ready' | 'processing' | 'error';

/**
 * Stages in the document processing pipeline.
 * 
 * Documents go through these stages sequentially during processing:
 * - `ingestion` - Initial file intake and validation
 * - `text_extraction` - Extracting text content from the file
 * - `language_detection` - Detecting the document's language
 * - `chunking` - Splitting the document into chunks
 * - `summarization` - Generating a document summary
 * - `indexing` - Creating embeddings and indexing for search
 * 
 * @typedef {('ingestion' | 'text_extraction' | 'language_detection' | 'chunking' | 'summarization' | 'indexing')} PipelineStage
 */
export type PipelineStage = 
  | 'ingestion' 
  | 'text_extraction' 
  | 'language_detection' 
  | 'chunking' 
  | 'summarization' 
  | 'indexing';

/**
 * Possible statuses for a pipeline stage.
 * 
 * - `pending` - Stage has not started yet
 * - `running` - Stage is currently executing
 * - `completed` - Stage finished successfully
 * - `failed` - Stage encountered an error
 * - `skipped` - Stage was skipped (not applicable)
 * 
 * @typedef {('pending' | 'running' | 'completed' | 'failed' | 'skipped')} StageStatus
 */
export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/**
 * Represents a single step in the document processing pipeline.
 * 
 * @interface ProcessingStep
 * @property {PipelineStage} stage - The pipeline stage this step represents
 * @property {StageStatus} status - Current status of this step
 * @property {string} started_at - ISO 8601 timestamp when the step started
 * @property {string} [completed_at] - ISO 8601 timestamp when the step completed
 * @property {number} [duration_ms] - Duration of the step in milliseconds
 * @property {string} [error] - Error message if the step failed
 * @property {Record<string, unknown>} [result_summary] - Summary of step results
 * 
 * @example
 * ```typescript
 * const step: ProcessingStep = {
 *   stage: 'text_extraction',
 *   status: 'completed',
 *   started_at: '2024-01-01T00:00:00Z',
 *   completed_at: '2024-01-01T00:00:05Z',
 *   duration_ms: 5000,
 *   result_summary: { words: 1500, pages: 3 },
 * };
 * ```
 */
export interface ProcessingStep {
  stage: PipelineStage;
  status: StageStatus;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error?: string;
  result_summary?: Record<string, unknown>;
}

/**
 * Represents a document in the FineFlow system.
 * 
 * Documents are the primary content units that are processed, chunked,
 * and made searchable within projects.
 * 
 * @interface Document
 * @property {string} id - Unique identifier (UUID) for the document
 * @property {string} projectId - ID of the project this document belongs to
 * @property {string} ownerId - ID of the user who uploaded the document
 * @property {string} name - Display name of the document
 * @property {string} originalName - Original filename when uploaded
 * @property {string} mimeType - MIME type of the document (e.g., 'application/pdf')
 * @property {number} sizeBytes - File size in bytes
 * @property {string} storagePath - Path to the file in storage
 * @property {DocumentStatus} status - Current processing status
 * @property {string} [errorMessage] - Error message if processing failed
 * @property {string} [deletedAt] - Soft delete timestamp
 * @property {number} [wordCount] - Number of words in the document
 * @property {string} [summary] - AI-generated summary of the document
 * @property {string} [extractedText] - Full extracted text content
 * @property {string} [language] - Detected language code (e.g., 'en', 'ar')
 * @property {number} [qualityScore] - Quality score (0-100)
 * @property {ProcessingStep[]} [processingSteps] - Array of processing step statuses
 * @property {string} createdAt - ISO 8601 timestamp of upload
 * @property {string} updatedAt - ISO 8601 timestamp of last update
 * 
 * @example
 * ```typescript
 * const document: Document = {
 *   id: 'doc-123',
 *   projectId: 'proj-456',
 *   ownerId: 'user-789',
 *   name: 'Company Policy',
 *   originalName: 'policy.pdf',
 *   mimeType: 'application/pdf',
 *   sizeBytes: 1024000,
 *   storagePath: 'documents/doc-123.pdf',
 *   status: 'ready',
 *   wordCount: 5000,
 *   summary: 'This document outlines company policies...',
 *   language: 'en',
 *   qualityScore: 95,
 *   createdAt: '2024-01-01T00:00:00Z',
 *   updatedAt: '2024-01-01T00:05:00Z',
 * };
 * ```
 */
export interface Document {
  id: string;
  projectId: string;
  ownerId: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  status: DocumentStatus;
  errorMessage?: string;
  deletedAt?: string;
  wordCount?: number;
  summary?: string;
  extractedText?: string;
  language?: string;
  qualityScore?: number;
  processingSteps?: ProcessingStep[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Input data required to create a new document.
 * 
 * @interface CreateDocumentInput
 * @property {string} projectId - ID of the project to add the document to
 * @property {string} name - Display name for the document
 * @property {string} originalName - Original filename
 * @property {string} mimeType - MIME type of the file
 * @property {number} sizeBytes - Size of the file in bytes
 * @property {string} storagePath - Path where the file is stored
 * 
 * @example
 * ```typescript
 * const input: CreateDocumentInput = {
 *   projectId: 'proj-456',
 *   name: 'Annual Report',
 *   originalName: 'report-2024.pdf',
 *   mimeType: 'application/pdf',
 *   sizeBytes: 2048000,
 *   storagePath: 'documents/report-2024.pdf',
 * };
 * ```
 */
export interface CreateDocumentInput {
  projectId: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
}

/**
 * Input data for updating an existing document.
 * 
 * All fields are optional - only provided fields will be updated.
 * 
 * @interface UpdateDocumentInput
 * @property {string} [name] - New display name
 * @property {DocumentStatus} [status] - New status
 * @property {string} [errorMessage] - Error message to set
 * 
 * @example
 * ```typescript
 * const update: UpdateDocumentInput = {
 *   name: 'Updated Report Name',
 *   status: 'ready',
 * };
 * ```
 */
export interface UpdateDocumentInput {
  name?: string;
  status?: DocumentStatus;
  errorMessage?: string;
}

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Response from requesting a signed download URL.
 * 
 * @interface SignedUrlResponse
 * @property {string} url - The signed URL for downloading
 * @property {string} expiresAt - ISO 8601 timestamp when the URL expires
 * 
 * @example
 * ```typescript
 * const response: SignedUrlResponse = {
 *   url: 'https://storage.example.com/file.pdf?token=abc123',
 *   expiresAt: '2024-01-01T01:00:00Z',
 * };
 * ```
 */
export interface SignedUrlResponse {
  url: string;
  expiresAt: string;
}

/**
 * Response from requesting an upload URL.
 * 
 * @interface UploadUrlResponse
 * @property {string} uploadUrl - The URL to upload the file to
 * @property {string} storagePath - The path where the file will be stored
 * 
 * @example
 * ```typescript
 * const response: UploadUrlResponse = {
 *   uploadUrl: 'https://storage.example.com/upload?token=xyz789',
 *   storagePath: 'documents/new-file.pdf',
 * };
 * ```
 */
export interface UploadUrlResponse {
  uploadUrl: string;
  storagePath: string;
}

// ============================================================================
// Audit Types
// ============================================================================

/**
 * An entry in the audit log tracking user actions.
 * 
 * @interface AuditLogEntry
 * @property {string} id - Unique identifier for the log entry
 * @property {string} userId - ID of the user who performed the action
 * @property {string} userName - Display name of the user
 * @property {AuditAction} action - The type of action performed
 * @property {('project' | 'document' | 'user' | 'settings')} resourceType - Type of resource affected
 * @property {string} resourceId - ID of the affected resource
 * @property {string} resourceName - Display name of the affected resource
 * @property {Record<string, unknown>} [details] - Additional details about the action
 * @property {string} [ipAddress] - IP address of the user
 * @property {string} timestamp - ISO 8601 timestamp of the action
 * 
 * @example
 * ```typescript
 * const entry: AuditLogEntry = {
 *   id: 'log-123',
 *   userId: 'user-456',
 *   userName: 'John Doe',
 *   action: 'create',
 *   resourceType: 'document',
 *   resourceId: 'doc-789',
 *   resourceName: 'Annual Report',
 *   details: { fileSize: 1024000 },
 *   ipAddress: '192.168.1.1',
 *   timestamp: '2024-01-01T00:00:00Z',
 * };
 * ```
 */
export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  resourceType: 'project' | 'document' | 'user' | 'settings';
  resourceId: string;
  resourceName: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

/**
 * Types of actions that can be recorded in the audit log.
 * 
 * Standard CRUD actions:
 * - `create` - Resource was created
 * - `update` - Resource was modified
 * - `delete` - Resource was deleted
 * - `view` - Resource was viewed
 * - `export` - Resource was exported
 * 
 * Authentication actions:
 * - `login` - User logged in
 * - `logout` - User logged out
 * 
 * System actions:
 * - `settings_change` - Settings were modified
 * - `budget_check` - Budget check was performed
 * - `budget_abort` - Operation aborted due to budget
 * - `budget_downgrade` - Service downgraded due to budget
 * - `budget_safety_block` - Blocked for budget safety
 * - `budget_check_failed` - Budget check failed
 * - `processing_timeout` - Processing timed out
 * - `security_event` - Security-related event
 * 
 * @typedef {string} AuditAction
 */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'export'
  | 'login'
  | 'logout'
  | 'settings_change'
  | 'budget_check'
  | 'budget_abort'
  | 'budget_downgrade'
  | 'budget_safety_block'
  | 'budget_check_failed'
  | 'processing_timeout'
  | 'security_event';

// ============================================================================
// State Types
// ============================================================================

/**
 * Application-level authentication state.
 * 
 * @interface AuthState
 * @property {User | null} user - The currently authenticated user, or null
 * @property {boolean} isAuthenticated - Whether a user is currently authenticated
 * @property {boolean} isLoading - Whether authentication state is being determined
 * 
 * @example
 * ```typescript
 * const state: AuthState = {
 *   user: { id: 'user-123', email: 'user@example.com', ... },
 *   isAuthenticated: true,
 *   isLoading: false,
 * };
 * ```
 */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Generic API response wrapper.
 * 
 * @interface ApiResponse
 * @template T - The type of data contained in the response
 * @property {T} data - The response data
 * @property {boolean} success - Whether the request was successful
 * @property {string} [message] - Optional message (usually for errors)
 * 
 * @example
 * ```typescript
 * const response: ApiResponse<Project> = {
 *   data: { id: 'proj-123', name: 'My Project', ... },
 *   success: true,
 * };
 * ```
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

/**
 * Paginated API response wrapper.
 * 
 * @interface PaginatedResponse
 * @template T - The type of items in the response
 * @property {T[]} data - Array of items for the current page
 * @property {number} total - Total number of items across all pages
 * @property {number} page - Current page number (1-indexed)
 * @property {number} pageSize - Number of items per page
 * @property {number} totalPages - Total number of pages
 * 
 * @example
 * ```typescript
 * const response: PaginatedResponse<Document> = {
 *   data: [{ id: 'doc-1', ... }, { id: 'doc-2', ... }],
 *   total: 100,
 *   page: 1,
 *   pageSize: 20,
 *   totalPages: 5,
 * };
 * ```
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input data required to create a new project.
 * 
 * @interface CreateProjectInput
 * @property {string} name - Display name for the project
 * @property {string} description - Description of the project
 * @property {number} [chunkSize] - Target chunk size (defaults to system default)
 * @property {number} [chunkOverlap] - Chunk overlap (defaults to system default)
 * @property {ChunkStrategy} [chunkStrategy] - Chunking strategy (defaults to 'semantic')
 * 
 * @example
 * ```typescript
 * const input: CreateProjectInput = {
 *   name: 'Legal Documents',
 *   description: 'Collection of legal contracts',
 *   chunkSize: 1000,
 *   chunkOverlap: 100,
 *   chunkStrategy: 'semantic',
 * };
 * ```
 */
export interface CreateProjectInput {
  name: string;
  description: string;
  chunkSize?: number;
  chunkOverlap?: number;
  chunkStrategy?: ChunkStrategy;
}

/**
 * Input data for updating an existing project.
 * 
 * All fields are optional - only provided fields will be updated.
 * 
 * @interface UpdateProjectInput
 * @property {string} [name] - New display name
 * @property {string} [description] - New description
 * @property {Project['status']} [status] - New status
 * @property {number} [chunkSize] - New chunk size
 * @property {number} [chunkOverlap] - New chunk overlap
 * @property {ChunkStrategy} [chunkStrategy] - New chunking strategy
 * 
 * @example
 * ```typescript
 * const update: UpdateProjectInput = {
 *   name: 'Updated Project Name',
 *   status: 'archived',
 * };
 * ```
 */
export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: Project['status'];
  chunkSize?: number;
  chunkOverlap?: number;
  chunkStrategy?: ChunkStrategy;
}

// ============================================================================
// Authentication Input Types
// ============================================================================

/**
 * Credentials required for user login.
 * 
 * @interface LoginCredentials
 * @property {string} email - User's email address
 * @property {string} password - User's password
 * 
 * @example
 * ```typescript
 * const credentials: LoginCredentials = {
 *   email: 'user@example.com',
 *   password: 'securePassword123',
 * };
 * ```
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
 * 
 * @example
 * ```typescript
 * const credentials: RegisterCredentials = {
 *   email: 'newuser@example.com',
 *   password: 'securePassword123',
 *   name: 'Jane Doe',
 * };
 * ```
 */
export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}
