// ============= Execution Contracts v4 =============
// Strict input/output contracts with validation for all pipeline stages
// Standardized StageResult pattern for all executors
// Enables backward compatibility, versioning, and contract enforcement
// v4: Added usage metrics for cost tracking

// ============= Version Constants =============
export const CONTRACT_VERSION = '4.0';

export const EXECUTOR_CONTRACTS = {
  ingestion: { version: 'v3', minVersion: 'v1' },
  extraction: { version: 'v3', minVersion: 'v1' },
  language: { version: 'v3', minVersion: 'v1' },
  chunking: { version: 'v3', minVersion: 'v1' },
  summarization: { version: 'v3', minVersion: 'v1' },
  indexing: { version: 'v3', minVersion: 'v1' },
} as const;

// Stage timeout configuration (milliseconds)
export const STAGE_TIMEOUTS: Record<string, number> = {
  ingestion: 30000,      // 30s - file validation
  text_extraction: 90000, // 90s - OCR can be slow
  language_detection: 15000, // 15s - quick AI call
  chunking: 60000,       // 60s - large docs
  summarization: 45000,  // 45s - AI summarization
  indexing: 120000,      // 120s - embedding generation
};

// ============= Usage Metrics =============
export interface UsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  model?: string;
}

export function createEmptyUsageMetrics(): UsageMetrics {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
  };
}

// ============= Standardized Stage Result =============
export interface StageResult<TData = unknown> {
  success: boolean;
  version: string;
  error?: string;
  data?: TData | undefined;
  metrics: StageMetrics;
  usage: UsageMetrics;
}

// Helper type for error results
export type StageErrorResult = StageResult<undefined>;

export interface StageMetrics {
  durationMs: number;
  inputSizeBytes?: number;
  outputSizeBytes?: number;
  retryCount?: number;
  additionalInfo?: Record<string, unknown>;
}

// ============= Type-safe Stage Outputs =============
export interface IngestionResultData {
  bytesDownloaded: number;
  validated: boolean;
  storagePath: string;
}

export interface ExtractionResultData {
  extractedLength: number;
  cleanedLength: number;
  extractionMethod: string;
  textStoredAt: string;
  extractedTextHash: string;
}

export interface LanguageResultData {
  language: string;
  confidence?: number;
  isRTL: boolean;
}

export interface ChunkingResultData {
  chunkCount: number;
  duplicateCount: number;
  wordCount: number;
  qualityScore: number;
  chunkIds: string[];
  chunkingConfigHash: string;
}

export interface SummarizationResultData {
  summaryLength: number;
  summaryStoredAt: string;
}

export interface IndexingResultData {
  documentEmbedding: boolean;
  chunkEmbeddingsCount: number;
  embeddedChunkIds: string[];
  embeddingModel: string;
  embeddingModelVersion: string;
}

// ============= Stage Input Contracts =============
export interface BaseStageInput {
  documentId: string;
  projectId: string;
  version: string;
}

export interface IngestionInput extends BaseStageInput {
  storagePath: string;
}

export interface ExtractionInput extends BaseStageInput {
  storagePath: string;
  mimeType: string;
}

export interface LanguageInput extends BaseStageInput {
  // Language reads extracted_text from DB
}

export interface ChunkingInput extends BaseStageInput {
  chunkSize: number;
  chunkOverlap: number;
  chunkStrategy: 'semantic' | 'fixed' | 'sentence' | 'embedding_cluster';
}

export interface SummarizationInput extends BaseStageInput {
  // Summarization reads extracted_text from DB
}

export interface IndexingInput extends BaseStageInput {
  // Indexing reads text and chunks from DB
}

// ============= Validation Helpers =============
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface SchemaDefinition {
  [field: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required?: boolean;
    minLength?: number;
    min?: number;
    max?: number;
    enum?: string[];
  };
}

export function validateSchema(
  input: unknown,
  schema: SchemaDefinition
): ValidationResult {
  const errors: string[] = [];
  
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Input must be an object'] };
  }
  
  const obj = input as Record<string, unknown>;
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = obj[field];
    
    if (rules.required && (value === undefined || value === null)) {
      errors.push(`Missing required field: ${field}`);
      continue;
    }
    
    if (value !== undefined && value !== null) {
      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push(`Field ${field} must be a string`);
      } else if (rules.type === 'number' && typeof value !== 'number') {
        errors.push(`Field ${field} must be a number`);
      } else if (rules.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`Field ${field} must be a boolean`);
      } else if (rules.type === 'array' && !Array.isArray(value)) {
        errors.push(`Field ${field} must be an array`);
      }
      
      if (rules.minLength !== undefined && typeof value === 'string' && value.length < rules.minLength) {
        errors.push(`Field ${field} must be at least ${rules.minLength} characters`);
      }
      
      if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
        errors.push(`Field ${field} must be at least ${rules.min}`);
      }
      
      if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
        errors.push(`Field ${field} must be at most ${rules.max}`);
      }
      
      if (rules.enum && !rules.enum.includes(value as string)) {
        errors.push(`Field ${field} must be one of: ${rules.enum.join(', ')}`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// ============= Input Schemas =============
export const INGESTION_INPUT_SCHEMA: SchemaDefinition = {
  documentId: { type: 'string', required: true, minLength: 1 },
  projectId: { type: 'string', required: true, minLength: 1 },
  storagePath: { type: 'string', required: true, minLength: 1 },
  version: { type: 'string', required: true },
};

export const EXTRACTION_INPUT_SCHEMA: SchemaDefinition = {
  documentId: { type: 'string', required: true, minLength: 1 },
  projectId: { type: 'string', required: true, minLength: 1 },
  storagePath: { type: 'string', required: true, minLength: 1 },
  mimeType: { type: 'string', required: true, minLength: 1 },
  version: { type: 'string', required: true },
};

export const LANGUAGE_INPUT_SCHEMA: SchemaDefinition = {
  documentId: { type: 'string', required: true, minLength: 1 },
  projectId: { type: 'string', required: true, minLength: 1 },
  version: { type: 'string', required: true },
};

export const CHUNKING_INPUT_SCHEMA: SchemaDefinition = {
  documentId: { type: 'string', required: true, minLength: 1 },
  projectId: { type: 'string', required: true, minLength: 1 },
  chunkSize: { type: 'number', required: true, min: 100, max: 10000 },
  chunkOverlap: { type: 'number', required: true, min: 0, max: 1000 },
  chunkStrategy: { type: 'string', required: true, enum: ['semantic', 'fixed', 'sentence', 'embedding_cluster'] },
  version: { type: 'string', required: true },
};

export const SUMMARIZATION_INPUT_SCHEMA: SchemaDefinition = {
  documentId: { type: 'string', required: true, minLength: 1 },
  projectId: { type: 'string', required: true, minLength: 1 },
  version: { type: 'string', required: true },
};

export const INDEXING_INPUT_SCHEMA: SchemaDefinition = {
  documentId: { type: 'string', required: true, minLength: 1 },
  projectId: { type: 'string', required: true, minLength: 1 },
  version: { type: 'string', required: true },
};

// ============= Contract Validation Functions =============
export function validateIngestionInput(input: unknown): ValidationResult {
  return validateSchema(input, INGESTION_INPUT_SCHEMA);
}

export function validateExtractionInput(input: unknown): ValidationResult {
  return validateSchema(input, EXTRACTION_INPUT_SCHEMA);
}

export function validateLanguageInput(input: unknown): ValidationResult {
  return validateSchema(input, LANGUAGE_INPUT_SCHEMA);
}

export function validateChunkingInput(input: unknown): ValidationResult {
  return validateSchema(input, CHUNKING_INPUT_SCHEMA);
}

export function validateSummarizationInput(input: unknown): ValidationResult {
  return validateSchema(input, SUMMARIZATION_INPUT_SCHEMA);
}

export function validateIndexingInput(input: unknown): ValidationResult {
  return validateSchema(input, INDEXING_INPUT_SCHEMA);
}

// ============= Version Compatibility =============
export function isVersionCompatible(
  executorVersion: string,
  contractVersion: string
): boolean {
  const extractVersion = (v: string) => parseInt(v.replace(/[^\d]/g, ''), 10) || 0;
  return extractVersion(executorVersion) >= extractVersion(contractVersion);
}

// ============= Stage Result Builder =============
export function buildSuccessResult<TData>(
  version: string,
  startTime: number,
  data: TData,
  additionalMetrics?: Partial<StageMetrics>,
  usage?: UsageMetrics
): StageResult<TData> {
  return {
    success: true,
    version,
    data,
    metrics: {
      durationMs: Date.now() - startTime,
      ...additionalMetrics,
    },
    usage: usage || createEmptyUsageMetrics(),
  };
}

export function buildErrorResult(
  version: string,
  startTime: number,
  error: string,
  additionalMetrics?: Partial<StageMetrics>,
  usage?: UsageMetrics
): StageResult<never> {
  return {
    success: false,
    version,
    error,
    metrics: {
      durationMs: Date.now() - startTime,
      ...additionalMetrics,
    },
    usage: usage || createEmptyUsageMetrics(),
  } as StageResult<never>;
}

// Legacy function for backward compatibility - uses function overloads for type safety
export function buildStageResult<TData>(
  success: true,
  version: string,
  startTime: number,
  data: TData,
  error?: undefined,
  additionalMetrics?: Partial<StageMetrics>,
  usage?: UsageMetrics
): StageResult<TData>;
export function buildStageResult<TData>(
  success: false,
  version: string,
  startTime: number,
  data: undefined,
  error: string,
  additionalMetrics?: Partial<StageMetrics>,
  usage?: UsageMetrics
): StageResult<TData>;
export function buildStageResult<TData>(
  success: boolean,
  version: string,
  startTime: number,
  data?: TData,
  error?: string,
  additionalMetrics?: Partial<StageMetrics>,
  usage?: UsageMetrics
): StageResult<TData> {
  const durationMs = Date.now() - startTime;
  
  return {
    success,
    version,
    data,
    error,
    metrics: {
      durationMs,
      ...additionalMetrics,
    },
    usage: usage || createEmptyUsageMetrics(),
  } as StageResult<TData>;
}

// ============= Idempotency Key Generation =============
export function generateIdempotencyKey(
  documentId: string,
  stage: string,
  configHash?: string
): string {
  const baseKey = `${documentId}:${stage}`;
  return configHash ? `${baseKey}:${configHash}` : baseKey;
}

// ============= Stage State Preservation =============
export interface StageState {
  stage: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
  outputHash?: string;
  executorVersion?: string;
  canResume: boolean;
}

export function determineResumePoint(
  processingSteps: StageState[],
  targetStage?: string
): { resumeFrom: string | null; preservedStages: string[] } {
  const stageOrder = ['ingestion', 'text_extraction', 'language_detection', 'chunking', 'summarization', 'indexing'];
  
  const completedStages = processingSteps
    .filter(s => s.status === 'completed')
    .map(s => s.stage);
  
  if (targetStage) {
    const targetIndex = stageOrder.indexOf(targetStage);
    return {
      resumeFrom: targetStage,
      preservedStages: completedStages.filter(s => stageOrder.indexOf(s) < targetIndex),
    };
  }
  
  // Find the first non-completed stage
  for (const stage of stageOrder) {
    if (!completedStages.includes(stage)) {
      return {
        resumeFrom: stage,
        preservedStages: completedStages,
      };
    }
  }
  
  return { resumeFrom: null, preservedStages: completedStages };
}

// ============= RTL Language Detection =============
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur', 'yi', 'dv', 'ku', 'ps', 'sd', 'ug'];

export function isRTLLanguage(languageCode: string): boolean {
  const baseCode = languageCode.toLowerCase().split('-')[0];
  return RTL_LANGUAGES.includes(baseCode);
}

// ============= Error Classification =============
export type ErrorCategory = 'validation' | 'network' | 'timeout' | 'auth' | 'resource' | 'ai' | 'unknown';

export function classifyError(error: Error | string): ErrorCategory {
  const message = typeof error === 'string' ? error : error.message;
  const lower = message.toLowerCase();
  
  if (lower.includes('validation') || lower.includes('missing required')) {
    return 'validation';
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'timeout';
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('connection')) {
    return 'network';
  }
  if (lower.includes('auth') || lower.includes('unauthorized') || lower.includes('forbidden')) {
    return 'auth';
  }
  if (lower.includes('not found') || lower.includes('no text') || lower.includes('empty')) {
    return 'resource';
  }
  if (lower.includes('ai') || lower.includes('openai') || lower.includes('gemini')) {
    return 'ai';
  }
  
  return 'unknown';
}

export function isRetryableError(category: ErrorCategory): boolean {
  return ['network', 'timeout', 'ai'].includes(category);
}
