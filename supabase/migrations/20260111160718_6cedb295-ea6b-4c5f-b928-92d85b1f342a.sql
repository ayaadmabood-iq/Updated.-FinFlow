-- Add processing_steps JSONB column to track pipeline stages
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS processing_steps JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.documents.processing_steps IS 'JSONB array tracking each processing stage: {stage, status, started_at, completed_at, duration_ms, error, result_summary}';

-- Create index for querying documents by processing status
CREATE INDEX IF NOT EXISTS idx_documents_processing_steps ON public.documents USING GIN (processing_steps);

-- Create enum type for processing stages (for documentation/validation)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'processing_stage') THEN
    CREATE TYPE processing_stage AS ENUM (
      'ingestion',
      'text_extraction', 
      'language_detection',
      'chunking',
      'summarization',
      'indexing'
    );
  END IF;
END $$;