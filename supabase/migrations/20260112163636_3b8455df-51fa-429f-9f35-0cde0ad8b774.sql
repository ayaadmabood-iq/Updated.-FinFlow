-- Update projects chunk_strategy constraint to include new honest naming
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS check_chunk_strategy;

ALTER TABLE public.projects
ADD CONSTRAINT check_chunk_strategy 
CHECK (chunk_strategy IN (
  'fixed', 
  'sentence', 
  'heuristic_semantic',  -- renamed from 'semantic' for honesty
  'embedding_cluster',    -- true semantic via embeddings
  'ai_topic'              -- AI-powered topic detection
));

-- Update any existing 'semantic' to 'heuristic_semantic'
UPDATE public.projects 
SET chunk_strategy = 'heuristic_semantic' 
WHERE chunk_strategy = 'semantic';

-- Add embedding versioning columns to documents if not exists
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS embedding_model text DEFAULT 'text-embedding-3-small',
ADD COLUMN IF NOT EXISTS embedding_model_version text DEFAULT '2024-01',
ADD COLUMN IF NOT EXISTS embedding_date timestamptz,
ADD COLUMN IF NOT EXISTS embedding_dimensions integer DEFAULT 1536;

-- Add gold_standard_answers table for retrieval evaluation
CREATE TABLE IF NOT EXISTS public.gold_standard_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  query text NOT NULL,
  expected_answer text NOT NULL,
  expected_document_ids uuid[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gold_standard_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view gold standards in their projects"
  ON public.gold_standard_answers FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage gold standards in their projects"
  ON public.gold_standard_answers FOR ALL
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );

-- Add retrieval_evaluations table for tracking search quality
CREATE TABLE IF NOT EXISTS public.retrieval_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  gold_standard_id uuid REFERENCES public.gold_standard_answers(id) ON DELETE SET NULL,
  query text NOT NULL,
  search_mode text DEFAULT 'hybrid',
  results jsonb NOT NULL DEFAULT '[]',
  precision_at_k numeric,
  recall_at_k numeric,
  ndcg_at_k numeric,
  latency_ms integer,
  model_version text,
  embedding_model text,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.retrieval_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view evaluations in their projects"
  ON public.retrieval_evaluations FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );

-- Add ai_quality_metrics table for tracking AI behavior over time
CREATE TABLE IF NOT EXISTS public.ai_quality_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  metric_type text NOT NULL, -- 'embedding_quality', 'search_relevance', 'summarization', 'chunking'
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  dimension text, -- e.g., 'precision', 'recall', 'rouge_l', 'coherence'
  sample_size integer,
  metadata jsonb DEFAULT '{}',
  model_version text,
  measured_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_quality_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics in their projects"
  ON public.ai_quality_metrics FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert metrics in their projects"
  ON public.ai_quality_metrics FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );

-- Add injection_detection_logs for security monitoring
CREATE TABLE IF NOT EXISTS public.injection_detection_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  detected_patterns text[] NOT NULL DEFAULT '{}',
  severity text NOT NULL DEFAULT 'low',
  source_type text NOT NULL, -- 'document_upload', 'chat_input', 'api_input'
  content_sample text, -- truncated sample, not full content
  action_taken text DEFAULT 'logged', -- 'logged', 'blocked', 'sanitized'
  user_id uuid,
  detected_at timestamptz NOT NULL DEFAULT now()
);

-- No RLS for injection logs - admin only via service role
ALTER TABLE public.injection_detection_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gold_standards_project ON public.gold_standard_answers(project_id);
CREATE INDEX IF NOT EXISTS idx_retrieval_evals_project ON public.retrieval_evaluations(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_project_type ON public.ai_quality_metrics(project_id, metric_type);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_measured_at ON public.ai_quality_metrics(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_injection_logs_detected ON public.injection_detection_logs(detected_at DESC);