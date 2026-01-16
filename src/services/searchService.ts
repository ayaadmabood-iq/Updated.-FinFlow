import { supabase } from '@/integrations/supabase/client';

export type SearchMode = 'hybrid' | 'semantic' | 'fulltext';

export interface DocumentSearchResult {
  id: string;
  projectId: string;
  name: string;
  originalName: string;
  mimeType: string;
  language: string | null;
  summary: string | null;
  createdAt: string;
  similarity: number;
  semanticScore: number;
  fulltextScore: number;
  matchedSnippet: string | null;
  type: 'document';
}

export interface ChunkSearchResult {
  chunkId: string;
  documentId: string;
  projectId: string;
  content: string;
  chunkIndex: number;
  documentName: string;
  mimeType: string;
  language: string | null;
  createdAt: string;
  similarity: number;
  semanticScore: number;
  fulltextScore: number;
  matchedSnippet: string | null;
  type: 'chunk';
}

export type SearchResult = DocumentSearchResult | ChunkSearchResult;

export interface SearchOptions {
  projectId?: string;
  fileTypes?: string[];
  language?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  threshold?: number;
  searchChunks?: boolean;
  searchMode?: SearchMode;
}

export interface SearchResponse {
  success: boolean;
  query: string;
  searchMode: SearchMode;
  results: SearchResult[];
  totalResults: number;
  searchDurationMs: number;
  error?: string;
}

// Available languages for filtering
export const SUPPORTED_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic' },
  { value: 'zh', label: 'Chinese' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
];

class SearchService {
  async semanticSearch(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await supabase.functions.invoke('semantic-search', {
      body: {
        query,
        projectId: options.projectId,
        fileTypes: options.fileTypes,
        language: options.language,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
        limit: options.limit || 10,
        threshold: options.threshold || 0.5,
        searchChunks: options.searchChunks ?? true,
        searchMode: options.searchMode || 'hybrid',
      },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Search failed');
    }

    return response.data as SearchResponse;
  }

  async generateEmbedding(documentId: string): Promise<{ success: boolean; documentEmbedding?: boolean; chunkEmbeddings?: number }> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await supabase.functions.invoke('generate-embedding', {
      body: { documentId },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Embedding generation failed');
    }

    return response.data;
  }
}

export const searchService = new SearchService();
