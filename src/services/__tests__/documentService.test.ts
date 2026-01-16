import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSupabase, resetMockSupabase } from '@/test/mocks/supabase';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

import { documentService } from '../documentService';

describe('DocumentService', () => {
  beforeEach(() => {
    resetMockSupabase();
    vi.clearAllMocks();
    // Ensure we're using Supabase fallback (no API_URL)
    vi.stubEnv('VITE_API_URL', '');
  });

  describe('getDocuments', () => {
    it('should return paginated list of documents', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          project_id: 'project-1',
          owner_id: 'user-123',
          name: 'Document 1.pdf',
          original_name: 'Document 1.pdf',
          mime_type: 'application/pdf',
          size_bytes: 1024000,
          storage_path: 'user-123/project-1/doc1.pdf',
          status: 'ready',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValueOnce({
          data: mockDocuments,
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValueOnce({
          count: 1,
          error: null,
        }),
      });

      const result = await documentService.getDocuments('project-1', 1, 50);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Document 1.pdf');
      expect(result.page).toBe(1);
    });

    it('should throw error when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      await expect(
        documentService.getDocuments('project-1')
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('getDocument', () => {
    it('should return a single document by ID', async () => {
      const mockDocument = {
        id: 'doc-1',
        project_id: 'project-1',
        owner_id: 'user-123',
        name: 'Test.pdf',
        original_name: 'Test.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1024,
        storage_path: 'path/to/test.pdf',
        status: 'ready',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
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

      const result = await documentService.getDocument('doc-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('doc-1');
      expect(result?.name).toBe('Test.pdf');
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

      const result = await documentService.getDocument('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('uploadFile', () => {
    it('should reject files over size limit', async () => {
      const largeFile = new File(['x'.repeat(60 * 1024 * 1024)], 'large.pdf', {
        type: 'application/pdf',
      });
      // Override size since File constructor doesn't respect content size in tests
      Object.defineProperty(largeFile, 'size', { value: 60 * 1024 * 1024 });

      await expect(
        documentService.uploadFile('project-1', largeFile)
      ).rejects.toThrow('File size exceeds maximum');
    });

    it('should upload file successfully', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 12 });

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: { allowed: true, current: 5, limit: 100, tier: 'free' },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: { allowed: true, current: 1000, limit: 1000000, tier: 'free' },
        error: null,
      });

      mockSupabase.storage.from.mockReturnValueOnce({
        upload: vi.fn().mockResolvedValueOnce({ error: null }),
      });

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: {
            id: 'new-doc',
            project_id: 'project-1',
            owner_id: 'user-123',
            name: 'test.txt',
            original_name: 'test.txt',
            mime_type: 'text/plain',
            size_bytes: 12,
            storage_path: 'path/to/test.txt',
            status: 'ready',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          error: null,
        }),
      });

      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null });
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      const result = await documentService.uploadFile('project-1', file);

      expect(result.id).toBe('new-doc');
      expect(result.name).toBe('test.txt');
    });

    it('should throw error when documents quota exceeded', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 4 });

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: { allowed: false, current: 10, limit: 10, tier: 'free' },
        error: null,
      });

      await expect(
        documentService.uploadFile('project-1', file)
      ).rejects.toThrow('Documents quota exceeded');
    });

    it('should throw error when storage quota exceeded', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 4 });

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: { allowed: true, current: 5, limit: 100, tier: 'free' },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: { allowed: false, current: 1000000, limit: 1000000, tier: 'free' },
        error: null,
      });

      await expect(
        documentService.uploadFile('project-1', file)
      ).rejects.toThrow('Storage quota exceeded');
    });
  });

  describe('updateDocument', () => {
    it('should update document name', async () => {
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: {
            id: 'doc-1',
            project_id: 'project-1',
            owner_id: 'user-123',
            name: 'Renamed.pdf',
            original_name: 'Original.pdf',
            mime_type: 'application/pdf',
            size_bytes: 1024,
            storage_path: 'path/to/file.pdf',
            status: 'ready',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
          },
          error: null,
        }),
      });

      const result = await documentService.updateDocument('doc-1', {
        name: 'Renamed.pdf',
      });

      expect(result.name).toBe('Renamed.pdf');
    });
  });

  describe('deleteDocument', () => {
    it('should delete document via edge function', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: { access_token: 'token' } },
        error: null,
      });

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

      await expect(
        documentService.deleteDocument('doc-1')
      ).resolves.not.toThrow();
    });

    it('should throw error when not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      await expect(
        documentService.deleteDocument('doc-1')
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('getDownloadUrl', () => {
    it('should return signed URL for document', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: {
            id: 'doc-1',
            storage_path: 'path/to/file.pdf',
            name: 'file.pdf',
            mime_type: 'application/pdf',
            size_bytes: 1024,
            status: 'ready',
            project_id: 'project-1',
            owner_id: 'user-123',
            original_name: 'file.pdf',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
          error: null,
        }),
      });

      mockSupabase.storage.from.mockReturnValueOnce({
        createSignedUrl: vi.fn().mockResolvedValueOnce({
          data: { signedUrl: 'https://signed-url.example.com' },
          error: null,
        }),
      });

      const result = await documentService.getDownloadUrl('doc-1');

      expect(result.url).toBe('https://signed-url.example.com');
      expect(result.expiresAt).toBeDefined();
    });
  });
});
