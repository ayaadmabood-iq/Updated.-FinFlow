import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSupabase, resetMockSupabase } from '@/test/mocks/supabase';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

import { searchService } from '../searchService';

describe('SearchService', () => {
  beforeEach(() => {
    resetMockSupabase();
    vi.clearAllMocks();
  });

  describe('semanticSearch', () => {
    it('should return search results for a valid query', async () => {
      const mockSearchResults = {
        success: true,
        query: 'AI machine learning',
        searchMode: 'hybrid',
        results: [
          {
            id: 'doc-1',
            projectId: 'project-1',
            name: 'Test Document.pdf',
            originalName: 'Test Document.pdf',
            mimeType: 'application/pdf',
            language: 'en',
            summary: 'A test document about AI',
            createdAt: '2024-01-01T00:00:00Z',
            similarity: 0.92,
            semanticScore: 0.92,
            fulltextScore: 0.85,
            matchedSnippet: 'The <mark>AI</mark> system processes...',
            type: 'document',
          },
        ],
        totalResults: 1,
        searchDurationMs: 150,
      };

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: { access_token: 'token-123' } },
        error: null,
      });

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: mockSearchResults,
        error: null,
      });

      const result = await searchService.semanticSearch('AI machine learning', {
        projectId: 'project-1',
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      // Type guard for document result
      const docResult = result.results[0];
      expect(docResult.type).toBe('document');
      if (docResult.type === 'document') {
        expect(docResult.name).toBe('Test Document.pdf');
      }
      expect(docResult.similarity).toBeGreaterThan(0.8);
    });

    it('should return empty results for unmatched query', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: { access_token: 'token-123' } },
        error: null,
      });

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          query: 'nonexistent content xyz123',
          searchMode: 'hybrid',
          results: [],
          totalResults: 0,
          searchDurationMs: 50,
        },
        error: null,
      });

      const result = await searchService.semanticSearch('nonexistent content xyz123', {
        projectId: 'project-1',
      });

      expect(result.results).toHaveLength(0);
      expect(result.totalResults).toBe(0);
    });

    it('should throw error when not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      await expect(
        searchService.semanticSearch('test', { projectId: 'project-1' })
      ).rejects.toThrow('Not authenticated');
    });

    it('should throw error when search fails', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: { access_token: 'token-123' } },
        error: null,
      });

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Search service unavailable' },
      });

      await expect(
        searchService.semanticSearch('test', { projectId: 'project-1' })
      ).rejects.toThrow('Search service unavailable');
    });

    it('should pass filter options correctly', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: { access_token: 'token-123' } },
        error: null,
      });

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          query: 'test',
          searchMode: 'hybrid',
          results: [],
          totalResults: 0,
          searchDurationMs: 100,
        },
        error: null,
      });

      await searchService.semanticSearch('test', {
        projectId: 'project-1',
        fileTypes: ['application/pdf'],
        language: 'en',
        limit: 20,
        threshold: 0.7,
        searchMode: 'semantic',
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'semantic-search',
        expect.objectContaining({
          body: expect.objectContaining({
            query: 'test',
            projectId: 'project-1',
            fileTypes: ['application/pdf'],
            language: 'en',
            limit: 20,
            threshold: 0.7,
            searchMode: 'semantic',
          }),
        })
      );
    });
  });

  describe('generateEmbedding', () => {
    it('should generate embeddings for a document', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: { access_token: 'token-123' } },
        error: null,
      });

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { success: true, documentEmbedding: true, chunkEmbeddings: 5 },
        error: null,
      });

      const result = await searchService.generateEmbedding('doc-1');

      expect(result.success).toBe(true);
      expect(result.documentEmbedding).toBe(true);
      expect(result.chunkEmbeddings).toBe(5);
    });

    it('should throw error when not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      await expect(searchService.generateEmbedding('doc-1')).rejects.toThrow('Not authenticated');
    });
  });
});
