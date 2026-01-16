-- Add cost_metrics column to rag_experiment_runs
ALTER TABLE public.rag_experiment_runs 
ADD COLUMN IF NOT EXISTS cost_metrics JSONB DEFAULT '{}'::jsonb;

-- Add latency tracking columns
ALTER TABLE public.rag_experiment_runs 
ADD COLUMN IF NOT EXISTS avg_query_latency_ms NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS p95_latency_ms NUMERIC DEFAULT 0;

-- Add baseline_strategy to rag_experiments for tracking how baseline was selected
ALTER TABLE public.rag_experiments
ADD COLUMN IF NOT EXISTS baseline_strategy TEXT DEFAULT 'quality_only';

-- Add index for cost-aware queries
CREATE INDEX IF NOT EXISTS idx_rag_experiment_runs_cost 
ON public.rag_experiment_runs USING gin (cost_metrics);

-- Add comment for documentation
COMMENT ON COLUMN public.rag_experiment_runs.cost_metrics IS 'Stores embedding_cost, evaluation_cost, total_tokens, estimated_usd';
COMMENT ON COLUMN public.rag_experiment_runs.avg_query_latency_ms IS 'Average query latency in milliseconds';
COMMENT ON COLUMN public.rag_experiment_runs.p95_latency_ms IS '95th percentile query latency in milliseconds';