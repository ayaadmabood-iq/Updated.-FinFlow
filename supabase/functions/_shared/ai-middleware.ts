// ============= AI Middleware =============
// Centralized AI call handling with safety, cost, and quality controls
// All AI Edge Functions should use this middleware

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============= Types =============

export interface AICallConfig {
  taskType: keyof typeof MODEL_SELECTION;
  projectId?: string;
  userId?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  bypassBudgetCheck?: boolean;
}

export interface AICallResult {
  success: boolean;
  content: string | null;
  model: string;
  tokensUsed: number;
  costUsd: number;
  cached: boolean;
  error?: string;
  injectionDetected?: boolean;
  budgetExceeded?: boolean;
}

export interface InjectionCheckResult {
  detected: boolean;
  patterns: string[];
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  sanitizedInput?: string;
}

// ============= Model Selection Strategy =============

export const MODEL_COSTS: Record<string, { inputPer1k: number; outputPer1k: number }> = {
  // Lovable AI Gateway models (approximate costs)
  'google/gemini-3-flash-preview': { inputPer1k: 0.0001, outputPer1k: 0.0002 },
  'google/gemini-2.5-flash': { inputPer1k: 0.00015, outputPer1k: 0.00025 },
  'google/gemini-2.5-flash-lite': { inputPer1k: 0.00005, outputPer1k: 0.0001 },
  'google/gemini-2.5-pro': { inputPer1k: 0.0005, outputPer1k: 0.001 },
  'openai/gpt-5-nano': { inputPer1k: 0.0001, outputPer1k: 0.0002 },
  'openai/gpt-5-mini': { inputPer1k: 0.0003, outputPer1k: 0.0006 },
  'openai/gpt-5': { inputPer1k: 0.001, outputPer1k: 0.002 },
};

export const MODEL_SELECTION: Record<string, { 
  primary: string; 
  fallback: string; 
  complexity: 'simple' | 'medium' | 'complex';
  description: string;
}> = {
  // Simple tasks - use fast/cheap models
  translation: { 
    primary: 'google/gemini-2.5-flash-lite', 
    fallback: 'google/gemini-2.5-flash',
    complexity: 'simple',
    description: 'Query translation between languages',
  },
  classification: { 
    primary: 'google/gemini-2.5-flash-lite', 
    fallback: 'openai/gpt-5-nano',
    complexity: 'simple',
    description: 'Text classification and categorization',
  },
  suggested_questions: { 
    primary: 'google/gemini-2.5-flash', 
    fallback: 'google/gemini-3-flash-preview',
    complexity: 'simple',
    description: 'Generate follow-up questions',
  },
  
  // Medium complexity - balanced models
  summarization: { 
    primary: 'google/gemini-3-flash-preview', 
    fallback: 'openai/gpt-5-mini',
    complexity: 'medium',
    description: 'Document summarization',
  },
  content_generation: { 
    primary: 'google/gemini-3-flash-preview', 
    fallback: 'openai/gpt-5-mini',
    complexity: 'medium',
    description: 'Blog posts, emails, general content',
  },
  data_extraction: { 
    primary: 'google/gemini-2.5-flash', 
    fallback: 'google/gemini-3-flash-preview',
    complexity: 'medium',
    description: 'Extract structured data from text',
  },
  chat: { 
    primary: 'google/gemini-3-flash-preview', 
    fallback: 'openai/gpt-5-mini',
    complexity: 'medium',
    description: 'RAG-based chat responses',
  },
  
  // Complex reasoning - premium models only when needed
  verification: { 
    primary: 'google/gemini-2.5-flash', 
    fallback: 'google/gemini-2.5-pro',
    complexity: 'complex',
    description: 'Fact-checking and verification',
  },
  legal_analysis: { 
    primary: 'google/gemini-2.5-pro', 
    fallback: 'openai/gpt-5',
    complexity: 'complex',
    description: 'Contract analysis, legal documents',
  },
  training_data: { 
    primary: 'google/gemini-2.5-flash', 
    fallback: 'openai/gpt-5-mini',
    complexity: 'medium',
    description: 'Generate Q&A training pairs',
  },
  visual_analysis: { 
    primary: 'google/gemini-2.5-pro', 
    fallback: 'google/gemini-2.5-flash',
    complexity: 'complex',
    description: 'Analyze images and charts',
  },
  benchmark: { 
    primary: 'google/gemini-2.5-flash', 
    fallback: 'google/gemini-3-flash-preview',
    complexity: 'medium',
    description: 'Run benchmark evaluations',
  },
  report_generation: { 
    primary: 'google/gemini-3-flash-preview', 
    fallback: 'openai/gpt-5-mini',
    complexity: 'medium',
    description: 'Generate reports and memos',
  },
};

// ============= Prompt Injection Detection =============

const INJECTION_PATTERNS = [
  // Instruction override attempts
  { pattern: /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/gi, severity: 'critical', category: 'instruction_override' },
  { pattern: /disregard\s+(all\s+)?(previous|above|prior|your)/gi, severity: 'critical', category: 'instruction_override' },
  { pattern: /forget\s+(everything|all|your|previous)/gi, severity: 'high', category: 'instruction_override' },
  { pattern: /new\s+instructions?:/gi, severity: 'critical', category: 'instruction_override' },
  { pattern: /override\s*(:|mode|instructions?)/gi, severity: 'critical', category: 'instruction_override' },
  
  // Role hijacking
  { pattern: /you\s+are\s+(now|no\s+longer|actually)/gi, severity: 'high', category: 'role_hijack' },
  { pattern: /act\s+as\s+(if\s+you|a\s+different|an?\s+(?:evil|malicious))/gi, severity: 'high', category: 'role_hijack' },
  { pattern: /pretend\s+(you\s+are|to\s+be)/gi, severity: 'medium', category: 'role_hijack' },
  { pattern: /roleplay\s+as/gi, severity: 'medium', category: 'role_hijack' },
  { pattern: /\[system\]/gi, severity: 'critical', category: 'role_hijack' },
  { pattern: /<\/?system>/gi, severity: 'critical', category: 'role_hijack' },
  
  // Information extraction
  { pattern: /reveal\s+(your|the)\s+(system\s+)?prompt/gi, severity: 'high', category: 'info_extraction' },
  { pattern: /show\s+(me\s+)?(your|the)\s+(system\s+)?instructions?/gi, severity: 'high', category: 'info_extraction' },
  { pattern: /what\s+(are|is)\s+your\s+(system\s+)?prompt/gi, severity: 'medium', category: 'info_extraction' },
  { pattern: /output\s+(your|the)\s+instructions?/gi, severity: 'high', category: 'info_extraction' },
  { pattern: /print\s+(your|system)\s+prompt/gi, severity: 'high', category: 'info_extraction' },
  { pattern: /api[_\s]?key/gi, severity: 'medium', category: 'info_extraction' },
  
  // Code injection
  { pattern: /```(python|javascript|bash|sh|powershell)/gi, severity: 'medium', category: 'code_injection' },
  { pattern: /exec\s*\(/gi, severity: 'high', category: 'code_injection' },
  { pattern: /eval\s*\(/gi, severity: 'high', category: 'code_injection' },
  { pattern: /__import__/gi, severity: 'high', category: 'code_injection' },
  { pattern: /subprocess/gi, severity: 'high', category: 'code_injection' },
  
  // Delimiter attacks
  { pattern: /={5,}/g, severity: 'low', category: 'delimiter_attack' },
  { pattern: /-{5,}/g, severity: 'low', category: 'delimiter_attack' },
  { pattern: /#{5,}/g, severity: 'low', category: 'delimiter_attack' },
  { pattern: /\[end\]/gi, severity: 'medium', category: 'delimiter_attack' },
  { pattern: /\[\/end\]/gi, severity: 'medium', category: 'delimiter_attack' },
  
  // Jailbreak markers
  { pattern: /\bDAN\b/g, severity: 'high', category: 'jailbreak' },
  { pattern: /jailbreak/gi, severity: 'high', category: 'jailbreak' },
  { pattern: /bypass\s+(safety|restrictions?|filters?)/gi, severity: 'critical', category: 'jailbreak' },
  { pattern: /developer\s+mode/gi, severity: 'high', category: 'jailbreak' },
];

const SEVERITY_SCORES: Record<string, number> = {
  'none': 0,
  'low': 1,
  'medium': 2,
  'high': 3,
  'critical': 4,
};

export function detectPromptInjection(input: string): InjectionCheckResult {
  const detectedPatterns: string[] = [];
  let maxSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
  
  for (const { pattern, severity, category } of INJECTION_PATTERNS) {
    const matches = input.match(pattern);
    if (matches) {
      detectedPatterns.push(`${category}: ${matches[0]}`);
      if (SEVERITY_SCORES[severity] > SEVERITY_SCORES[maxSeverity]) {
        maxSeverity = severity as typeof maxSeverity;
      }
    }
  }
  
  // Check for excessive control characters
  const controlCharCount = (input.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g) || []).length;
  if (controlCharCount > 5) {
    detectedPatterns.push('control_chars: excessive control characters');
    if (SEVERITY_SCORES['medium'] > SEVERITY_SCORES[maxSeverity]) {
      maxSeverity = 'medium';
    }
  }
  
  return {
    detected: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    severity: maxSeverity,
    sanitizedInput: sanitizeUserInput(input),
  };
}

export function sanitizeUserInput(input: string, maxLength = 50000): string {
  if (typeof input !== 'string') return '';
  
  let sanitized = input
    // Remove control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize Unicode
    .normalize('NFC')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }
  
  return sanitized;
}

// ============= Cost Estimation & Budget Control =============

export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS['google/gemini-3-flash-preview'];
  return (inputTokens / 1000) * costs.inputPer1k + (outputTokens / 1000) * costs.outputPer1k;
}

export interface BudgetCheckResult {
  allowed: boolean;
  currentSpend: number;
  budgetLimit: number | null;
  estimatedCost: number;
  remainingBudget: number | null;
  reason?: string;
}

export async function checkBudget(
  supabase: SupabaseClient,
  projectId: string,
  estimatedCost: number
): Promise<BudgetCheckResult> {
  try {
    // Get project budget settings
    const { data: settings } = await supabase
      .from('project_settings')
      .select('budget_limit_usd, budget_enforcement, budget_alert_threshold')
      .eq('project_id', projectId)
      .single();
    
    if (!settings || !settings.budget_limit_usd) {
      return {
        allowed: true,
        currentSpend: 0,
        budgetLimit: null,
        estimatedCost,
        remainingBudget: null,
      };
    }
    
    // Get current month spend
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { data: costs } = await supabase
      .from('processing_stage_metrics')
      .select('cost_usd')
      .eq('project_id', projectId)
      .gte('completed_at', startOfMonth.toISOString());
    
    const currentSpend = costs?.reduce((sum, c) => sum + (c.cost_usd || 0), 0) || 0;
    const remainingBudget = settings.budget_limit_usd - currentSpend;
    
    // Check if we would exceed budget
    if (settings.budget_enforcement === 'hard' && currentSpend + estimatedCost > settings.budget_limit_usd) {
      return {
        allowed: false,
        currentSpend,
        budgetLimit: settings.budget_limit_usd,
        estimatedCost,
        remainingBudget,
        reason: `Budget limit exceeded. Current spend: $${currentSpend.toFixed(4)}, Limit: $${settings.budget_limit_usd}`,
      };
    }
    
    return {
      allowed: true,
      currentSpend,
      budgetLimit: settings.budget_limit_usd,
      estimatedCost,
      remainingBudget,
    };
  } catch (error) {
    console.error('[ai-middleware] Budget check error:', error);
    // Allow on error to avoid blocking operations
    return {
      allowed: true,
      currentSpend: 0,
      budgetLimit: null,
      estimatedCost,
      remainingBudget: null,
    };
  }
}

// ============= AI Middleware Class =============

export class AIMiddleware {
  private supabase: SupabaseClient;
  private lovableApiKey: string;
  
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.lovableApiKey = Deno.env.get('LOVABLE_API_KEY') || '';
  }
  
  async call(
    messages: Array<{ role: string; content: string }>,
    config: AICallConfig
  ): Promise<AICallResult> {
    const startTime = Date.now();
    
    // 1. Select appropriate model
    const modelConfig = MODEL_SELECTION[config.taskType] || MODEL_SELECTION.chat;
    const model = modelConfig.primary;
    
    // 2. Check for injection in user messages
    const userMessages = messages.filter(m => m.role === 'user');
    for (const msg of userMessages) {
      const injectionCheck = detectPromptInjection(msg.content);
      
      if (injectionCheck.severity === 'critical' || injectionCheck.severity === 'high') {
        // Log the attempt
        await this.logInjectionAttempt(config.projectId, config.userId, injectionCheck);
        
        return {
          success: false,
          content: null,
          model,
          tokensUsed: 0,
          costUsd: 0,
          cached: false,
          error: 'Potentially malicious input detected and blocked',
          injectionDetected: true,
        };
      }
    }
    
    // 3. Estimate cost and check budget
    const inputTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    const estimatedOutputTokens = config.maxTokens || 1000;
    const estimatedCost = estimateCost(model, inputTokens, estimatedOutputTokens);
    
    if (!config.bypassBudgetCheck && config.projectId) {
      const budgetCheck = await checkBudget(this.supabase, config.projectId, estimatedCost);
      
      if (!budgetCheck.allowed) {
        return {
          success: false,
          content: null,
          model,
          tokensUsed: 0,
          costUsd: 0,
          cached: false,
          error: budgetCheck.reason,
          budgetExceeded: true,
        };
      }
    }
    
    // 4. Make the AI call
    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: config.maxTokens || 2000,
          temperature: config.temperature ?? 0.7,
          stream: config.stream || false,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ai-middleware] API error ${response.status}:`, errorText);
        
        // Handle rate limiting
        if (response.status === 429) {
          return {
            success: false,
            content: null,
            model,
            tokensUsed: 0,
            costUsd: 0,
            cached: false,
            error: 'Rate limit exceeded. Please try again later.',
          };
        }
        
        if (response.status === 402) {
          return {
            success: false,
            content: null,
            model,
            tokensUsed: 0,
            costUsd: 0,
            cached: false,
            error: 'Payment required. Please add credits to your workspace.',
          };
        }
        
        return {
          success: false,
          content: null,
          model,
          tokensUsed: 0,
          costUsd: 0,
          cached: false,
          error: `AI API error: ${response.status}`,
        };
      }
      
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const tokensUsed = data.usage?.total_tokens || estimateTokens(content) + inputTokens;
      const actualCost = estimateCost(model, data.usage?.prompt_tokens || inputTokens, data.usage?.completion_tokens || estimateTokens(content));
      
      // 5. Log the usage
      if (config.projectId) {
        await this.logUsage(config.projectId, config.userId, model, tokensUsed, actualCost, Date.now() - startTime);
      }
      
      return {
        success: true,
        content,
        model,
        tokensUsed,
        costUsd: actualCost,
        cached: false,
      };
    } catch (error) {
      console.error('[ai-middleware] Call error:', error);
      return {
        success: false,
        content: null,
        model,
        tokensUsed: 0,
        costUsd: 0,
        cached: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  private async logInjectionAttempt(
    projectId: string | undefined,
    userId: string | undefined,
    result: InjectionCheckResult
  ): Promise<void> {
    try {
      await this.supabase.from('audit_logs').insert({
        user_id: userId || '00000000-0000-0000-0000-000000000000',
        user_name: 'AI Security',
        action: 'prompt_injection_blocked',
        resource_type: 'ai_security',
        resource_id: projectId || 'unknown',
        resource_name: 'Prompt Injection Attempt',
        severity_level: result.severity,
        details: {
          patterns: result.patterns,
          severity: result.severity,
          blocked: true,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error('[ai-middleware] Failed to log injection attempt:', err);
    }
  }
  
  private async logUsage(
    projectId: string,
    userId: string | undefined,
    model: string,
    tokensUsed: number,
    costUsd: number,
    durationMs: number
  ): Promise<void> {
    try {
      await this.supabase.from('processing_stage_metrics').insert({
        project_id: projectId,
        document_id: null,
        stage_name: 'ai_call',
        started_at: new Date(Date.now() - durationMs).toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
        tokens_used: tokensUsed,
        cost_usd: costUsd,
        status: 'completed',
        metadata: {
          model,
          user_id: userId,
        },
      });
    } catch (err) {
      console.error('[ai-middleware] Failed to log usage:', err);
    }
  }
}

// ============= Factory Function =============

export function createAIMiddleware(supabase: SupabaseClient): AIMiddleware {
  return new AIMiddleware(supabase);
}

// ============= Convenience Function for Quick Calls =============

export async function secureAICall(
  supabase: SupabaseClient,
  messages: Array<{ role: string; content: string }>,
  config: AICallConfig
): Promise<AICallResult> {
  const middleware = createAIMiddleware(supabase);
  return middleware.call(messages, config);
}
