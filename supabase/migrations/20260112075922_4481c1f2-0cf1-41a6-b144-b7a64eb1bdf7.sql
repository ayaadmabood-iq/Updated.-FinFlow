
-- Create enum for evaluation status
CREATE TYPE public.evaluation_status AS ENUM ('pending', 'verified', 'corrected', 'flagged');

-- Create enum for benchmark run status
CREATE TYPE public.benchmark_status AS ENUM ('pending', 'running', 'completed', 'failed');

-- Table for AI response evaluations and confidence scores
CREATE TABLE public.ai_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  original_response TEXT NOT NULL,
  verified_response TEXT,
  confidence_score NUMERIC(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  source_relevance_score NUMERIC(5,2),
  citation_density_score NUMERIC(5,2),
  verification_score NUMERIC(5,2),
  status evaluation_status DEFAULT 'pending',
  hallucinations_detected JSONB DEFAULT '[]',
  unsupported_claims JSONB DEFAULT '[]',
  reasoning_path JSONB DEFAULT '[]',
  source_chunks JSONB DEFAULT '[]',
  verification_duration_ms INTEGER,
  verifier_model TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for quality benchmark test suites
CREATE TABLE public.quality_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  expected_answers JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  avg_score NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for benchmark run results
CREATE TABLE public.benchmark_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  benchmark_id UUID NOT NULL REFERENCES public.quality_benchmarks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status benchmark_status DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  total_questions INTEGER DEFAULT 0,
  passed_questions INTEGER DEFAULT 0,
  avg_confidence_score NUMERIC(5,2),
  avg_response_time_ms INTEGER,
  results JSONB DEFAULT '[]',
  prompt_version TEXT,
  model_version TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for gold standard answers (RLHF corrections)
CREATE TABLE public.gold_standard_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  evaluation_id UUID REFERENCES public.ai_evaluations(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  approved_by UUID,
  query TEXT NOT NULL,
  incorrect_response TEXT NOT NULL,
  gold_response TEXT NOT NULL,
  correction_notes TEXT,
  is_applied_to_prompt BOOLEAN DEFAULT false,
  applied_at TIMESTAMP WITH TIME ZONE,
  source_document_ids UUID[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for project prompt configurations (for RLHF updates)
CREATE TABLE public.project_prompt_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL,
  system_prompt TEXT,
  additional_instructions TEXT,
  learned_patterns JSONB DEFAULT '[]',
  version INTEGER DEFAULT 1,
  last_updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ai_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gold_standard_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_prompt_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_evaluations
CREATE POLICY "Users can view evaluations for their projects"
ON public.ai_evaluations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = ai_evaluations.project_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create evaluations for their projects"
ON public.ai_evaluations FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = ai_evaluations.project_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update evaluations for their projects"
ON public.ai_evaluations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = ai_evaluations.project_id
    AND p.owner_id = auth.uid()
  )
);

-- RLS policies for quality_benchmarks
CREATE POLICY "Users can view benchmarks for their projects"
ON public.quality_benchmarks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = quality_benchmarks.project_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create benchmarks for their projects"
ON public.quality_benchmarks FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = quality_benchmarks.project_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update benchmarks for their projects"
ON public.quality_benchmarks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = quality_benchmarks.project_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete benchmarks for their projects"
ON public.quality_benchmarks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = quality_benchmarks.project_id
    AND p.owner_id = auth.uid()
  )
);

-- RLS policies for benchmark_runs
CREATE POLICY "Users can view benchmark runs for their projects"
ON public.benchmark_runs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = benchmark_runs.project_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create benchmark runs for their projects"
ON public.benchmark_runs FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = benchmark_runs.project_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update benchmark runs for their projects"
ON public.benchmark_runs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = benchmark_runs.project_id
    AND p.owner_id = auth.uid()
  )
);

-- RLS policies for gold_standard_answers
CREATE POLICY "Users can view gold standards for their projects"
ON public.gold_standard_answers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = gold_standard_answers.project_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create gold standards for their projects"
ON public.gold_standard_answers FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = gold_standard_answers.project_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update gold standards for their projects"
ON public.gold_standard_answers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = gold_standard_answers.project_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete gold standards for their projects"
ON public.gold_standard_answers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = gold_standard_answers.project_id
    AND p.owner_id = auth.uid()
  )
);

-- RLS policies for project_prompt_configs
CREATE POLICY "Users can view prompt configs for their projects"
ON public.project_prompt_configs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_prompt_configs.project_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create prompt configs for their projects"
ON public.project_prompt_configs FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_prompt_configs.project_id
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update prompt configs for their projects"
ON public.project_prompt_configs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_prompt_configs.project_id
    AND p.owner_id = auth.uid()
  )
);

-- Indexes for performance
CREATE INDEX idx_ai_evaluations_project ON public.ai_evaluations(project_id);
CREATE INDEX idx_ai_evaluations_status ON public.ai_evaluations(status);
CREATE INDEX idx_ai_evaluations_created ON public.ai_evaluations(created_at DESC);
CREATE INDEX idx_quality_benchmarks_project ON public.quality_benchmarks(project_id);
CREATE INDEX idx_benchmark_runs_benchmark ON public.benchmark_runs(benchmark_id);
CREATE INDEX idx_benchmark_runs_project ON public.benchmark_runs(project_id);
CREATE INDEX idx_gold_standard_project ON public.gold_standard_answers(project_id);
CREATE INDEX idx_gold_standard_applied ON public.gold_standard_answers(is_applied_to_prompt);

-- Triggers for updated_at
CREATE TRIGGER update_ai_evaluations_updated_at
BEFORE UPDATE ON public.ai_evaluations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quality_benchmarks_updated_at
BEFORE UPDATE ON public.quality_benchmarks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gold_standard_updated_at
BEFORE UPDATE ON public.gold_standard_answers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prompt_configs_updated_at
BEFORE UPDATE ON public.project_prompt_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
