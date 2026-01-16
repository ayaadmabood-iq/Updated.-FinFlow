/**
 * FineFlow Core - Framework-Agnostic Business Logic
 * 
 * This module provides the core abstractions for backend portability.
 * All exports are compatible with both Deno (Edge Functions) and Node.js (NestJS).
 */

// Exceptions & Error Handling
export {
  ErrorCode,
  FineFlowException,
  ValidationException,
  AuthenticationException,
  AuthorizationException,
  NotFoundException,
  QuotaExceededException,
  BudgetExceededException,
  ProcessingException,
  AIException,
  ConfigurationException,
  DatabaseException,
  StorageException,
  wrapError,
  type ErrorDetails,
} from './exceptions.ts';

// Logging
export {
  FineFlowLogger,
  getLogger,
  createRequestLogger,
  logStageExecution,
  withLogging,
  type LogLevel,
  type LogContext,
  type LogEntry,
  type ILogger,
} from './logger.ts';

// Configuration
export {
  ConfigService,
  getConfig,
  loadConfig,
  type FineFlowConfig,
  type ConfigValidationResult,
} from './config.ts';

// Provider Interfaces & Implementations
export {
  type IDatabaseProvider,
  type IStorageProvider,
  type IAIProvider,
  type IProviderFactory,
  type QueryOptions,
  type OperationResult,
  type DocumentRecord,
  type ChunkRecord,
  type ChunkInsert,
  type ProjectRecord,
  type AIMessage,
  type AICompletionOptions,
  type AICompletionResult,
  type EmbeddingOptions,
  type EmbeddingResult,
  type BatchEmbeddingResult,
  SupabaseProvider,
} from './providers/index.ts';

export { getProvider, createProvider } from './providers/supabase-provider.ts';
