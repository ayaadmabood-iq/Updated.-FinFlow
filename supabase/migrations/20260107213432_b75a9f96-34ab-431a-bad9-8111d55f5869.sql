-- Add Phase 4 processing columns to documents table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_metadata JSONB DEFAULT '{}';

-- Add processing metadata to chunks for deduplication tracking
ALTER TABLE public.chunks
ADD COLUMN IF NOT EXISTS hash TEXT,
ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2);

-- Create index for deduplication lookups
CREATE INDEX IF NOT EXISTS idx_chunks_hash ON public.chunks(hash) WHERE hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_quality ON public.documents(quality_score) WHERE quality_score IS NOT NULL;