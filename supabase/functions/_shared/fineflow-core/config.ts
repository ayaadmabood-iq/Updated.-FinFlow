/**
 * FineFlow Configuration Service
 * 
 * Centralized environment configuration with Zod validation.
 * Ensures all required variables are present before startup.
 */

// Simple validation schema types (compatible with both Deno and Node.js)
// This avoids external dependencies while providing type safety

export interface ConfigValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

// ============= Configuration Schema =============

export interface FineFlowConfig {
  // Supabase
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
    projectId?: string;
  };
  
  // AI Providers
  ai: {
    lovableApiKey?: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    defaultModel: string;
    embeddingModel: string;
  };
  
  // Pipeline Configuration
  pipeline: {
    maxRetries: number;
    defaultChunkSize: number;
    defaultChunkOverlap: number;
    defaultChunkStrategy: 'fixed' | 'sentence' | 'semantic' | 'embedding_cluster';
  };
  
  // Stage Timeouts (milliseconds)
  timeouts: {
    ingestion: number;
    extraction: number;
    language: number;
    chunking: number;
    summarization: number;
    indexing: number;
  };
  
  // Quotas & Limits
  limits: {
    maxFileSizeBytes: number;
    maxDocumentsPerProject: number;
    maxChunksPerDocument: number;
    embeddingBatchSize: number;
  };
  
  // Feature Flags
  features: {
    enableCaching: boolean;
    enableMetrics: boolean;
    enableCostTracking: boolean;
    enableSemanticChunking: boolean;
  };
  
  // Environment
  environment: 'development' | 'staging' | 'production';
  isProduction: boolean;
}

// ============= Default Values =============

const DEFAULT_CONFIG: Partial<FineFlowConfig> = {
  ai: {
    defaultModel: 'google/gemini-2.5-flash',
    embeddingModel: 'text-embedding-3-small',
  },
  pipeline: {
    maxRetries: 2,
    defaultChunkSize: 1000,
    defaultChunkOverlap: 200,
    defaultChunkStrategy: 'fixed',
  },
  timeouts: {
    ingestion: 30000,
    extraction: 90000,
    language: 15000,
    chunking: 60000,
    summarization: 45000,
    indexing: 120000,
  },
  limits: {
    maxFileSizeBytes: 50 * 1024 * 1024, // 50MB
    maxDocumentsPerProject: 1000,
    maxChunksPerDocument: 5000,
    embeddingBatchSize: 20,
  },
  features: {
    enableCaching: true,
    enableMetrics: true,
    enableCostTracking: true,
    enableSemanticChunking: true,
  },
};

// ============= Environment Variable Reader =============

type EnvReader = (key: string) => string | undefined;

function createEnvReader(): EnvReader {
  // Try Deno first
  try {
    const deno = (globalThis as unknown as { Deno?: { env: { get: (k: string) => string | undefined } } }).Deno;
    if (deno?.env?.get) {
      return (key: string) => deno.env.get(key);
    }
  } catch {
    // Not in Deno environment
  }
  
  // Try Node.js process.env
  try {
    const process = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process;
    if (process?.env) {
      return (key: string) => process.env[key];
    }
  } catch {
    // Not in Node.js environment
  }
  
  // Fallback to empty reader
  return () => undefined;
}

const getEnv = createEnvReader();

// ============= Validation Functions =============

function validateRequired(value: unknown, name: string): string | null {
  if (value === undefined || value === null || value === '') {
    return `Missing required configuration: ${name}`;
  }
  return null;
}

function validateNumber(value: string | undefined, name: string, min?: number, max?: number): { value?: number; error?: string } {
  if (!value) return { value: undefined };
  
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    return { error: `${name} must be a valid number` };
  }
  if (min !== undefined && num < min) {
    return { error: `${name} must be at least ${min}` };
  }
  if (max !== undefined && num > max) {
    return { error: `${name} must be at most ${max}` };
  }
  return { value: num };
}

function validateEnum<T extends string>(value: string | undefined, name: string, allowed: T[]): { value?: T; error?: string } {
  if (!value) return { value: undefined };
  
  if (!allowed.includes(value as T)) {
    return { error: `${name} must be one of: ${allowed.join(', ')}` };
  }
  return { value: value as T };
}

// ============= Configuration Loader =============

export function loadConfig(): ConfigValidationResult<FineFlowConfig> {
  const errors: string[] = [];
  
  // Required Supabase config
  const supabaseUrl = getEnv('SUPABASE_URL');
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');
  const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl) errors.push(validateRequired(supabaseUrl, 'SUPABASE_URL')!);
  if (!supabaseServiceKey) errors.push(validateRequired(supabaseServiceKey, 'SUPABASE_SERVICE_ROLE_KEY')!);
  
  // AI Keys (at least one should be present for AI features)
  const lovableApiKey = getEnv('LOVABLE_API_KEY');
  const openaiApiKey = getEnv('OPENAI_API_KEY');
  const anthropicApiKey = getEnv('ANTHROPIC_API_KEY');
  
  // Optional numeric configs
  const maxRetries = validateNumber(getEnv('PIPELINE_MAX_RETRIES'), 'PIPELINE_MAX_RETRIES', 0, 10);
  if (maxRetries.error) errors.push(maxRetries.error);
  
  const chunkSize = validateNumber(getEnv('DEFAULT_CHUNK_SIZE'), 'DEFAULT_CHUNK_SIZE', 100, 10000);
  if (chunkSize.error) errors.push(chunkSize.error);
  
  const chunkOverlap = validateNumber(getEnv('DEFAULT_CHUNK_OVERLAP'), 'DEFAULT_CHUNK_OVERLAP', 0, 2000);
  if (chunkOverlap.error) errors.push(chunkOverlap.error);
  
  // Chunk strategy
  const chunkStrategy = validateEnum(
    getEnv('DEFAULT_CHUNK_STRATEGY'),
    'DEFAULT_CHUNK_STRATEGY',
    ['fixed', 'sentence', 'semantic', 'embedding_cluster']
  );
  if (chunkStrategy.error) errors.push(chunkStrategy.error);
  
  // Environment
  const envValue = validateEnum(getEnv('ENVIRONMENT') || getEnv('NODE_ENV'), 'ENVIRONMENT', ['development', 'staging', 'production']);
  const environment = envValue.value || 'development';
  
  // Feature flags
  const enableCaching = getEnv('ENABLE_CACHING') !== 'false';
  const enableMetrics = getEnv('ENABLE_METRICS') !== 'false';
  const enableCostTracking = getEnv('ENABLE_COST_TRACKING') !== 'false';
  const enableSemanticChunking = getEnv('ENABLE_SEMANTIC_CHUNKING') !== 'false';
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  const config: FineFlowConfig = {
    supabase: {
      url: supabaseUrl!,
      anonKey: supabaseAnonKey || '',
      serviceRoleKey: supabaseServiceKey!,
      projectId: getEnv('SUPABASE_PROJECT_ID'),
    },
    ai: {
      lovableApiKey,
      openaiApiKey,
      anthropicApiKey,
      defaultModel: getEnv('DEFAULT_AI_MODEL') || DEFAULT_CONFIG.ai!.defaultModel!,
      embeddingModel: getEnv('EMBEDDING_MODEL') || DEFAULT_CONFIG.ai!.embeddingModel!,
    },
    pipeline: {
      maxRetries: maxRetries.value ?? DEFAULT_CONFIG.pipeline!.maxRetries!,
      defaultChunkSize: chunkSize.value ?? DEFAULT_CONFIG.pipeline!.defaultChunkSize!,
      defaultChunkOverlap: chunkOverlap.value ?? DEFAULT_CONFIG.pipeline!.defaultChunkOverlap!,
      defaultChunkStrategy: chunkStrategy.value ?? DEFAULT_CONFIG.pipeline!.defaultChunkStrategy!,
    },
    timeouts: DEFAULT_CONFIG.timeouts!,
    limits: DEFAULT_CONFIG.limits!,
    features: {
      enableCaching,
      enableMetrics,
      enableCostTracking,
      enableSemanticChunking,
    },
    environment,
    isProduction: environment === 'production',
  };
  
  return { success: true, data: config };
}

// ============= Singleton Config Service =============

let cachedConfig: FineFlowConfig | null = null;

export class ConfigService {
  private static instance: ConfigService;
  private config: FineFlowConfig;

  private constructor(config: FineFlowConfig) {
    this.config = config;
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      const result = loadConfig();
      if (!result.success || !result.data) {
        throw new Error(`Configuration validation failed:\n${result.errors?.join('\n')}`);
      }
      ConfigService.instance = new ConfigService(result.data);
    }
    return ConfigService.instance;
  }

  static getConfig(): FineFlowConfig {
    return ConfigService.getInstance().config;
  }

  get supabase() { return this.config.supabase; }
  get ai() { return this.config.ai; }
  get pipeline() { return this.config.pipeline; }
  get timeouts() { return this.config.timeouts; }
  get limits() { return this.config.limits; }
  get features() { return this.config.features; }
  get environment() { return this.config.environment; }
  get isProduction() { return this.config.isProduction; }

  hasAIProvider(): boolean {
    return !!(this.config.ai.lovableApiKey || this.config.ai.openaiApiKey || this.config.ai.anthropicApiKey);
  }

  hasEmbeddingProvider(): boolean {
    return !!this.config.ai.openaiApiKey;
  }
}

// ============= Quick Access Helper =============

export function getConfig(): FineFlowConfig {
  if (!cachedConfig) {
    const result = loadConfig();
    if (!result.success || !result.data) {
      // In non-critical paths, return defaults rather than throwing
      console.warn('Config validation failed, using defaults:', result.errors);
      cachedConfig = {
        supabase: { url: '', anonKey: '', serviceRoleKey: '' },
        ai: DEFAULT_CONFIG.ai as FineFlowConfig['ai'],
        pipeline: DEFAULT_CONFIG.pipeline as FineFlowConfig['pipeline'],
        timeouts: DEFAULT_CONFIG.timeouts as FineFlowConfig['timeouts'],
        limits: DEFAULT_CONFIG.limits as FineFlowConfig['limits'],
        features: DEFAULT_CONFIG.features as FineFlowConfig['features'],
        environment: 'development',
        isProduction: false,
      };
    } else {
      cachedConfig = result.data;
    }
  }
  return cachedConfig;
}
