-- ============= GO Completion: Database Optimization =============
-- Goal: Reduce triggers to <10, consolidate policies, remove business logic from DB

-- ============= PHASE 1: Remove Non-Essential Triggers =============

-- Remove updated_at triggers (use DB default instead)
DROP TRIGGER IF EXISTS update_workflow_rules_updated_at ON workflow_rules;
DROP TRIGGER IF EXISTS update_workflow_integrations_updated_at ON workflow_integrations;
DROP TRIGGER IF EXISTS update_visual_extractions_updated_at ON visual_extractions;

-- Remove non-essential search vector triggers (Advanced features)
DROP TRIGGER IF EXISTS update_article_search ON knowledge_base_articles;
DROP TRIGGER IF EXISTS update_glossary_terms_search_vector ON glossary_terms;
DROP TRIGGER IF EXISTS trigger_media_assets_search_vector ON media_assets;
DROP TRIGGER IF EXISTS trigger_transcription_search_vector ON media_transcriptions;

-- Remove business logic triggers (move to application layer)
DROP TRIGGER IF EXISTS update_thread_on_message ON chat_messages;
DROP TRIGGER IF EXISTS ensure_single_ai_baseline_trigger ON ai_quality_baselines;
DROP TRIGGER IF EXISTS trigger_ensure_single_baseline ON rag_experiments;
DROP TRIGGER IF EXISTS trigger_update_eval_set_query_count ON rag_eval_queries;

-- ============= PHASE 2: Drop Non-Essential Functions =============
-- Keep only core functions, drop others

-- Drop advanced feature functions
DROP FUNCTION IF EXISTS update_article_search_vector() CASCADE;
DROP FUNCTION IF EXISTS update_glossary_term_search_vector() CASCADE;
DROP FUNCTION IF EXISTS update_media_assets_search_vector() CASCADE;
DROP FUNCTION IF EXISTS update_transcription_search_vector() CASCADE;
DROP FUNCTION IF EXISTS update_thread_last_message() CASCADE;
DROP FUNCTION IF EXISTS ensure_single_ai_baseline() CASCADE;
DROP FUNCTION IF EXISTS ensure_single_baseline() CASCADE;
DROP FUNCTION IF EXISTS update_eval_set_query_count() CASCADE;
DROP FUNCTION IF EXISTS update_rag_updated_at() CASCADE;

-- Drop AI governance functions (move to edge functions)
DROP FUNCTION IF EXISTS can_deploy_ai_change(uuid) CASCADE;

-- ============= PHASE 3: Consolidate RLS Policies =============
-- Use a unified access pattern with check_access function

-- Create optimized project access check function
CREATE OR REPLACE FUNCTION public.user_owns_project(project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id 
    AND (p.owner_id = auth.uid() OR is_admin(auth.uid()))
  )
$$;

-- Create optimized document access check function  
CREATE OR REPLACE FUNCTION public.user_owns_document(document_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_id 
    AND (d.owner_id = auth.uid() OR is_admin(auth.uid()))
  )
$$;

-- Add index for faster project ownership lookups
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);

-- ============= PHASE 4: Verify Embedding Metadata Columns =============
-- Ensure all required columns exist

ALTER TABLE chunks ADD COLUMN IF NOT EXISTS embedding_model text;
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS embedding_model_version text;
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS chunking_version text;
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS embedding_date timestamptz;

-- Add indexes for version queries
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_model ON chunks(embedding_model);
CREATE INDEX IF NOT EXISTS idx_chunks_chunking_version ON chunks(chunking_version);

-- Add comments for documentation
COMMENT ON COLUMN chunks.embedding_model IS 'Model used to generate embeddings (e.g., text-embedding-3-small)';
COMMENT ON COLUMN chunks.embedding_model_version IS 'Version of the embedding model';
COMMENT ON COLUMN chunks.chunking_version IS 'Version of the chunking strategy used';
COMMENT ON COLUMN chunks.embedding_date IS 'Timestamp when embedding was generated';

-- ============= Done =============
-- Remaining essential triggers: ~7-8
-- on_auth_user_created, on_profile_created_usage, trg_update_document_search_vector, 
-- trg_update_chunk_search_vector, update_document_count, sync_subscription_tier, on_team_created
