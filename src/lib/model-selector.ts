// ============= Centralized AI Model Selection =============
// Client-side model selection utilities for cost estimation and analytics

export type AIOperation =
  | 'suggested_questions'
  | 'simple_extraction'
  | 'classification'
  | 'summarization'
  | 'report_generation'
  | 'chat_response'
  | 'embeddings'
  | 'translation'
  | 'verification'
  | 'legal_analysis'
  | 'visual_analysis'
  | 'chart_extraction'
  | 'entity_extraction'
  | 'code_generation'
  | 'data_extraction'
  | 'sentiment_analysis'
  | 'content_generation';

export type ModelTier = 'economy' | 'standard' | 'premium';
export type UserTier = 'free' | 'basic' | 'pro' | 'enterprise';
export type Priority = 'cost' | 'quality' | 'speed';

export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  costPer1MInputTokens: number; // USD per 1M tokens
  costPer1MOutputTokens: number; // USD per 1M tokens
  contextWindow: number;
  capabilities: AIOperation[];
  performance: {
    speed: 'fast' | 'medium' | 'slow';
    quality: 'high' | 'medium' | 'low';
  };
}

// ============= Lovable AI Gateway Models =============
export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  // Economy tier - fastest and cheapest
  'google/gemini-2.5-flash-lite': {
    model: 'google/gemini-2.5-flash-lite',
    maxTokens: 8192,
    temperature: 0.7,
    costPer1MInputTokens: 0.03, // $0.00003/1k = $0.03/1M
    costPer1MOutputTokens: 0.15,
    contextWindow: 1000000,
    capabilities: ['suggested_questions', 'simple_extraction', 'classification', 'summarization', 'chat_response', 'translation', 'sentiment_analysis'],
    performance: { speed: 'fast', quality: 'low' },
  },

  // Standard tier - balanced
  'google/gemini-2.5-flash': {
    model: 'google/gemini-2.5-flash',
    maxTokens: 8192,
    temperature: 0.7,
    costPer1MInputTokens: 0.075,
    costPer1MOutputTokens: 0.3,
    contextWindow: 1000000,
    capabilities: ['suggested_questions', 'simple_extraction', 'classification', 'summarization', 'chat_response', 'translation', 'content_generation', 'entity_extraction', 'data_extraction'],
    performance: { speed: 'fast', quality: 'medium' },
  },

  'google/gemini-3-flash-preview': {
    model: 'google/gemini-3-flash-preview',
    maxTokens: 8192,
    temperature: 0.7,
    costPer1MInputTokens: 0.1,
    costPer1MOutputTokens: 0.4,
    contextWindow: 1000000,
    capabilities: ['suggested_questions', 'simple_extraction', 'classification', 'summarization', 'chat_response', 'translation', 'content_generation', 'entity_extraction', 'data_extraction'],
    performance: { speed: 'fast', quality: 'medium' },
  },

  'openai/gpt-5-mini': {
    model: 'openai/gpt-5-mini',
    maxTokens: 16384,
    temperature: 0.7,
    costPer1MInputTokens: 3.75,
    costPer1MOutputTokens: 15,
    contextWindow: 128000,
    capabilities: ['summarization', 'chat_response', 'content_generation', 'entity_extraction', 'data_extraction', 'code_generation'],
    performance: { speed: 'medium', quality: 'medium' },
  },

  // Premium tier - highest quality
  'google/gemini-2.5-pro': {
    model: 'google/gemini-2.5-pro',
    maxTokens: 8192,
    temperature: 0.5,
    costPer1MInputTokens: 1.25,
    costPer1MOutputTokens: 5,
    contextWindow: 1000000,
    capabilities: ['report_generation', 'chat_response', 'summarization', 'verification', 'visual_analysis', 'chart_extraction', 'legal_analysis'],
    performance: { speed: 'medium', quality: 'high' },
  },

  'openai/gpt-5': {
    model: 'openai/gpt-5',
    maxTokens: 16384,
    temperature: 0.5,
    costPer1MInputTokens: 15,
    costPer1MOutputTokens: 60,
    contextWindow: 128000,
    capabilities: ['report_generation', 'chat_response', 'summarization', 'code_generation', 'legal_analysis', 'verification'],
    performance: { speed: 'slow', quality: 'high' },
  },

  // Embeddings
  'text-embedding-3-small': {
    model: 'text-embedding-3-small',
    maxTokens: 8191,
    temperature: 0,
    costPer1MInputTokens: 0.02,
    costPer1MOutputTokens: 0,
    contextWindow: 8191,
    capabilities: ['embeddings'],
    performance: { speed: 'fast', quality: 'medium' },
  },
};

const DEFAULT_MODEL_BY_OPERATION: Record<AIOperation, string> = {
  // Economy operations
  suggested_questions: 'google/gemini-2.5-flash-lite',
  simple_extraction: 'google/gemini-2.5-flash-lite',
  classification: 'google/gemini-2.5-flash-lite',
  sentiment_analysis: 'google/gemini-2.5-flash-lite',
  
  // Standard operations
  summarization: 'google/gemini-3-flash-preview',
  chat_response: 'google/gemini-3-flash-preview',
  translation: 'google/gemini-3-flash-preview',
  content_generation: 'google/gemini-3-flash-preview',
  entity_extraction: 'google/gemini-3-flash-preview',
  data_extraction: 'google/gemini-3-flash-preview',
  
  // Premium operations
  report_generation: 'google/gemini-2.5-pro',
  verification: 'google/gemini-2.5-pro',
  legal_analysis: 'openai/gpt-5',
  visual_analysis: 'google/gemini-2.5-pro',
  chart_extraction: 'google/gemini-2.5-pro',
  code_generation: 'openai/gpt-5',
  
  // Embeddings
  embeddings: 'text-embedding-3-small',
};

const MODEL_BY_TIER: Record<ModelTier, Partial<Record<AIOperation, string>>> = {
  economy: {
    suggested_questions: 'google/gemini-2.5-flash-lite',
    simple_extraction: 'google/gemini-2.5-flash-lite',
    classification: 'google/gemini-2.5-flash-lite',
    summarization: 'google/gemini-2.5-flash',
    chat_response: 'google/gemini-2.5-flash',
    sentiment_analysis: 'google/gemini-2.5-flash-lite',
  },
  standard: {
    summarization: 'google/gemini-3-flash-preview',
    chat_response: 'google/gemini-3-flash-preview',
    content_generation: 'google/gemini-3-flash-preview',
  },
  premium: {
    report_generation: 'google/gemini-2.5-pro',
    verification: 'google/gemini-2.5-pro',
    code_generation: 'openai/gpt-5',
  },
};

const cache = new Map<AIOperation, ModelConfig>();

export function clearModelCache(): void {
  cache.clear();
}

export function getCachedModelConfig(operation: AIOperation): ModelConfig {
  const cached = cache.get(operation);
  if (cached) return cached;
  const cfg = selectModel(operation);
  cache.set(operation, cfg);
  return cfg;
}

export function selectModel(operation: AIOperation): ModelConfig {
  const modelName = DEFAULT_MODEL_BY_OPERATION[operation];
  if (!modelName) {
    throw new Error(`Unknown operation: ${String(operation)}`);
  }
  const config = AVAILABLE_MODELS[modelName];
  if (!config) throw new Error(`Unknown model config: ${modelName}`);

  // Apply operation overrides
  if (operation === 'classification') {
    return { ...config, temperature: 0.2, maxTokens: 200 };
  }
  if (operation === 'report_generation') {
    return { ...config, temperature: 0.3, maxTokens: 4000 };
  }
  if (operation === 'embeddings') {
    return { ...config, temperature: 0, maxTokens: 8191 };
  }

  return config;
}

export function selectModelByTier(operation: AIOperation, tier: ModelTier): ModelConfig {
  const tierModel = MODEL_BY_TIER[tier]?.[operation];
  const name = tierModel || DEFAULT_MODEL_BY_OPERATION[operation];

  // If tier model unavailable, fallback to default
  if (!name) return selectModel(operation);

  const config = AVAILABLE_MODELS[name];
  if (!config) return selectModel(operation);

  // Apply same operation overrides
  if (operation === 'classification') {
    return { ...config, temperature: 0.2, maxTokens: 200 };
  }
  if (operation === 'report_generation') {
    return { ...config, temperature: 0.3, maxTokens: 4000 };
  }
  if (operation === 'embeddings') {
    return { ...config, temperature: 0, maxTokens: 8191 };
  }

  return config;
}

export function estimateCost(operation: AIOperation, inputTokens: number, outputTokens: number) {
  const config = selectModel(operation);
  const inputCost = (inputTokens / 1_000_000) * config.costPer1MInputTokens;
  const outputCost = operation === 'embeddings' ? 0 : (outputTokens / 1_000_000) * config.costPer1MOutputTokens;
  const totalCost = inputCost + outputCost;

  return {
    model: config.model,
    inputCost,
    outputCost,
    totalCost,
    currency: 'USD' as const,
  };
}

export function getOperationsForModel(modelName: string): AIOperation[] {
  const config = AVAILABLE_MODELS[modelName];
  return config?.capabilities || [];
}

export function selectBatchModel(operation: AIOperation, itemCount: number, avgTokensPerItem: number) {
  // Prefer economy for large batches
  const tier: ModelTier = itemCount >= 200 ? 'economy' : 'standard';
  const config = selectModelByTier(operation, tier);

  const estimate = estimateCost(operation, itemCount * avgTokensPerItem, Math.round(itemCount * avgTokensPerItem * 0.5));

  return {
    ...config,
    estimatedTotalCost: estimate.totalCost,
  };
}
