-- ============= Performance Indexes for Edge Functions =============
-- Optimizes common query patterns to eliminate N+1 and slow scans

-- 1. Document queries by owner and project (very common)
CREATE INDEX IF NOT EXISTS idx_documents_owner_project 
ON public.documents (owner_id, project_id) 
WHERE deleted_at IS NULL;

-- 2. Document status for pipeline processing
CREATE INDEX IF NOT EXISTS idx_documents_status_created 
ON public.documents (status, created_at DESC) 
WHERE deleted_at IS NULL;

-- 3. Chunks by document for batch operations
CREATE INDEX IF NOT EXISTS idx_chunks_document_index 
ON public.chunks (document_id, index);

-- 4. Cache lookups (critical for cache hit performance)
CREATE INDEX IF NOT EXISTS idx_cache_entries_key_expires 
ON public.cache_entries (cache_key, expires_at);

CREATE INDEX IF NOT EXISTS idx_cache_entries_type_expires 
ON public.cache_entries (cache_type, expires_at);

CREATE INDEX IF NOT EXISTS idx_cache_entries_document 
ON public.cache_entries (document_id) 
WHERE document_id IS NOT NULL;

-- 5. Audit logs for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action_created 
ON public.audit_logs (user_id, action, created_at DESC);

-- 6. Project access checks (team shares)
CREATE INDEX IF NOT EXISTS idx_project_shares_project 
ON public.project_shares (project_id);

CREATE INDEX IF NOT EXISTS idx_team_members_user_team 
ON public.team_members (user_id, team_id);

-- 7. AI feedback for training data queries
CREATE INDEX IF NOT EXISTS idx_ai_feedback_project_rating 
ON public.ai_feedback (project_id, rating);

-- 8. Curated QA pairs for dataset export
CREATE INDEX IF NOT EXISTS idx_curated_qa_dataset_approved 
ON public.curated_qa_pairs (dataset_id, is_approved);

-- 9. Composite index for hybrid search optimization
CREATE INDEX IF NOT EXISTS idx_documents_project_status_embedding 
ON public.documents (project_id, status) 
WHERE embedding IS NOT NULL AND deleted_at IS NULL;

-- 10. Chunk embedding lookups
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_exists 
ON public.chunks (document_id) 
WHERE embedding IS NOT NULL;

-- 11. Generated content lookups
CREATE INDEX IF NOT EXISTS idx_generated_content_project_status 
ON public.generated_content (project_id, status, created_at DESC);

-- 12. Gold standards for evaluation
CREATE INDEX IF NOT EXISTS idx_gold_standards_project 
ON public.gold_standard_answers (project_id);

-- 13. Benchmark runs
CREATE INDEX IF NOT EXISTS idx_benchmark_runs_benchmark_status 
ON public.benchmark_runs (benchmark_id, status);