// ============= AI Cost Calculator =============
// Centralized cost calculation for AI API calls
// Supports multiple providers and models with up-to-date pricing

// ============= Pricing Constants (USD per 1K tokens) =============

export const AI_PRICING = {
  // OpenAI Models
  'gpt-5': { input: 0.015, output: 0.060 },
  'gpt-5-mini': { input: 0.00375, output: 0.015 },
  'gpt-5-nano': { input: 0.00075, output: 0.003 },
  'gpt-4o': { input: 0.0025, output: 0.010 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4.1': { input: 0.002, output: 0.008 },
  'gpt-4.1-mini': { input: 0.0004, output: 0.0016 },
  'text-embedding-3-small': { input: 0.00002, output: 0 },
  'text-embedding-3-large': { input: 0.00013, output: 0 },
  'text-embedding-ada-002': { input: 0.0001, output: 0 },
  'whisper-1': { input: 0.006, output: 0 }, // per minute

  // Anthropic Models
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-5-haiku': { input: 0.00025, output: 0.00125 },
  'claude-3-opus': { input: 0.015, output: 0.075 },

  // Google Models (Lovable AI)
  'google/gemini-2.5-pro': { input: 0.00125, output: 0.005 },
  'google/gemini-2.5-flash': { input: 0.000075, output: 0.0003 },
  'google/gemini-2.5-flash-lite': { input: 0.00003, output: 0.00015 },
  'google/gemini-3-pro-preview': { input: 0.0015, output: 0.006 },
  'google/gemini-3-flash-preview': { input: 0.0001, output: 0.0004 },

  // OpenAI via Lovable
  'openai/gpt-5': { input: 0.015, output: 0.060 },
  'openai/gpt-5-mini': { input: 0.00375, output: 0.015 },
  'openai/gpt-5-nano': { input: 0.00075, output: 0.003 },
  'openai/gpt-5.2': { input: 0.02, output: 0.08 },
} as const;

export type SupportedModel = keyof typeof AI_PRICING;

// ============= Types =============

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: 'USD';
}

export interface UsageWithCost extends TokenUsage, CostBreakdown {
  model: string;
}

// ============= Cost Calculation Functions =============

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): CostBreakdown {
  const pricing = AI_PRICING[model as SupportedModel];
  
  if (!pricing) {
    // Unknown model - use conservative estimate based on GPT-4o pricing
    console.warn(`[CostCalculator] Unknown model: ${model}, using fallback pricing`);
    return {
      inputCost: (promptTokens / 1000) * 0.0025,
      outputCost: (completionTokens / 1000) * 0.010,
      totalCost: (promptTokens / 1000) * 0.0025 + (completionTokens / 1000) * 0.010,
      currency: 'USD',
    };
  }

  const inputCost = (promptTokens / 1000) * pricing.input;
  const outputCost = (completionTokens / 1000) * pricing.output;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    currency: 'USD',
  };
}

export function calculateEmbeddingCost(
  model: string,
  tokenCount: number
): CostBreakdown {
  const pricing = AI_PRICING[model as SupportedModel] || 
                  AI_PRICING['text-embedding-3-small'];
  
  const inputCost = (tokenCount / 1000) * pricing.input;

  return {
    inputCost,
    outputCost: 0,
    totalCost: inputCost,
    currency: 'USD',
  };
}

export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English
  // More accurate would require tiktoken but this is sufficient for cost estimation
  return Math.ceil(text.length / 4);
}

export function createEmptyUsage(): UsageWithCost {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
    currency: 'USD',
    model: 'none',
  };
}

export function aggregateUsage(usages: UsageWithCost[]): UsageWithCost {
  return usages.reduce((acc, usage) => ({
    promptTokens: acc.promptTokens + usage.promptTokens,
    completionTokens: acc.completionTokens + usage.completionTokens,
    totalTokens: acc.totalTokens + usage.totalTokens,
    inputCost: acc.inputCost + usage.inputCost,
    outputCost: acc.outputCost + usage.outputCost,
    totalCost: acc.totalCost + usage.totalCost,
    currency: 'USD',
    model: usage.model || acc.model, // Keep last non-empty model
  }), createEmptyUsage());
}

// ============= Usage Tracking Helpers =============

export function buildUsageFromResponse(
  model: string,
  promptTokens: number,
  completionTokens: number
): UsageWithCost {
  const cost = calculateCost(model, promptTokens, completionTokens);
  
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    ...cost,
    model,
  };
}

export function buildEmbeddingUsage(
  model: string,
  tokenCount: number,
  batchSize: number = 1
): UsageWithCost {
  const totalTokens = tokenCount * batchSize;
  const cost = calculateEmbeddingCost(model, totalTokens);
  
  return {
    promptTokens: totalTokens,
    completionTokens: 0,
    totalTokens,
    ...cost,
    model,
  };
}

// ============= Formatting Helpers =============

export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(6)}`;
  }
  return `$${cost.toFixed(4)}`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}
