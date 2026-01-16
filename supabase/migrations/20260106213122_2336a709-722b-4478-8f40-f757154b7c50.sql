-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Add embedding column to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add embedding column to chunks table
ALTER TABLE public.chunks 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for document embeddings (using IVFFlat for better performance)
CREATE INDEX IF NOT EXISTS idx_documents_embedding 
ON public.documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for chunk embeddings
CREATE INDEX IF NOT EXISTS idx_chunks_embedding 
ON public.chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create function for vector similarity search on documents
CREATE OR REPLACE FUNCTION public.search_documents_by_embedding(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_project_id uuid DEFAULT NULL,
  filter_owner_id uuid DEFAULT NULL,
  filter_mime_types text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  owner_id uuid,
  name text,
  original_name text,
  mime_type text,
  summary text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.project_id,
    d.owner_id,
    d.name,
    d.original_name,
    d.mime_type,
    d.summary,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE 
    d.embedding IS NOT NULL
    AND d.deleted_at IS NULL
    AND d.status = 'ready'
    AND (filter_owner_id IS NULL OR d.owner_id = filter_owner_id)
    AND (filter_project_id IS NULL OR d.project_id = filter_project_id)
    AND (filter_mime_types IS NULL OR d.mime_type = ANY(filter_mime_types))
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create function for vector similarity search on chunks
CREATE OR REPLACE FUNCTION public.search_chunks_by_embedding(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_project_id uuid DEFAULT NULL,
  filter_owner_id uuid DEFAULT NULL,
  filter_mime_types text[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  project_id uuid,
  content text,
  chunk_index int,
  document_name text,
  mime_type text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS chunk_id,
    c.document_id,
    d.project_id,
    c.content,
    c.index AS chunk_index,
    d.name AS document_name,
    d.mime_type,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM chunks c
  JOIN documents d ON c.document_id = d.id
  WHERE 
    c.embedding IS NOT NULL
    AND d.deleted_at IS NULL
    AND d.status = 'ready'
    AND (filter_owner_id IS NULL OR d.owner_id = filter_owner_id)
    AND (filter_project_id IS NULL OR d.project_id = filter_project_id)
    AND (filter_mime_types IS NULL OR d.mime_type = ANY(filter_mime_types))
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;