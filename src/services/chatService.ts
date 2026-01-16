import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
  timestamp: Date;
  isStreaming?: boolean;
}

export interface SourceCitation {
  documentId: string;
  documentName: string;
  chunkId?: string;
  chunkIndex?: number;
  content: string;
  relevanceScore: number;
}

export interface SuggestedQuestion {
  question: string;
  category: 'summary' | 'details' | 'analysis' | 'comparison' | 'clarification';
}

export interface ChatOptions {
  projectId: string;
  selectedDocumentIds?: string[];
  includeProjectContext?: boolean;
}

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onSources: (sources: SourceCitation[]) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

class ChatService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_SUPABASE_URL;
  }

  async streamChat(
    query: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    options: ChatOptions,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      callbacks.onError(new Error('Not authenticated'));
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/functions/v1/project-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: options.projectId,
          query,
          conversationHistory,
          selectedDocumentIds: options.selectedDocumentIds,
          includeProjectContext: options.includeProjectContext ?? true,
        }),
      });

      // Handle error responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Request failed with status ${response.status}`;
        
        if (response.status === 429) {
          callbacks.onError(new Error('Rate limit exceeded. Please try again later.'));
          return;
        }
        if (response.status === 402) {
          callbacks.onError(new Error('AI credits exhausted. Please add funds to continue.'));
          return;
        }
        callbacks.onError(new Error(errorMessage));
        return;
      }

      if (!response.body) {
        callbacks.onError(new Error('No response body'));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        // Process line-by-line
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            callbacks.onDone();
            return;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            
            // Handle sources event
            if (parsed.type === 'sources') {
              callbacks.onSources(parsed.sources || []);
              continue;
            }

            // Handle streaming content
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              callbacks.onDelta(content);
            }
          } catch {
            // Incomplete JSON - put back and wait for more data
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Process remaining buffer
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'sources') {
              callbacks.onSources(parsed.sources || []);
            } else {
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) callbacks.onDelta(content);
            }
          } catch {
            // Ignore
          }
        }
      }

      callbacks.onDone();
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  async getSuggestedQuestions(documentId: string): Promise<SuggestedQuestion[]> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await supabase.functions.invoke('generate-suggested-questions', {
      body: { documentId },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to generate suggestions');
    }

    return response.data?.suggestions || [];
  }
}

export const chatService = new ChatService();
