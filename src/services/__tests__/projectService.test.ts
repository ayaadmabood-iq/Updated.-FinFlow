import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSupabase, resetMockSupabase } from '@/test/mocks/supabase';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

vi.mock('@/lib/api', () => ({
  getBackendProvider: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ id: 'user-123', email: 'test@example.com' }),
    },
    database: {
      queryOne: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  }),
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-123' }),
}));

vi.mock('../auditService', () => ({
  auditService: {
    log: vi.fn(),
  },
}));

import { projectService } from '../projectService';
import { getBackendProvider } from '@/lib/api';

describe('ProjectService', () => {
  beforeEach(() => {
    resetMockSupabase();
    vi.clearAllMocks();
  });

  describe('getProjects', () => {
    it('should return paginated list of projects', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project One',
          description: 'Description one',
          status: 'active',
          owner_id: 'user-123',
          document_count: 5,
          chunk_size: 1000,
          chunk_overlap: 200,
          chunk_strategy: 'fixed',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'project-2',
          name: 'Project Two',
          description: 'Description two',
          status: 'draft',
          owner_id: 'user-123',
          document_count: 0,
          chunk_size: null,
          chunk_overlap: null,
          chunk_strategy: null,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValueOnce({
          data: mockProjects,
          error: null,
          count: 2,
        }),
      });

      const result = await projectService.getProjects(1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.data[0].name).toBe('Project One');
    });

    it('should filter projects by status', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValueOnce({
          data: [],
          error: null,
          count: 0,
        }),
      });

      const result = await projectService.getProjects(1, 10, 'archived');

      expect(result.data).toHaveLength(0);
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
    });

    it('should throw error when query fails', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' },
          count: null,
        }),
      });

      await expect(projectService.getProjects()).rejects.toThrow('Database error');
    });
  });

  describe('getProject', () => {
    it('should return a single project by ID', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        description: 'Test description',
        status: 'active',
        owner_id: 'user-123',
        document_count: 5,
        chunk_size: 1000,
        chunk_overlap: 200,
        chunk_strategy: 'fixed',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const provider = getBackendProvider();
      vi.mocked(provider.database.queryOne).mockResolvedValueOnce(mockProject);

      const result = await projectService.getProject('project-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('project-1');
      expect(result?.name).toBe('Test Project');
    });

    it('should return null when project not found', async () => {
      const provider = getBackendProvider();
      vi.mocked(provider.database.queryOne).mockResolvedValueOnce(null);

      const result = await projectService.getProject('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      const newProject = {
        id: 'new-project',
        name: 'New Project',
        description: 'New description',
        status: 'draft',
        owner_id: 'user-123',
        document_count: 0,
        chunk_size: 1000,
        chunk_overlap: 200,
        chunk_strategy: 'fixed',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const provider = getBackendProvider();
      vi.mocked(provider.database.insert).mockResolvedValueOnce(newProject);

      const result = await projectService.createProject({
        name: 'New Project',
        description: 'New description',
        chunkSize: 1000,
        chunkOverlap: 200,
        chunkStrategy: 'fixed',
      });

      expect(result.id).toBe('new-project');
      expect(result.name).toBe('New Project');
      expect(result.status).toBe('draft');
    });
  });

  describe('updateProject', () => {
    it('should update an existing project', async () => {
      const updatedProject = {
        id: 'project-1',
        name: 'Updated Name',
        description: 'Original description',
        status: 'active',
        owner_id: 'user-123',
        document_count: 5,
        chunk_size: 1000,
        chunk_overlap: 200,
        chunk_strategy: 'fixed',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const provider = getBackendProvider();
      vi.mocked(provider.database.update).mockResolvedValueOnce(updatedProject);

      const result = await projectService.updateProject('project-1', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'To Delete',
      };

      const provider = getBackendProvider();
      vi.mocked(provider.database.queryOne).mockResolvedValueOnce(mockProject);
      vi.mocked(provider.database.delete).mockResolvedValueOnce(undefined);

      await expect(projectService.deleteProject('project-1')).resolves.not.toThrow();
    });
  });

  describe('archiveProject', () => {
    it('should archive a project', async () => {
      const archivedProject = {
        id: 'project-1',
        name: 'Test',
        description: '',
        status: 'archived',
        owner_id: 'user-123',
        document_count: 0,
        chunk_size: 1000,
        chunk_overlap: 200,
        chunk_strategy: 'fixed',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const provider = getBackendProvider();
      vi.mocked(provider.database.update).mockResolvedValueOnce(archivedProject);

      const result = await projectService.archiveProject('project-1');

      expect(result.status).toBe('archived');
    });
  });

  describe('activateProject', () => {
    it('should activate a project', async () => {
      const activeProject = {
        id: 'project-1',
        name: 'Test',
        description: '',
        status: 'active',
        owner_id: 'user-123',
        document_count: 0,
        chunk_size: 1000,
        chunk_overlap: 200,
        chunk_strategy: 'fixed',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const provider = getBackendProvider();
      vi.mocked(provider.database.update).mockResolvedValueOnce(activeProject);

      const result = await projectService.activateProject('project-1');

      expect(result.status).toBe('active');
    });
  });

  describe('updateChunkingSettings', () => {
    it('should update chunking settings', async () => {
      const updatedProject = {
        id: 'project-1',
        name: 'Test',
        description: '',
        status: 'active',
        owner_id: 'user-123',
        document_count: 0,
        chunk_size: 500,
        chunk_overlap: 100,
        chunk_strategy: 'sentence',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const provider = getBackendProvider();
      vi.mocked(provider.database.update).mockResolvedValueOnce(updatedProject);

      const result = await projectService.updateChunkingSettings('project-1', {
        chunkSize: 500,
        chunkOverlap: 100,
        chunkStrategy: 'sentence',
      });

      expect(result.chunkSize).toBe(500);
      expect(result.chunkOverlap).toBe(100);
      expect(result.chunkStrategy).toBe('sentence');
    });
  });
});
