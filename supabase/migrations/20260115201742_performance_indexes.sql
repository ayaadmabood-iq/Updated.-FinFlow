-- ============================================================================
-- Performance Indexes Migration
-- ============================================================================
--
-- This migration adds critical indexes to optimize common query patterns
-- in the FineFlow application. Indexes are carefully chosen to balance
-- query performance with write overhead.
--
-- Query Patterns Optimized:
-- 1. Documents filtered by owner, project, and status
-- 2. Chunks accessed by document
-- 3. Projects filtered by owner and status
-- 4. Soft-delete filtering (deleted_at IS NULL)
-- 5. Time-based queries (created_at, updated_at ordering)
--
-- Date: 2026-01-15
-- Version: 1.0
-- ============================================================================

-- ============================================================================
-- DOCUMENTS TABLE INDEXES
-- ============================================================================

-- Existing indexes (from previous migrations):
-- idx_documents_project_id ON documents(project_id)
-- idx_documents_owner_id ON documents(owner_id)
-- idx_documents_status ON documents(status)
-- idx_documents_deleted_at ON documents(deleted_at)
-- idx_documents_created_at ON documents(created_at DESC)

-- Composite Index: project_id + status (for filtered project queries)
-- Query Pattern: SELECT * FROM documents WHERE project_id = ? AND status = ?
-- Benefit: Fast project document listings with status filter
CREATE INDEX IF NOT EXISTS idx_documents_project_status
ON public.documents(project_id, status)
WHERE deleted_at IS NULL;

-- Composite Index: owner_id + status (for user dashboard queries)
-- Query Pattern: SELECT * FROM documents WHERE owner_id = ? AND status = ?
-- Benefit: User dashboard showing processing/error documents
CREATE INDEX IF NOT EXISTS idx_documents_owner_status
ON public.documents(owner_id, status)
WHERE deleted_at IS NULL;

-- Partial Index: Active documents (excluding soft-deleted)
-- Query Pattern: Most queries exclude soft-deleted records
-- Benefit: Smaller index, faster scans, only indexes active records
CREATE INDEX IF NOT EXISTS idx_documents_active
ON public.documents(owner_id, project_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Composite Index: Stale document detection
-- Query Pattern: Detect stuck processing documents for cleanup
-- Benefit: Efficiently finds documents needing automatic recovery
CREATE INDEX IF NOT EXISTS idx_documents_stale_check
ON public.documents(owner_id, status, updated_at)
WHERE deleted_at IS NULL AND status = 'processing';

-- ============================================================================
-- CHUNKS TABLE INDEXES
-- ============================================================================

-- Existing indexes:
-- idx_chunks_document_id ON chunks(document_id)
-- idx_chunks_index ON chunks(index)

-- Composite Index: document_id + index (for ordered chunk retrieval)
-- Query Pattern: SELECT * FROM chunks WHERE document_id = ? ORDER BY index
-- Benefit: Single index scan for both filter and sort
CREATE INDEX IF NOT EXISTS idx_chunks_document_index
ON public.chunks(document_id, index);

-- GIN Index: JSONB metadata for advanced queries
-- Query Pattern: Queries filtering or searching within chunk metadata
-- Benefit: Supports JSONB operators (@>, ?, etc.)
CREATE INDEX IF NOT EXISTS idx_chunks_metadata
ON public.chunks USING GIN (metadata);

-- ============================================================================
-- PROJECTS TABLE INDEXES
-- ============================================================================

-- Composite Index: owner_id + status (for filtered project lists)
-- Query Pattern: SELECT * FROM projects WHERE owner_id = ? AND status = ?
-- Benefit: User's active/archived projects filtering
CREATE INDEX IF NOT EXISTS idx_projects_owner_status
ON public.projects(owner_id, status);

-- Composite Index: owner_id + created_at (for recent projects)
-- Query Pattern: SELECT * FROM projects WHERE owner_id = ? ORDER BY created_at DESC
-- Benefit: Recent projects list with single index scan
CREATE INDEX IF NOT EXISTS idx_projects_owner_created
ON public.projects(owner_id, created_at DESC);

-- Composite Index: owner_id + updated_at (for recent activity)
-- Query Pattern: SELECT * FROM projects WHERE owner_id = ? ORDER BY updated_at DESC
-- Benefit: Recently modified projects
CREATE INDEX IF NOT EXISTS idx_projects_owner_updated
ON public.projects(owner_id, updated_at DESC);

-- ============================================================================
-- AUDIT LOGS INDEXES
-- ============================================================================

-- Composite Index: user_id + created_at (for user audit trail)
-- Query Pattern: SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC
-- Benefit: Fast user audit history retrieval
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_chronological
ON public.audit_logs(user_id, created_at DESC);

-- Composite Index: resource tracking
-- Query Pattern: SELECT * FROM audit_logs WHERE resource_type = ? AND resource_id = ?
-- Benefit: Resource-specific audit trail
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
ON public.audit_logs(resource_type, resource_id, created_at DESC);

-- ============================================================================
-- PROFILES TABLE INDEXES
-- ============================================================================

-- Index: email for lookups
-- Query Pattern: SELECT * FROM profiles WHERE email = ?
-- Benefit: Fast user lookup by email
CREATE INDEX IF NOT EXISTS idx_profiles_email
ON public.profiles(email);

-- Partial Index: admin users only
-- Query Pattern: SELECT * FROM profiles WHERE role = 'admin'
-- Benefit: Small index for admin-only queries
CREATE INDEX IF NOT EXISTS idx_profiles_role_admin
ON public.profiles(role)
WHERE role = 'admin';

-- ============================================================================
-- Add index comments for documentation
-- ============================================================================

COMMENT ON INDEX idx_documents_project_status IS
'Composite index for filtering documents by project and status';

COMMENT ON INDEX idx_documents_stale_check IS
'Partial index for detecting stuck processing documents';

COMMENT ON INDEX idx_chunks_metadata IS
'GIN index for JSONB metadata queries';

COMMENT ON INDEX idx_projects_owner_status IS
'Composite index for user project listings filtered by status';
