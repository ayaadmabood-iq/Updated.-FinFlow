-- =====================================================================
-- HYBRID SEARCH POSTGRESQL FUNCTIONS
-- Migration: 20260115000001_hybrid_search_functions.sql
-- Purpose: Enable hybrid search (vector + keyword) for advanced RAG
-- =====================================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS match_documents_vector(vector, uuid, float, int);
DROP FUNCTION IF EXISTS match_documents_keyword(text, uuid, int);
DROP FUNCTION IF EXISTS documents_content_tsv_trigger();

-- =====================================================================
-- 1. VECTOR SEARCH FUNCTION (using pgvector)
-- =====================================================================

CREATE OR REPLACE FUNCTION match_documents_vector(
  query_embedding vector(1536),
  collection_id uuid,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity,
    d.created_at
  FROM documents d
  WHERE d.collection_id = match_documents_vector.collection_id
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_documents_vector IS 'Performs vector similarity search using pgvector cosine distance';

-- =====================================================================
-- 2. KEYWORD SEARCH FUNCTION (using full-text search)
-- =====================================================================

CREATE OR REPLACE FUNCTION match_documents_keyword(
  query_text text,
  collection_id uuid,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  rank float,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    ts_rank_cd(d.content_tsv, plainto_tsquery('english', query_text)) as rank,
    d.created_at
  FROM documents d
  WHERE d.collection_id = match_documents_keyword.collection_id
    AND d.content_tsv @@ plainto_tsquery('english', query_text)
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_documents_keyword IS 'Performs keyword-based full-text search using PostgreSQL tsvector';

-- =====================================================================
-- 3. ADD FULL-TEXT SEARCH COLUMN
-- =====================================================================

-- Add tsvector column if it doesn't exist
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS content_tsv tsvector;

COMMENT ON COLUMN documents.content_tsv IS 'Full-text search vector for keyword search';

-- =====================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =====================================================================

-- GIN index for full-text search (if not exists)
CREATE INDEX IF NOT EXISTS documents_content_tsv_idx
  ON documents USING GIN (content_tsv);

-- Index on collection_id for faster filtering
CREATE INDEX IF NOT EXISTS documents_collection_id_idx
  ON documents(collection_id)
  WHERE collection_id IS NOT NULL;

-- Index on created_at for recency boosting
CREATE INDEX IF NOT EXISTS documents_created_at_idx
  ON documents(created_at DESC NULLS LAST);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS documents_collection_created_idx
  ON documents(collection_id, created_at DESC)
  WHERE collection_id IS NOT NULL;

-- Index for vector similarity with collection filtering
-- Note: This creates a partial index for better performance
CREATE INDEX IF NOT EXISTS documents_embedding_collection_idx
  ON documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100)
  WHERE collection_id IS NOT NULL;

-- =====================================================================
-- 5. TRIGGER FUNCTION FOR AUTO-UPDATING TSVECTOR
-- =====================================================================

CREATE OR REPLACE FUNCTION documents_content_tsv_trigger()
RETURNS trigger AS $$
BEGIN
  -- Automatically update the tsvector column when content changes
  NEW.content_tsv := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION documents_content_tsv_trigger IS 'Automatically updates content_tsv when document content changes';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS documents_content_tsv_update ON documents;

-- Create trigger to auto-update tsvector on insert/update
CREATE TRIGGER documents_content_tsv_update
  BEFORE INSERT OR UPDATE OF content ON documents
  FOR EACH ROW
  EXECUTE FUNCTION documents_content_tsv_trigger();

-- =====================================================================
-- 6. POPULATE EXISTING DOCUMENTS
-- =====================================================================

-- Update existing documents to populate content_tsv
-- Only updates rows where content_tsv is NULL to avoid unnecessary work
UPDATE documents
SET content_tsv = to_tsvector('english', COALESCE(content, ''))
WHERE content_tsv IS NULL AND content IS NOT NULL;

-- =====================================================================
-- 7. GRANT PERMISSIONS
-- =====================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION match_documents_vector TO authenticated;
GRANT EXECUTE ON FUNCTION match_documents_keyword TO authenticated;

-- Grant usage on sequences (if needed)
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================================
-- 8. HELPER FUNCTION: COMBINED HYBRID SEARCH
-- =====================================================================

CREATE OR REPLACE FUNCTION match_documents_hybrid(
  query_text text,
  query_embedding vector(1536),
  collection_id uuid,
  vector_weight float DEFAULT 0.7,
  keyword_weight float DEFAULT 0.3,
  match_count int DEFAULT 20,
  min_score float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  vector_score float,
  keyword_score float,
  hybrid_score float,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_vector_score float;
  max_keyword_score float;
BEGIN
  -- Get max scores for normalization
  SELECT MAX(1 - (d.embedding <=> query_embedding))
  INTO max_vector_score
  FROM documents d
  WHERE d.collection_id = match_documents_hybrid.collection_id;

  SELECT MAX(ts_rank_cd(d.content_tsv, plainto_tsquery('english', query_text)))
  INTO max_keyword_score
  FROM documents d
  WHERE d.collection_id = match_documents_hybrid.collection_id
    AND d.content_tsv @@ plainto_tsquery('english', query_text);

  -- Set defaults if no results found
  max_vector_score := COALESCE(max_vector_score, 1.0);
  max_keyword_score := COALESCE(max_keyword_score, 1.0);

  RETURN QUERY
  WITH vector_results AS (
    SELECT
      d.id,
      1 - (d.embedding <=> query_embedding) as similarity
    FROM documents d
    WHERE d.collection_id = match_documents_hybrid.collection_id
  ),
  keyword_results AS (
    SELECT
      d.id,
      ts_rank_cd(d.content_tsv, plainto_tsquery('english', query_text)) as rank
    FROM documents d
    WHERE d.collection_id = match_documents_hybrid.collection_id
      AND d.content_tsv @@ plainto_tsquery('english', query_text)
  ),
  combined AS (
    SELECT
      d.id,
      d.content,
      d.metadata,
      d.created_at,
      COALESCE(v.similarity / max_vector_score, 0.0) as norm_vector_score,
      COALESCE(k.rank / max_keyword_score, 0.0) as norm_keyword_score
    FROM documents d
    LEFT JOIN vector_results v ON d.id = v.id
    LEFT JOIN keyword_results k ON d.id = k.id
    WHERE d.collection_id = match_documents_hybrid.collection_id
      AND (v.similarity IS NOT NULL OR k.rank IS NOT NULL)
  )
  SELECT
    c.id,
    c.content,
    c.metadata,
    c.norm_vector_score as vector_score,
    c.norm_keyword_score as keyword_score,
    (c.norm_vector_score * vector_weight + c.norm_keyword_score * keyword_weight) as hybrid_score,
    c.created_at
  FROM combined c
  WHERE (c.norm_vector_score * vector_weight + c.norm_keyword_score * keyword_weight) >= min_score
  ORDER BY hybrid_score DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_documents_hybrid IS 'Performs hybrid search combining vector and keyword search with weighted scoring';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION match_documents_hybrid TO authenticated;

-- =====================================================================
-- 9. STATISTICS AND MONITORING
-- =====================================================================

-- Create view for monitoring search performance
CREATE OR REPLACE VIEW v_search_statistics AS
SELECT
  COUNT(*) FILTER (WHERE content_tsv IS NOT NULL) as documents_with_fts,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as documents_with_embedding,
  COUNT(*) FILTER (WHERE content_tsv IS NOT NULL AND embedding IS NOT NULL) as documents_with_both,
  COUNT(*) as total_documents,
  COUNT(DISTINCT collection_id) as total_collections,
  pg_size_pretty(pg_total_relation_size('documents')) as table_size,
  pg_size_pretty(pg_indexes_size('documents')) as index_size
FROM documents;

COMMENT ON VIEW v_search_statistics IS 'Provides statistics about search readiness and storage';

-- Grant select permission on view
GRANT SELECT ON v_search_statistics TO authenticated;

-- =====================================================================
-- 10. VALIDATION QUERIES
-- =====================================================================

-- Test that functions work (optional validation)
DO $$
DECLARE
  test_result integer;
BEGIN
  -- Test vector function exists and is callable
  SELECT COUNT(*) INTO test_result
  FROM pg_proc
  WHERE proname = 'match_documents_vector';

  IF test_result = 0 THEN
    RAISE EXCEPTION 'match_documents_vector function not created';
  END IF;

  -- Test keyword function exists
  SELECT COUNT(*) INTO test_result
  FROM pg_proc
  WHERE proname = 'match_documents_keyword';

  IF test_result = 0 THEN
    RAISE EXCEPTION 'match_documents_keyword function not created';
  END IF;

  -- Test hybrid function exists
  SELECT COUNT(*) INTO test_result
  FROM pg_proc
  WHERE proname = 'match_documents_hybrid';

  IF test_result = 0 THEN
    RAISE EXCEPTION 'match_documents_hybrid function not created';
  END IF;

  RAISE NOTICE 'All hybrid search functions created successfully';
END;
$$;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Hybrid search migration completed successfully';
  RAISE NOTICE 'Functions created: match_documents_vector, match_documents_keyword, match_documents_hybrid';
  RAISE NOTICE 'Indexes created: content_tsv_idx, collection_id_idx, created_at_idx';
  RAISE NOTICE 'Trigger created: documents_content_tsv_update';
END;
$$;
