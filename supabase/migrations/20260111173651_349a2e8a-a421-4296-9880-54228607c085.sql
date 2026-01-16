-- RAG Experiments & Evaluation Engine Tables
-- No breaking changes, all new tables

-- RAG Experiments: defines a retrieval configuration to test
CREATE TABLE public.rag_experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  chunking_config_hash TEXT,
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  embedding_model_version TEXT,
  retrieval_config JSONB NOT NULL DEFAULT '{
    "top_k": 5,
    "similarity_threshold": 0.7,
    "filters": {}
  }'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RAG Evaluation Sets: groups of test queries
CREATE TABLE public.rag_eval_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  query_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RAG Evaluation Queries: individual test cases
CREATE TABLE public.rag_eval_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  eval_set_id UUID NOT NULL REFERENCES public.rag_eval_sets(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  expected_chunk_ids UUID[] NOT NULL DEFAULT '{}',
  expected_document_ids UUID[] NOT NULL DEFAULT '{}',
  relevance_scores JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RAG Experiment Runs: execution results
CREATE TABLE public.rag_experiment_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES public.rag_experiments(id) ON DELETE CASCADE,
  eval_set_id UUID NOT NULL REFERENCES public.rag_eval_sets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  query_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_rag_experiments_project ON public.rag_experiments(project_id);
CREATE INDEX idx_rag_experiments_user ON public.rag_experiments(user_id);
CREATE INDEX idx_rag_eval_sets_project ON public.rag_eval_sets(project_id);
CREATE INDEX idx_rag_eval_queries_set ON public.rag_eval_queries(eval_set_id);
CREATE INDEX idx_rag_experiment_runs_experiment ON public.rag_experiment_runs(experiment_id);
CREATE INDEX idx_rag_experiment_runs_eval_set ON public.rag_experiment_runs(eval_set_id);

-- Enable RLS
ALTER TABLE public.rag_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_eval_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_eval_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_experiment_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rag_experiments
CREATE POLICY "Users can view own experiments" ON public.rag_experiments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own experiments" ON public.rag_experiments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own experiments" ON public.rag_experiments
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own experiments" ON public.rag_experiments
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for rag_eval_sets
CREATE POLICY "Users can view own eval sets" ON public.rag_eval_sets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own eval sets" ON public.rag_eval_sets
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own eval sets" ON public.rag_eval_sets
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own eval sets" ON public.rag_eval_sets
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for rag_eval_queries (via eval_set ownership)
CREATE POLICY "Users can view queries in own eval sets" ON public.rag_eval_queries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.rag_eval_sets WHERE id = eval_set_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create queries in own eval sets" ON public.rag_eval_queries
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.rag_eval_sets WHERE id = eval_set_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update queries in own eval sets" ON public.rag_eval_queries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.rag_eval_sets WHERE id = eval_set_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete queries in own eval sets" ON public.rag_eval_queries
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.rag_eval_sets WHERE id = eval_set_id AND user_id = auth.uid())
  );

-- RLS Policies for rag_experiment_runs
CREATE POLICY "Users can view own experiment runs" ON public.rag_experiment_runs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own experiment runs" ON public.rag_experiment_runs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own experiment runs" ON public.rag_experiment_runs
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own experiment runs" ON public.rag_experiment_runs
  FOR DELETE USING (user_id = auth.uid());

-- Trigger to update query_count in eval_sets
CREATE OR REPLACE FUNCTION update_eval_set_query_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.rag_eval_sets SET query_count = query_count + 1 WHERE id = NEW.eval_set_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.rag_eval_sets SET query_count = query_count - 1 WHERE id = OLD.eval_set_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_eval_set_query_count
AFTER INSERT OR DELETE ON public.rag_eval_queries
FOR EACH ROW EXECUTE FUNCTION update_eval_set_query_count();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_rag_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_rag_experiments_updated_at
BEFORE UPDATE ON public.rag_experiments
FOR EACH ROW EXECUTE FUNCTION update_rag_updated_at();

CREATE TRIGGER trigger_rag_eval_sets_updated_at
BEFORE UPDATE ON public.rag_eval_sets
FOR EACH ROW EXECUTE FUNCTION update_rag_updated_at();