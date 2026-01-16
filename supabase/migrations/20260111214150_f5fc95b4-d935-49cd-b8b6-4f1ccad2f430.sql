-- Add needs_reindexing flag and enriched_metadata to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS needs_reindexing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS enriched_metadata JSONB DEFAULT '{}';

-- Add embedding governance columns to chunks table  
ALTER TABLE public.chunks
ADD COLUMN IF NOT EXISTS embedding_model_version TEXT,
ADD COLUMN IF NOT EXISTS vector_dimension INTEGER DEFAULT 1536;

-- Create index for needs_reindexing flag for efficient bulk operations
CREATE INDEX IF NOT EXISTS idx_documents_needs_reindexing 
ON public.documents(needs_reindexing) 
WHERE needs_reindexing = true AND deleted_at IS NULL;

-- Create index for embedding model version matching in chunks
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_model_version 
ON public.chunks(embedding_model_version);

-- Add comment explaining the enriched_metadata structure
COMMENT ON COLUMN public.documents.enriched_metadata IS 'Contains extracted entities (dates, names, locations), keywords, and other enriched data';
COMMENT ON COLUMN public.documents.needs_reindexing IS 'Flag set when project embedding settings change - triggers re-indexing on next processing';
COMMENT ON COLUMN public.chunks.embedding_model_version IS 'Version of embedding model used for this chunk - enables version-aware search';
COMMENT ON COLUMN public.chunks.vector_dimension IS 'Dimension of the embedding vector stored';