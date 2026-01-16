import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSupabase, resetMockSupabase } from '@/test/mocks/supabase';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

import { processingService } from '../processingService';

describe('ProcessingService', () => {
  beforeEach(() => {
    resetMockSupabase();
    vi.clearAllMocks();
  });

  describe('processDocument', () => {
    it('should successfully enqueue document for processing via orchestrator', async () => {
      const mockDocument = {
        id: 'doc-1',
        project_id: 'project-1',
        storage_path: 'path/to/file.pdf',
        owner_id: 'user-123',
      };

      // Mock document fetch
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: mockDocument,
          error: null,
        }),
      });

      // Mock pipeline-orchestrator call
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { success: true, jobId: 'job-123', documentId: 'doc-1' },
        error: null,
      });

      const result = await processingService.processDocument('doc-1');

      expect(result.success).toBe(true);
      expect(result.documentId).toBe('doc-1');
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('pipeline-orchestrator', expect.any(Object));
    });

    it('should throw error when document not found', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Document not found' },
        }),
      });

      await expect(processingService.processDocument('invalid-id')).rejects.toThrow('Document not found');
    });

    it('should throw error when orchestrator call fails', async () => {
      const mockDocument = {
        id: 'doc-1',
        project_id: 'project-1',
        storage_path: 'path/to/file.pdf',
        owner_id: 'user-123',
      };

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: mockDocument,
          error: null,
        }),
      });

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Orchestrator error' },
      });

      await expect(processingService.processDocument('doc-1')).rejects.toThrow('Orchestrator error');
    });
  });

  describe('getChunks', () => {
    it('should return paginated chunks for a document', async () => {
      const mockChunks = [
        { id: 'chunk-1', document_id: 'doc-1', content: 'Chunk 1 content', index: 0, metadata: null, created_at: '2024-01-01' },
        { id: 'chunk-2', document_id: 'doc-1', content: 'Chunk 2 content', index: 1, metadata: null, created_at: '2024-01-01' },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValueOnce({
          data: mockChunks,
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          count: 2,
          error: null,
        }),
      });

      const result = await processingService.getChunks('doc-1', 1, 20);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.data[0].content).toBe('Chunk 1 content');
    });
  });

  describe('getDocumentWithProcessing', () => {
    it('should return document with processing metadata', async () => {
      const mockDocument = {
        id: 'doc-1',
        project_id: 'project-1',
        owner_id: 'user-123',
        name: 'test.pdf',
        original_name: 'test.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1024,
        storage_path: 'path/to/test.pdf',
        status: 'ready',
        error_message: null,
        deleted_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        extracted_text: 'Sample extracted text',
        summary: 'Document summary',
        language: 'en',
        processed_at: '2024-01-01T00:01:00Z',
        processing_steps: [
          { stage: 'ingestion', status: 'completed' },
          { stage: 'text_extraction', status: 'completed' },
          { stage: 'chunking', status: 'completed' },
          { stage: 'indexing', status: 'completed' },
        ],
      };

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: mockDocument,
          error: null,
        }),
      });

      const result = await processingService.getDocumentWithProcessing('doc-1');

      expect(result).not.toBeNull();
      expect(result?.status).toBe('ready');
      expect(result?.extractedText).toBe('Sample extracted text');
      expect(result?.summary).toBe('Document summary');
      expect(result?.language).toBe('en');
      expect(result?.processingSteps).toHaveLength(4);
    });

    it('should return null when document not found', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      });

      const result = await processingService.getDocumentWithProcessing('non-existent');

      expect(result).toBeNull();
    });
  });
});
