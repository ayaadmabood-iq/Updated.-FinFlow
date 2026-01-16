/**
 * AI Provider Adapters
 * 
 * Abstracts AI operations (completions, embeddings) from specific providers.
 * This enables switching between OpenAI, Anthropic, or local models.
 */

import type {
  IAIProvider,
  AICompletionRequest,
  AICompletionResponse,
  AIEmbeddingRequest,
  AIEmbeddingResponse,
  IFunctionProvider,
} from '../contracts';

// ============================================================================
// Edge Function AI Adapter (current implementation)
// ============================================================================

/**
 * AI Adapter that uses Supabase Edge Functions
 * Decouples AI logic from Supabase-specific APIs
 */
export class EdgeFunctionAIAdapter implements IAIProvider {
  constructor(private functions: IFunctionProvider) {}

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const { data, error } = await this.functions.invoke<{
      content: string;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    }>('ai-complete', {
      body: {
        model: request.model,
        messages: request.messages,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
      },
    });

    if (error) {
      throw new Error(`AI completion failed: ${error.message}`);
    }

    return {
      content: data.content,
      model: data.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  async embed(request: AIEmbeddingRequest): Promise<AIEmbeddingResponse> {
    const { data, error } = await this.functions.invoke<{
      embeddings: number[][];
      model: string;
      usage?: { prompt_tokens: number; total_tokens: number };
    }>('generate-embedding', {
      body: {
        input: request.input,
        model: request.model,
      },
    });

    if (error) {
      throw new Error(`AI embedding failed: ${error.message}`);
    }

    return {
      embeddings: data.embeddings,
      model: data.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  async streamComplete(
    request: AICompletionRequest,
    onChunk: (chunk: string) => void
  ): Promise<AICompletionResponse> {
    // Streaming via Edge Functions requires WebSocket or SSE
    // For now, fall back to non-streaming
    console.warn('Streaming not supported via Edge Functions, using non-streaming');
    const response = await this.complete(request);
    onChunk(response.content);
    return response;
  }
}

// ============================================================================
// Direct OpenAI Adapter (for future use)
// ============================================================================

/**
 * Direct OpenAI adapter for when you want to bypass Edge Functions
 * Useful for NestJS migration or client-side AI calls
 */
export class OpenAIAdapter implements IAIProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        max_completion_tokens: request.maxTokens,
        // Note: temperature not supported for newer models
        ...(request.temperature !== undefined &&
          !request.model.includes('gpt-5') &&
          !request.model.includes('o3') &&
          !request.model.includes('o4') && { temperature: request.temperature }),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      model: data.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  async embed(request: AIEmbeddingRequest): Promise<AIEmbeddingResponse> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || 'text-embedding-3-small',
        input: request.input,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();

    return {
      embeddings: data.data.map((item: { embedding: number[] }) => item.embedding),
      model: data.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  async streamComplete(
    request: AICompletionRequest,
    onChunk: (chunk: string) => void
  ): Promise<AICompletionResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        max_completion_tokens: request.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

      for (const line of lines) {
        const data = line.replace('data: ', '');
        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            fullContent += content;
            onChunk(content);
          }
        } catch {
          // Ignore parsing errors for incomplete chunks
        }
      }
    }

    return {
      content: fullContent,
      model: request.model,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an AI adapter using Edge Functions
 */
export function createEdgeFunctionAIAdapter(functions: IFunctionProvider): IAIProvider {
  return new EdgeFunctionAIAdapter(functions);
}

/**
 * Create an OpenAI adapter
 */
export function createOpenAIAdapter(apiKey: string, baseUrl?: string): IAIProvider {
  return new OpenAIAdapter(apiKey, baseUrl);
}
