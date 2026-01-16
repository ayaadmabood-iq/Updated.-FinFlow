-- Phase 6: Full-Text Search Enhancement
-- Add tsvector columns for PostgreSQL full-text search

-- Add search vector columns to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add search vector column to chunks table
ALTER TABLE public.chunks
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN indexes for fast full-text search
CREATE INDEX IF NOT EXISTS idx_documents_search_vector 
ON public.documents USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_chunks_search_vector 
ON public.chunks USING GIN (search_vector);

-- Create additional indexes for common filter columns
CREATE INDEX IF NOT EXISTS idx_documents_language 
ON public.documents (language);

CREATE INDEX IF NOT EXISTS idx_documents_created_at 
ON public.documents (created_at);

CREATE INDEX IF NOT EXISTS idx_documents_mime_type 
ON public.documents (mime_type);

-- Function to update document search vector
CREATE OR REPLACE FUNCTION public.update_document_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.original_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.extracted_text, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to update chunk search vector
CREATE OR REPLACE FUNCTION public.update_chunk_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic search vector updates
DROP TRIGGER IF EXISTS trg_update_document_search_vector ON public.documents;
CREATE TRIGGER trg_update_document_search_vector
BEFORE INSERT OR UPDATE OF name, original_name, summary, extracted_text
ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_document_search_vector();

DROP TRIGGER IF EXISTS trg_update_chunk_search_vector ON public.chunks;
CREATE TRIGGER trg_update_chunk_search_vector
BEFORE INSERT OR UPDATE OF content
ON public.chunks
FOR EACH ROW
EXECUTE FUNCTION public.update_chunk_search_vector();

-- Create hybrid search function for documents (full-text + semantic)
CREATE OR REPLACE FUNCTION public.hybrid_search_documents(
  search_query text,
  query_embedding extensions.vector DEFAULT NULL,
  match_threshold double precision DEFAULT 0.5,
  match_count integer DEFAULT 10,
  filter_project_id uuid DEFAULT NULL,
  filter_owner_id uuid DEFAULT NULL,
  filter_mime_types text[] DEFAULT NULL,
  filter_language text DEFAULT NULL,
  filter_date_from timestamptz DEFAULT NULL,
  filter_date_to timestamptz DEFAULT NULL,
  use_semantic boolean DEFAULT true,
  use_fulltext boolean DEFAULT true
)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  owner_id uuid,
  name text,
  original_name text,
  mime_type text,
  language text,
  summary text,
  created_at timestamptz,
  semantic_score double precision,
  fulltext_score double precision,
  combined_score double precision,
  matched_snippet text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ts_query tsquery;
BEGIN
  -- Build tsquery from search query
  ts_query := plainto_tsquery('english', search_query);

  RETURN QUERY
  SELECT 
    d.id,
    d.project_id,
    d.owner_id,
    d.name,
    d.original_name,
    d.mime_type,
    d.language,
    d.summary,
    d.created_at,
    CASE 
      WHEN use_semantic AND query_embedding IS NOT NULL AND d.embedding IS NOT NULL 
      THEN 1 - (d.embedding <=> query_embedding)
      ELSE 0
    END AS semantic_score,
    CASE 
      WHEN use_fulltext AND d.search_vector IS NOT NULL 
      THEN ts_rank_cd(d.search_vector, ts_query)
      ELSE 0
    END AS fulltext_score,
    -- Combined score with weighted average (semantic 0.7, fulltext 0.3)
    (
      CASE 
        WHEN use_semantic AND query_embedding IS NOT NULL AND d.embedding IS NOT NULL 
        THEN 0.7 * (1 - (d.embedding <=> query_embedding))
        ELSE 0
      END +
      CASE 
        WHEN use_fulltext AND d.search_vector IS NOT NULL 
        THEN 0.3 * LEAST(ts_rank_cd(d.search_vector, ts_query), 1.0)
        ELSE 0
      END
    ) AS combined_score,
    -- Extract matching snippet
    CASE 
      WHEN use_fulltext AND d.search_vector @@ ts_query 
      THEN ts_headline('english', COALESCE(d.summary, d.extracted_text, ''), ts_query, 
        'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20')
      ELSE LEFT(COALESCE(d.summary, ''), 200)
    END AS matched_snippet
  FROM documents d
  WHERE 
    d.deleted_at IS NULL
    AND d.status = 'ready'
    AND (filter_owner_id IS NULL OR d.owner_id = filter_owner_id)
    AND (filter_project_id IS NULL OR d.project_id = filter_project_id)
    AND (filter_mime_types IS NULL OR d.mime_type = ANY(filter_mime_types))
    AND (filter_language IS NULL OR d.language = filter_language)
    AND (filter_date_from IS NULL OR d.created_at >= filter_date_from)
    AND (filter_date_to IS NULL OR d.created_at <= filter_date_to)
    AND (
      -- Must match at least one search method
      (use_semantic AND query_embedding IS NOT NULL AND d.embedding IS NOT NULL 
        AND (1 - (d.embedding <=> query_embedding)) > match_threshold)
      OR
      (use_fulltext AND d.search_vector @@ ts_query)
    )
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- Create hybrid search function for chunks
CREATE OR REPLACE FUNCTION public.hybrid_search_chunks(
  search_query text,
  query_embedding extensions.vector DEFAULT NULL,
  match_threshold double precision DEFAULT 0.5,
  match_count integer DEFAULT 10,
  filter_project_id uuid DEFAULT NULL,
  filter_owner_id uuid DEFAULT NULL,
  filter_mime_types text[] DEFAULT NULL,
  filter_language text DEFAULT NULL,
  filter_date_from timestamptz DEFAULT NULL,
  filter_date_to timestamptz DEFAULT NULL,
  use_semantic boolean DEFAULT true,
  use_fulltext boolean DEFAULT true
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  project_id uuid,
  content text,
  chunk_index integer,
  document_name text,
  mime_type text,
  language text,
  created_at timestamptz,
  semantic_score double precision,
  fulltext_score double precision,
  combined_score double precision,
  matched_snippet text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ts_query tsquery;
BEGIN
  ts_query := plainto_tsquery('english', search_query);

  RETURN QUERY
  SELECT 
    c.id AS chunk_id,
    c.document_id,
    d.project_id,
    c.content,
    c.index AS chunk_index,
    d.name AS document_name,
    d.mime_type,
    d.language,
    d.created_at,
    CASE 
      WHEN use_semantic AND query_embedding IS NOT NULL AND c.embedding IS NOT NULL 
      THEN 1 - (c.embedding <=> query_embedding)
      ELSE 0
    END AS semantic_score,
    CASE 
      WHEN use_fulltext AND c.search_vector IS NOT NULL 
      THEN ts_rank_cd(c.search_vector, ts_query)
      ELSE 0
    END AS fulltext_score,
    (
      CASE 
        WHEN use_semantic AND query_embedding IS NOT NULL AND c.embedding IS NOT NULL 
        THEN 0.7 * (1 - (c.embedding <=> query_embedding))
        ELSE 0
      END +
      CASE 
        WHEN use_fulltext AND c.search_vector IS NOT NULL 
        THEN 0.3 * LEAST(ts_rank_cd(c.search_vector, ts_query), 1.0)
        ELSE 0
      END
    ) AS combined_score,
    CASE 
      WHEN use_fulltext AND c.search_vector @@ ts_query 
      THEN ts_headline('english', c.content, ts_query, 
        'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20')
      ELSE LEFT(c.content, 200)
    END AS matched_snippet
  FROM chunks c
  JOIN documents d ON c.document_id = d.id
  WHERE 
    d.deleted_at IS NULL
    AND d.status = 'ready'
    AND (filter_owner_id IS NULL OR d.owner_id = filter_owner_id)
    AND (filter_project_id IS NULL OR d.project_id = filter_project_id)
    AND (filter_mime_types IS NULL OR d.mime_type = ANY(filter_mime_types))
    AND (filter_language IS NULL OR d.language = filter_language)
    AND (filter_date_from IS NULL OR d.created_at >= filter_date_from)
    AND (filter_date_to IS NULL OR d.created_at <= filter_date_to)
    AND (
      (use_semantic AND query_embedding IS NOT NULL AND c.embedding IS NOT NULL 
        AND (1 - (c.embedding <=> query_embedding)) > match_threshold)
      OR
      (use_fulltext AND c.search_vector @@ ts_query)
    )
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- Backfill search vectors for existing documents
UPDATE public.documents 
SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(original_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(summary, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(extracted_text, '')), 'C')
WHERE search_vector IS NULL;

-- Backfill search vectors for existing chunks
UPDATE public.chunks
SET search_vector = to_tsvector('english', COALESCE(content, ''))
WHERE search_vector IS NULL;