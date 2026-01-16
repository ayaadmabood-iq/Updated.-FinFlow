-- Create pipeline_logs table for advanced performance tracing
CREATE TABLE public.pipeline_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trace_id UUID NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'skipped')),
  duration_ms INTEGER,
  error_details TEXT,
  memory_usage_mb NUMERIC(10, 2),
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(12, 8) DEFAULT 0,
  executor_version TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pipeline_logs (admin-only access)
ALTER TABLE public.pipeline_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view pipeline logs
CREATE POLICY "Admins can view pipeline logs"
ON public.pipeline_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Service role can insert (from edge functions)
CREATE POLICY "Service can insert pipeline logs"
ON public.pipeline_logs
FOR INSERT
WITH CHECK (true);

-- Create indexes for efficient querying
CREATE INDEX idx_pipeline_logs_trace_id ON public.pipeline_logs(trace_id);
CREATE INDEX idx_pipeline_logs_document_id ON public.pipeline_logs(document_id);
CREATE INDEX idx_pipeline_logs_stage_name ON public.pipeline_logs(stage_name);
CREATE INDEX idx_pipeline_logs_created_at ON public.pipeline_logs(created_at DESC);
CREATE INDEX idx_pipeline_logs_status ON public.pipeline_logs(status);

-- Add cost tracking columns to documents table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS processing_cost_usd NUMERIC(12, 8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trace_id UUID;

-- Create index for trace_id on documents
CREATE INDEX IF NOT EXISTS idx_documents_trace_id ON public.documents(trace_id);

-- Create extraction_cache table for smart caching
CREATE TABLE public.extraction_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_hash TEXT NOT NULL UNIQUE,
  extracted_text TEXT,
  extraction_method TEXT,
  text_length INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  use_count INTEGER DEFAULT 1
);

-- Enable RLS on extraction_cache
ALTER TABLE public.extraction_cache ENABLE ROW LEVEL SECURITY;

-- Service role can manage cache (no user access needed)
CREATE POLICY "Service can manage extraction cache"
ON public.extraction_cache
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for fast hash lookups
CREATE INDEX idx_extraction_cache_hash ON public.extraction_cache(file_hash);
CREATE INDEX idx_extraction_cache_last_used ON public.extraction_cache(last_used_at DESC);

-- Add comments
COMMENT ON TABLE public.pipeline_logs IS 'Tracks detailed execution metrics for each pipeline stage with cost and performance data';
COMMENT ON TABLE public.extraction_cache IS 'Caches extracted text by file hash to avoid redundant processing';
COMMENT ON COLUMN public.documents.processing_cost_usd IS 'Total AI cost for processing this document across all stages';
COMMENT ON COLUMN public.documents.total_tokens_used IS 'Total tokens consumed for processing this document';
COMMENT ON COLUMN public.documents.trace_id IS 'Unique trace ID that follows document through all pipeline stages';