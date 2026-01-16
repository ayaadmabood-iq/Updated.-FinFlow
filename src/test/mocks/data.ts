import type { Project, Document, PaginatedResponse } from '@/types';
import type { QuotaStatus } from '@/services/quotaService';

/**
 * Mock project data
 */
export const mockProject: Project = {
  id: 'project-1',
  name: 'Test Project',
  description: 'A test project for testing',
  status: 'active',
  ownerId: 'test-user-id',
  documentCount: 5,
  chunkSize: 1000,
  chunkOverlap: 200,
  chunkStrategy: 'fixed',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
};

export const mockProjects: Project[] = [
  mockProject,
  {
    id: 'project-2',
    name: 'Another Project',
    description: 'Another test project',
    status: 'draft',
    ownerId: 'test-user-id',
    documentCount: 0,
    chunkSize: 1000,
    chunkOverlap: 200,
    chunkStrategy: 'fixed',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-16T00:00:00Z',
  },
  {
    id: 'project-3',
    name: 'Archived Project',
    description: 'An archived project',
    status: 'archived',
    ownerId: 'test-user-id',
    documentCount: 10,
    chunkSize: 500,
    chunkOverlap: 100,
    chunkStrategy: 'sentence',
    createdAt: '2023-12-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

/**
 * Mock document data
 */
export const mockDocument: Document = {
  id: 'doc-1',
  projectId: 'project-1',
  ownerId: 'test-user-id',
  name: 'Test Document.pdf',
  originalName: 'Test Document.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024000,
  storagePath: 'test-user-id/project-1/test-doc.pdf',
  status: 'ready',
  createdAt: '2024-01-10T00:00:00Z',
  updatedAt: '2024-01-10T00:00:00Z',
};

export const mockDocuments: Document[] = [
  mockDocument,
  {
    id: 'doc-2',
    projectId: 'project-1',
    ownerId: 'test-user-id',
    name: 'Image.png',
    originalName: 'Image.png',
    mimeType: 'image/png',
    sizeBytes: 512000,
    storagePath: 'test-user-id/project-1/image.png',
    status: 'ready',
    createdAt: '2024-01-11T00:00:00Z',
    updatedAt: '2024-01-11T00:00:00Z',
  },
  {
    id: 'doc-3',
    projectId: 'project-1',
    ownerId: 'test-user-id',
    name: 'Processing.docx',
    originalName: 'Processing.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 256000,
    storagePath: 'test-user-id/project-1/processing.docx',
    status: 'processing',
    createdAt: '2024-01-12T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
  },
];

/**
 * Mock paginated response helper
 */
export function createPaginatedResponse<T>(
  data: T[],
  page = 1,
  pageSize = 10
): PaginatedResponse<T> {
  return {
    data,
    total: data.length,
    page,
    pageSize,
    totalPages: Math.ceil(data.length / pageSize),
  };
}

/**
 * Mock quota status
 */
export const mockQuotaStatus: QuotaStatus = {
  tier: 'free',
  documents: { current: 5, limit: 10 },
  processing: { current: 3, limit: 20 },
  storage: { current: 5242880, limit: 104857600 }, // 5MB / 100MB
};

export const mockUnlimitedQuotaStatus: QuotaStatus = {
  tier: 'enterprise',
  documents: { current: 100, limit: null },
  processing: { current: 50, limit: null },
  storage: { current: 1073741824, limit: null }, // 1GB, unlimited
};

export const mockExceededQuotaStatus: QuotaStatus = {
  tier: 'free',
  documents: { current: 10, limit: 10 },
  processing: { current: 20, limit: 20 },
  storage: { current: 104857600, limit: 104857600 }, // 100MB, at limit
};

export const mockNearLimitQuotaStatus: QuotaStatus = {
  tier: 'starter',
  documents: { current: 45, limit: 50 },
  processing: { current: 95, limit: 100 },
  storage: { current: 476741632, limit: 524288000 }, // ~91% of 500MB
};
