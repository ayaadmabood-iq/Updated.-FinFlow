// ============= Pipeline Types =============
// Shared types for the decomposed processing pipeline
// Version: 5.0 - Artifact tracking and versioning for RAG platform

// ============= Version Constants =============
export const PIPELINE_VERSION = 'v5.0-artifacts';
export const EXECUTOR_VERSIONS = {
  ingestion: 'v1',
  extraction: 'v1',
  language: 'v1',
  chunking: 'v1',
  summarization: 'v1',
  indexing: 'v1',
} as const;

// ============= Stage Types =============
export type PipelineStage = 
  | 'ingestion' 
  | 'text_extraction' 
  | 'language_detection' 
  | 'chunking' 
  | 'summarization' 
  | 'indexing';

export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

// Version info tracked for each stage execution
export interface VersionInfo {
  pipeline_version: string;
  executor_version: string;
  chunking_config_hash?: string;
  embedding_model?: string;
  embedding_model_version?: string;
  extracted_text_hash?: string;
}

export interface StageResult {
  stage: PipelineStage;
  status: StageStatus;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error?: string;
  result_summary?: Record<string, unknown>;
  executor_version?: string;
  version_info?: VersionInfo; // Added for artifact tracking
}

// ============= Executor Input Contracts =============
// Each executor receives ONLY what it needs - references, not raw data
// Index signature added for Record<string, unknown> compatibility

/** Base input for all executors - minimal, reference-based */
export interface ExecutorBaseInput {
  [key: string]: unknown;
  documentId: string;
  projectId: string;
  version: string;
}

/** Ingestion Executor - validates document exists in storage */
export interface IngestionExecutorInput extends ExecutorBaseInput {
  storagePath: string;
}

/** Extraction Executor - reads from storage, writes extracted text to DB */
export interface ExtractionExecutorInput extends ExecutorBaseInput {
  storagePath: string;
  mimeType: string;
}

/** Language Executor - reads extracted_text from DB, writes language to DB */
export interface LanguageExecutorInput extends ExecutorBaseInput {
  // No extra fields - reads from documents.extracted_text
}

/** Chunking Executor - reads from DB, writes chunks to DB */
export interface ChunkingExecutorInput extends ExecutorBaseInput {
  chunkSize: number;
  chunkOverlap: number;
  chunkStrategy: 'semantic' | 'fixed' | 'sentence';
}

/** Summarization Executor - reads from DB, writes summary to DB */
export interface SummarizationExecutorInput extends ExecutorBaseInput {
  // No extra fields - reads from documents.extracted_text
}

/** Indexing Executor - reads chunks from DB, writes embeddings to DB */
export interface IndexingExecutorInput extends ExecutorBaseInput {
  // No extra fields - reads from documents + chunks tables
}

// ============= Executor Output Contracts =============
// Strict, versioned outputs for each executor

export interface ExecutorBaseOutput {
  success: boolean;
  version: string;
  error?: string;
}

export interface IngestionOutput extends ExecutorBaseOutput {
  data?: {
    bytesDownloaded: number;
    validated: boolean;
    storagePath: string;
  };
}

export interface ExtractionOutput extends ExecutorBaseOutput {
  data?: {
    extractedLength: number;
    cleanedLength: number;
    extractionMethod: string;
    textStoredAt: string;
    extractedTextHash: string; // Hash for version tracking
  };
}

export interface LanguageOutput extends ExecutorBaseOutput {
  data?: {
    language: string;
    confidence?: number;
  };
}

export interface ChunkingOutput extends ExecutorBaseOutput {
  data?: {
    chunkCount: number;
    duplicateCount: number;
    wordCount: number;
    qualityScore: number;
    chunkIds: string[];
    chunkingConfig: {
      size: number;
      overlap: number;
      strategy: string;
    };
    chunkingConfigHash: string; // Hash for version tracking
  };
}

export interface SummarizationOutput extends ExecutorBaseOutput {
  data?: {
    summaryLength: number;
    summaryStoredAt: string;
  };
}

export interface IndexingOutput extends ExecutorBaseOutput {
  data?: {
    documentEmbedding: boolean;
    chunkEmbeddingsCount: number;
    embeddedChunkIds: string[];
    embeddingModel: string; // Model used for version tracking
    embeddingModelVersion: string;
  };
}

// ============= Document Metadata =============
export interface DocumentMetadata {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgSentenceLength: number;
  avgWordLength: number;
  uniqueWordRatio: number;
  hasStructure: boolean;
  estimatedReadingTime: number;
  contentType: string;
  fileExtension: string;
}

export interface ProcessedChunk {
  content: string;
  hash: string;
  isDuplicate: boolean;
}

// ============= Orchestrator Configuration =============
export interface OrchestratorConfig {
  maxRetries: number;
  stageTimeouts: Record<PipelineStage, number>;
  criticalStages: PipelineStage[];
  continueOnOptionalFailure: boolean;
}

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  maxRetries: 2,
  stageTimeouts: {
    ingestion: 30000,
    text_extraction: 60000,
    language_detection: 25000,
    chunking: 45000,
    summarization: 30000,
    indexing: 60000,
  },
  criticalStages: ['ingestion', 'text_extraction', 'chunking'],
  continueOnOptionalFailure: true,
};

// ============= Intermediate Artifact Storage =============
// For future parallel execution and partial reprocessing

export interface PipelineArtifact {
  documentId: string;
  stage: PipelineStage;
  artifactType: 'reference' | 'metadata';
  data: Record<string, unknown>;
  createdAt: string;
  expiresAt?: string;
}

// ============= MIME type constants =============
export const TEXT_MIME_TYPES = [
  'text/plain', 'text/html', 'text/markdown', 'text/csv',
  'application/json', 'application/xml',
];
export const PDF_MIME_TYPE = 'application/pdf';
export const DOCX_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword', 'application/vnd.ms-word',
];
export const AUDIO_MIME_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
  'audio/flac', 'audio/m4a', 'audio/webm',
];
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
export const IMAGE_MIME_TYPES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif',
  'image/webp', 'image/bmp', 'image/tiff',
];

// ============= Legacy Compatibility =============
// Keep old StageInput for backward compatibility during migration

/** @deprecated Use specific executor input types instead */
export interface StageInput {
  documentId: string;
  storagePath: string;
  mimeType: string;
  projectId: string;
  chunkSize: number;
  chunkOverlap: number;
  chunkStrategy: 'semantic' | 'fixed' | 'sentence';
  language?: string;
}

/** @deprecated Use specific executor output types instead */
export interface StageOutput {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// Legacy type aliases for backward compatibility
export type TextExtractionOutput = ExtractionOutput;
export type LanguageDetectionOutput = LanguageOutput;
