// ============= Centralized AI Model Selection for Edge Functions =============
// Routes AI operations to optimal models based on cost, quality, and capabilities
// Supports Lovable AI Gateway models (Google Gemini, OpenAI GPT-5)

export type AIOperation =
  | 'suggested_questions'
  | 'simple_extraction'
  | 'classification'
  | 'summarization'
  | 'content_generation'
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
  | 'keyword_extraction'
  | 'grammar_check'
  | 'tone_analysis'
  | 'training_data'
  | 'transcription'
  | 'benchmark';

export type ModelTier = 'economy' | 'standard' | 'premium';
export type UserTier = 'free' | 'basic' | 'pro' | 'enterprise';
export type Priority = 'cost' | 'quality' | 'speed';

export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  contextWindow: number;
  capabilities: {
    vision: boolean;
    functionCalling: boolean;
    streaming: boolean;
  };
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
    costPer1kInputTokens: 0.00003,
    costPer1kOutputTokens: 0.00015,
    contextWindow: 1000000,
    capabilities: { vision: true, functionCalling: true, streaming: true },
    performance: { speed: 'fast', quality: 'low' },
  },

  // Standard tier - balanced cost and quality
  'google/gemini-2.5-flash': {
    model: 'google/gemini-2.5-flash',
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.000075,
    costPer1kOutputTokens: 0.0003,
    contextWindow: 1000000,
    capabilities: { vision: true, functionCalling: true, streaming: true },
    performance: { speed: 'fast', quality: 'medium' },
  },

  'google/gemini-3-flash-preview': {
    model: 'google/gemini-3-flash-preview',
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.0001,
    costPer1kOutputTokens: 0.0004,
    contextWindow: 1000000,
    capabilities: { vision: true, functionCalling: true, streaming: true },
    performance: { speed: 'fast', quality: 'medium' },
  },

  'openai/gpt-5-nano': {
    model: 'openai/gpt-5-nano',
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.00075,
    costPer1kOutputTokens: 0.003,
    contextWindow: 128000,
    capabilities: { vision: true, functionCalling: true, streaming: true },
    performance: { speed: 'fast', quality: 'medium' },
  },

  'openai/gpt-5-mini': {
    model: 'openai/gpt-5-mini',
    maxTokens: 16384,
    temperature: 0.7,
    costPer1kInputTokens: 0.00375,
    costPer1kOutputTokens: 0.015,
    contextWindow: 128000,
    capabilities: { vision: true, functionCalling: true, streaming: true },
    performance: { speed: 'medium', quality: 'medium' },
  },

  // Premium tier - highest quality
  'google/gemini-2.5-pro': {
    model: 'google/gemini-2.5-pro',
    maxTokens: 8192,
    temperature: 0.5,
    costPer1kInputTokens: 0.00125,
    costPer1kOutputTokens: 0.005,
    contextWindow: 1000000,
    capabilities: { vision: true, functionCalling: true, streaming: true },
    performance: { speed: 'medium', quality: 'high' },
  },

  'google/gemini-3-pro-preview': {
    model: 'google/gemini-3-pro-preview',
    maxTokens: 8192,
    temperature: 0.5,
    costPer1kInputTokens: 0.0015,
    costPer1kOutputTokens: 0.006,
    contextWindow: 1000000,
    capabilities: { vision: true, functionCalling: true, streaming: true },
    performance: { speed: 'medium', quality: 'high' },
  },

  'openai/gpt-5': {
    model: 'openai/gpt-5',
    maxTokens: 16384,
    temperature: 0.5,
    costPer1kInputTokens: 0.015,
    costPer1kOutputTokens: 0.060,
    contextWindow: 128000,
    capabilities: { vision: true, functionCalling: true, streaming: true },
    performance: { speed: 'slow', quality: 'high' },
  },

  'openai/gpt-5.2': {
    model: 'openai/gpt-5.2',
    maxTokens: 16384,
    temperature: 0.4,
    costPer1kInputTokens: 0.02,
    costPer1kOutputTokens: 0.08,
    contextWindow: 128000,
    capabilities: { vision: true, functionCalling: true, streaming: true },
    performance: { speed: 'slow', quality: 'high' },
  },

  // Embeddings (OpenAI API required)
  'text-embedding-3-small': {
    model: 'text-embedding-3-small',
    maxTokens: 8191,
    temperature: 0,
    costPer1kInputTokens: 0.00002,
    costPer1kOutputTokens: 0,
    contextWindow: 8191,
    capabilities: { vision: false, functionCalling: false, streaming: false },
    performance: { speed: 'fast', quality: 'medium' },
  },
};

// ============= Operation to Model Mapping =============
// Maps operations to their optimal default model based on cost/quality tradeoff

const DEFAULT_MODEL_BY_OPERATION: Record<AIOperation, string> = {
  // Economy operations - use cheapest models
  suggested_questions: 'google/gemini-2.5-flash-lite',
  simple_extraction: 'google/gemini-2.5-flash-lite',
  classification: 'google/gemini-2.5-flash-lite',
  sentiment_analysis: 'google/gemini-2.5-flash-lite',
  keyword_extraction: 'google/gemini-2.5-flash-lite',
  grammar_check: 'google/gemini-2.5-flash-lite',
  benchmark: 'google/gemini-2.5-flash-lite',
  
  // Standard operations - balanced cost/quality
  summarization: 'google/gemini-3-flash-preview',
  content_generation: 'google/gemini-3-flash-preview',
  chat_response: 'google/gemini-3-flash-preview',
  translation: 'google/gemini-3-flash-preview',
  entity_extraction: 'google/gemini-3-flash-preview',
  data_extraction: 'google/gemini-3-flash-preview',
  tone_analysis: 'google/gemini-3-flash-preview',
  training_data: 'google/gemini-3-flash-preview',
  transcription: 'google/gemini-3-flash-preview',
  
  // Premium operations - highest quality needed
  report_generation: 'google/gemini-2.5-pro',
  verification: 'google/gemini-2.5-pro',
  legal_analysis: 'openai/gpt-5',
  code_generation: 'openai/gpt-5',
  visual_analysis: 'google/gemini-2.5-pro',
  chart_extraction: 'google/gemini-2.5-pro',
  
  // Embeddings
  embeddings: 'text-embedding-3-small',
};

// User tier upgrades - higher tiers get better models
const MODEL_UPGRADES_BY_TIER: Record<UserTier, Partial<Record<AIOperation, string>>> = {
  free: {}, // No upgrades
  basic: {}, // No upgrades
  pro: {
    summarization: 'google/gemini-2.5-pro',
    chat_response: 'google/gemini-2.5-pro',
    content_generation: 'google/gemini-2.5-pro',
  },
  enterprise: {
    summarization: 'openai/gpt-5',
    chat_response: 'openai/gpt-5',
    content_generation: 'openai/gpt-5',
    report_generation: 'openai/gpt-5.2',
    verification: 'openai/gpt-5.2',
  },
};

// ============= Model Selection Criteria =============

export interface ModelSelectionCriteria {
  operation: AIOperation;
  requiresVision?: boolean;
  requiresHighQuality?: boolean;
  estimatedInputTokens?: number;
  userTier?: UserTier;
  priority?: Priority;
  forceModel?: string; // Allow explicit override
}

export interface ModelSelectionResult {
  model: string;
  config: ModelConfig;
  reason: string;
  estimatedCostPer1kTokens: number;
  alternatives: Array<{ model: string; reason: string }>;
}

// ============= Selection Functions =============

export function selectOptimalModel(criteria: ModelSelectionCriteria): ModelSelectionResult {
  const {
    operation,
    requiresVision = false,
    requiresHighQuality = false,
    userTier = 'basic',
    priority = 'cost',
    forceModel,
  } = criteria;

  // If model is explicitly specified, use it
  if (forceModel && AVAILABLE_MODELS[forceModel]) {
    return {
      model: forceModel,
      config: AVAILABLE_MODELS[forceModel],
      reason: 'user-specified',
      estimatedCostPer1kTokens: AVAILABLE_MODELS[forceModel].costPer1kInputTokens + AVAILABLE_MODELS[forceModel].costPer1kOutputTokens,
      alternatives: [],
    };
  }

  // Start with default model for operation
  let selectedModel = DEFAULT_MODEL_BY_OPERATION[operation] || 'google/gemini-3-flash-preview';

  // Apply user tier upgrades
  const tierUpgrade = MODEL_UPGRADES_BY_TIER[userTier]?.[operation];
  if (tierUpgrade) {
    selectedModel = tierUpgrade;
  }

  // Apply priority-based adjustments
  if (priority === 'quality' && !requiresHighQuality) {
    // Upgrade to higher quality model
    selectedModel = getHigherQualityModel(selectedModel);
  } else if (priority === 'cost') {
    // Downgrade to cheaper model if possible
    selectedModel = getCheaperModel(selectedModel, operation);
  }

  // Force high quality if required
  if (requiresHighQuality) {
    selectedModel = getHigherQualityModel(selectedModel);
  }

  // Ensure vision capability if needed
  if (requiresVision) {
    const config = AVAILABLE_MODELS[selectedModel];
    if (!config?.capabilities.vision) {
      selectedModel = 'google/gemini-2.5-pro'; // Vision-capable fallback
    }
  }

  const config = AVAILABLE_MODELS[selectedModel];
  if (!config) {
    // Fallback to default
    selectedModel = 'google/gemini-3-flash-preview';
  }

  const finalConfig = AVAILABLE_MODELS[selectedModel];

  return {
    model: selectedModel,
    config: finalConfig,
    reason: buildSelectionReason(criteria, selectedModel),
    estimatedCostPer1kTokens: finalConfig.costPer1kInputTokens + finalConfig.costPer1kOutputTokens,
    alternatives: getAlternativeModels(selectedModel, criteria),
  };
}

function getHigherQualityModel(currentModel: string): string {
  const upgrades: Record<string, string> = {
    'google/gemini-2.5-flash-lite': 'google/gemini-2.5-flash',
    'google/gemini-2.5-flash': 'google/gemini-2.5-pro',
    'google/gemini-3-flash-preview': 'google/gemini-3-pro-preview',
    'openai/gpt-5-nano': 'openai/gpt-5-mini',
    'openai/gpt-5-mini': 'openai/gpt-5',
    'openai/gpt-5': 'openai/gpt-5.2',
  };
  return upgrades[currentModel] || currentModel;
}

function getCheaperModel(currentModel: string, operation: AIOperation): string {
  // Don't downgrade premium operations
  const premiumOps: AIOperation[] = ['legal_analysis', 'code_generation', 'verification', 'report_generation'];
  if (premiumOps.includes(operation)) {
    return currentModel;
  }

  const downgrades: Record<string, string> = {
    'google/gemini-2.5-pro': 'google/gemini-2.5-flash',
    'google/gemini-3-pro-preview': 'google/gemini-3-flash-preview',
    'google/gemini-2.5-flash': 'google/gemini-2.5-flash-lite',
    'openai/gpt-5.2': 'openai/gpt-5',
    'openai/gpt-5': 'openai/gpt-5-mini',
    'openai/gpt-5-mini': 'openai/gpt-5-nano',
  };
  return downgrades[currentModel] || currentModel;
}

function buildSelectionReason(criteria: ModelSelectionCriteria, model: string): string {
  const parts: string[] = [`operation=${criteria.operation}`];
  
  if (criteria.requiresHighQuality) parts.push('high-quality');
  if (criteria.requiresVision) parts.push('vision');
  if (criteria.priority !== 'cost') parts.push(`priority=${criteria.priority}`);
  if (criteria.userTier && criteria.userTier !== 'basic') parts.push(`tier=${criteria.userTier}`);
  
  return parts.join(', ');
}

function getAlternativeModels(selected: string, criteria: ModelSelectionCriteria): Array<{ model: string; reason: string }> {
  const alternatives: Array<{ model: string; reason: string }> = [];
  
  // Suggest cheaper alternative
  const cheaper = getCheaperModel(selected, criteria.operation);
  if (cheaper !== selected) {
    const config = AVAILABLE_MODELS[cheaper];
    alternatives.push({
      model: cheaper,
      reason: `~${((1 - (config.costPer1kInputTokens / AVAILABLE_MODELS[selected].costPer1kInputTokens)) * 100).toFixed(0)}% cheaper`,
    });
  }
  
  // Suggest higher quality alternative
  const higher = getHigherQualityModel(selected);
  if (higher !== selected) {
    alternatives.push({
      model: higher,
      reason: 'higher quality',
    });
  }
  
  return alternatives;
}

// ============= Cost Estimation =============

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): { inputCost: number; outputCost: number; totalCost: number } {
  const config = AVAILABLE_MODELS[model];
  if (!config) {
    console.warn(`[model-selector] Unknown model: ${model}, using fallback pricing`);
    return {
      inputCost: (inputTokens / 1000) * 0.001,
      outputCost: (outputTokens / 1000) * 0.004,
      totalCost: (inputTokens / 1000) * 0.001 + (outputTokens / 1000) * 0.004,
    };
  }

  const inputCost = (inputTokens / 1000) * config.costPer1kInputTokens;
  const outputCost = (outputTokens / 1000) * config.costPer1kOutputTokens;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

export function compareModelCosts(
  inputTokens: number,
  outputTokens: number
): Array<{ model: string; cost: number; savings: number }> {
  const costs = Object.entries(AVAILABLE_MODELS)
    .filter(([, config]) => config.model !== 'text-embedding-3-small')
    .map(([name, config]) => ({
      model: name,
      cost: estimateCost(name, inputTokens, outputTokens).totalCost,
      quality: config.performance.quality,
    }))
    .sort((a, b) => a.cost - b.cost);

  const maxCost = costs[costs.length - 1]?.cost || 0;

  return costs.map(c => ({
    model: c.model,
    cost: c.cost,
    savings: maxCost > 0 ? ((maxCost - c.cost) / maxCost) * 100 : 0,
  }));
}

export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}

// ============= Model Info Helpers =============

export function getModelConfig(model: string): ModelConfig | undefined {
  return AVAILABLE_MODELS[model];
}

export function getDefaultModelForOperation(operation: AIOperation): string {
  return DEFAULT_MODEL_BY_OPERATION[operation] || 'google/gemini-3-flash-preview';
}

export function listAvailableModels(): string[] {
  return Object.keys(AVAILABLE_MODELS);
}

export function getModelsByTier(tier: 'economy' | 'standard' | 'premium'): string[] {
  const tierMapping: Record<string, 'economy' | 'standard' | 'premium'> = {
    'google/gemini-2.5-flash-lite': 'economy',
    'google/gemini-2.5-flash': 'standard',
    'google/gemini-3-flash-preview': 'standard',
    'openai/gpt-5-nano': 'standard',
    'openai/gpt-5-mini': 'standard',
    'google/gemini-2.5-pro': 'premium',
    'google/gemini-3-pro-preview': 'premium',
    'openai/gpt-5': 'premium',
    'openai/gpt-5.2': 'premium',
  };

  return Object.entries(tierMapping)
    .filter(([, t]) => t === tier)
    .map(([model]) => model);
}
