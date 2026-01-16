/**
 * Project Service
 * 
 * Migrated to use the API abstraction layer for backend-agnostic operations.
 * This service demonstrates the provider pattern for NestJS migration.
 */

import { supabase } from '@/integrations/supabase/client';
import { getBackendProvider, getCurrentUser } from '@/lib/api';
import type { Project, CreateProjectInput, UpdateProjectInput, PaginatedResponse } from '@/types';
import { auditService } from './auditService';

// Database row type for mapping
interface ProjectRow {
  id: string;
  name: string;
  description: string;
  status: string;
  owner_id: string;
  document_count: number;
  chunk_size: number | null;
  chunk_overlap: number | null;
  chunk_strategy: string | null;
  created_at: string;
  updated_at: string;
}

class ProjectService {
  /**
   * Get paginated list of projects
   */
  async getProjects(
    page = 1,
    pageSize = 100,
    status?: Project['status']
  ): Promise<PaginatedResponse<Project>> {
    // For complex queries with count, we still use Supabase client directly
    // The abstraction layer handles simpler cases
    let query = supabase
      .from('projects')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .order('updated_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const projects: Project[] = (data || []).map((row) => this.mapToProject(row as ProjectRow));

    return {
      data: projects,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  }

  /**
   * Get a single project by ID
   * Uses the abstraction layer for simple query
   */
  async getProject(id: string): Promise<Project | null> {
    const provider = getBackendProvider();
    
    const data = await provider.database.queryOne<ProjectRow>('projects', id);

    if (!data) return null;

    const project = this.mapToProject(data);

    // Log view action
    auditService.log({
      action: 'view',
      resourceType: 'project',
      resourceId: project.id,
      resourceName: project.name,
    });

    return project;
  }

  /**
   * Create a new project
   * Uses the abstraction layer for auth and insert
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    const provider = getBackendProvider();
    
    // Get current user from auth provider
    const user = await provider.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const insertData = {
      name: input.name,
      description: input.description,
      owner_id: user.id,
      status: 'draft',
      document_count: 0,
      chunk_size: input.chunkSize,
      chunk_overlap: input.chunkOverlap,
      chunk_strategy: input.chunkStrategy,
    };

    const data = await provider.database.insert<ProjectRow>('projects', insertData);
    const project = this.mapToProject(data);

    // Log creation
    auditService.log({
      action: 'create',
      resourceType: 'project',
      resourceId: project.id,
      resourceName: project.name,
    });

    return project;
  }

  /**
   * Update an existing project
   * Uses the abstraction layer for update
   */
  async updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
    const provider = getBackendProvider();
    
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.chunkSize !== undefined) updateData.chunk_size = input.chunkSize;
    if (input.chunkOverlap !== undefined) updateData.chunk_overlap = input.chunkOverlap;
    if (input.chunkStrategy !== undefined) updateData.chunk_strategy = input.chunkStrategy;

    const data = await provider.database.update<ProjectRow>('projects', id, updateData);
    const project = this.mapToProject(data);

    // Log update
    auditService.log({
      action: 'update',
      resourceType: 'project',
      resourceId: project.id,
      resourceName: project.name,
      details: { changes: input },
    });

    return project;
  }

  /**
   * Delete a project
   * Uses the abstraction layer for query and delete
   */
  async deleteProject(id: string): Promise<void> {
    const provider = getBackendProvider();
    
    // Get project name first for logging
    const existing = await provider.database.queryOne<ProjectRow>('projects', id);

    await provider.database.delete('projects', id);

    // Log deletion
    auditService.log({
      action: 'delete',
      resourceType: 'project',
      resourceId: id,
      resourceName: existing?.name || 'Unknown',
    });
  }

  /**
   * Archive a project (convenience method)
   */
  async archiveProject(id: string): Promise<Project> {
    return this.updateProject(id, { status: 'archived' });
  }

  /**
   * Activate a project (convenience method)
   */
  async activateProject(id: string): Promise<Project> {
    return this.updateProject(id, { status: 'active' });
  }

  /**
   * Update chunking settings for a project
   */
  async updateChunkingSettings(
    id: string,
    settings: { chunkSize?: number; chunkOverlap?: number; chunkStrategy?: string }
  ): Promise<Project> {
    const provider = getBackendProvider();
    
    const updateData: Record<string, unknown> = {};
    if (settings.chunkSize !== undefined) updateData.chunk_size = settings.chunkSize;
    if (settings.chunkOverlap !== undefined) updateData.chunk_overlap = settings.chunkOverlap;
    if (settings.chunkStrategy !== undefined) updateData.chunk_strategy = settings.chunkStrategy;

    const data = await provider.database.update<ProjectRow>('projects', id, updateData);
    const project = this.mapToProject(data);

    // Log update
    auditService.log({
      action: 'update',
      resourceType: 'project',
      resourceId: project.id,
      resourceName: project.name,
      details: { changes: { chunkingSettings: settings } },
    });

    return project;
  }

  /**
   * Map database row to Project domain model
   */
  private mapToProject(data: ProjectRow): Project {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      status: data.status as Project['status'],
      ownerId: data.owner_id,
      documentCount: data.document_count,
      chunkSize: data.chunk_size ?? 1000,
      chunkOverlap: data.chunk_overlap ?? 200,
      chunkStrategy: (data.chunk_strategy ?? 'fixed') as Project['chunkStrategy'],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const projectService = new ProjectService();
export default projectService;
