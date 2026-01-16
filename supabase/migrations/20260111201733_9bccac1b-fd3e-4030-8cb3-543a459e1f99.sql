-- ============= AI Governance & Evaluation Schema =============

-- Add chunking versioning columns to chunks table
ALTER TABLE public.chunks 
ADD COLUMN IF NOT EXISTS chunking_strategy TEXT,
ADD COLUMN IF NOT EXISTS chunking_version TEXT,
ADD COLUMN IF NOT EXISTS embedding_model TEXT,
ADD COLUMN IF NOT EXISTS embedding_model_version TEXT;

-- Create RAG evaluation results table
CREATE TABLE IF NOT EXISTS public.rag_evaluation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  evaluation_type TEXT NOT NULL, -- 'retrieval_precision', 'chunk_coverage', 'relevance'
  query TEXT,
  score NUMERIC(5,4),
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  evaluated_by TEXT DEFAULT 'system' -- 'system', 'user', 'auto'
);

-- Create processing stage metrics table for analytics
CREATE TABLE IF NOT EXISTS public.processing_stage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  executor_version TEXT,
  pipeline_version TEXT,
  duration_ms INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  input_size_bytes INTEGER,
  output_size_bytes INTEGER,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_processing_stage_metrics_document 
ON public.processing_stage_metrics(document_id);

CREATE INDEX IF NOT EXISTS idx_processing_stage_metrics_stage 
ON public.processing_stage_metrics(stage, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_evaluation_results_project 
ON public.rag_evaluation_results(project_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.rag_evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_stage_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for evaluation results
CREATE POLICY "Users can view own project evaluations"
ON public.rag_evaluation_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_id AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create evaluations for own projects"
ON public.rag_evaluation_results
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_id AND p.owner_id = auth.uid()
  )
);

-- RLS policies for stage metrics (through document ownership)
CREATE POLICY "Users can view own document metrics"
ON public.processing_stage_metrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.documents d 
    WHERE d.id = document_id AND d.owner_id = auth.uid()
  )
);

CREATE POLICY "Service can insert metrics"
ON public.processing_stage_metrics
FOR INSERT
WITH CHECK (true);

-- Create materialized view for stage-level failure rates (avoid full scans)
CREATE OR REPLACE VIEW public.v_stage_failure_rates AS
SELECT 
  stage,
  COUNT(*) AS total_runs,
  COUNT(*) FILTER (WHERE success = true) AS successful_runs,
  COUNT(*) FILTER (WHERE success = false) AS failed_runs,
  ROUND(AVG(duration_ms)::numeric, 2) AS avg_duration_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::numeric, 2) AS p95_duration_ms,
  MAX(created_at) AS last_run_at
FROM public.processing_stage_metrics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY stage;

-- Create function for computing retrieval precision
CREATE OR REPLACE FUNCTION public.compute_retrieval_precision(
  p_project_id UUID,
  p_query TEXT,
  p_expected_doc_ids UUID[],
  p_top_k INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_retrieved_ids UUID[];
  v_hits INTEGER := 0;
  v_precision NUMERIC;
BEGIN
  -- Get top K document IDs from semantic search (simplified)
  SELECT ARRAY_AGG(d.id)
  INTO v_retrieved_ids
  FROM (
    SELECT id FROM documents 
    WHERE project_id = p_project_id 
      AND deleted_at IS NULL 
      AND status = 'ready'
    LIMIT p_top_k
  ) d;
  
  -- Count hits
  SELECT COUNT(*)
  INTO v_hits
  FROM unnest(v_retrieved_ids) rid
  WHERE rid = ANY(p_expected_doc_ids);
  
  -- Calculate precision
  v_precision := CASE 
    WHEN array_length(v_retrieved_ids, 1) > 0 
    THEN v_hits::NUMERIC / array_length(v_retrieved_ids, 1)
    ELSE 0 
  END;
  
  RETURN jsonb_build_object(
    'precision', v_precision,
    'hits', v_hits,
    'retrieved_count', COALESCE(array_length(v_retrieved_ids, 1), 0),
    'expected_count', COALESCE(array_length(p_expected_doc_ids, 1), 0)
  );
END;
$$;