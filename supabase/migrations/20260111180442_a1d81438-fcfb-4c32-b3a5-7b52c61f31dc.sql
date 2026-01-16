-- Add budget and guardrail fields to projects
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS monthly_budget_usd NUMERIC DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS max_cost_per_query_usd NUMERIC DEFAULT 0.01,
ADD COLUMN IF NOT EXISTS preferred_baseline_strategy TEXT DEFAULT 'balanced',
ADD COLUMN IF NOT EXISTS budget_enforcement_mode TEXT DEFAULT 'warn';

-- Create table for tracking project costs
CREATE TABLE IF NOT EXISTS public.project_cost_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  operation_type TEXT NOT NULL, -- 'experiment_run', 'evaluation', 'optimization', 'query'
  operation_id TEXT, -- Reference to the specific run/experiment
  cost_usd NUMERIC NOT NULL DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  model_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.project_cost_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_cost_logs
CREATE POLICY "Users can view their own cost logs"
  ON public.project_cost_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cost logs"
  ON public.project_cost_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create table for budget alerts/decisions
CREATE TABLE IF NOT EXISTS public.budget_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  decision_type TEXT NOT NULL, -- 'abort', 'downgrade', 'proceed', 'warn'
  reason TEXT NOT NULL,
  original_config JSONB,
  adjusted_config JSONB,
  estimated_cost_usd NUMERIC,
  actual_cost_usd NUMERIC,
  quality_impact_percent NUMERIC, -- e.g., -2.5 means 2.5% quality reduction
  cost_savings_percent NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.budget_decisions ENABLE ROW LEVEL SECURITY;

-- RLS policies for budget_decisions
CREATE POLICY "Users can view their own budget decisions"
  ON public.budget_decisions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget decisions"
  ON public.budget_decisions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_project_cost_logs_project_id ON public.project_cost_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_cost_logs_created_at ON public.project_cost_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_project_cost_logs_user_month ON public.project_cost_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_budget_decisions_project_id ON public.budget_decisions(project_id);

-- Function to get current month's spending for a project
CREATE OR REPLACE FUNCTION public.get_project_month_spending(p_project_id UUID)
RETURNS NUMERIC
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(cost_usd), 0)
  FROM project_cost_logs
  WHERE project_id = p_project_id
    AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
    AND created_at < date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month';
$$;

-- Function to check budget and return status
CREATE OR REPLACE FUNCTION public.check_project_budget(
  p_project_id UUID,
  p_estimated_cost NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project RECORD;
  v_current_spending NUMERIC;
  v_remaining NUMERIC;
  v_days_in_month INTEGER;
  v_days_elapsed INTEGER;
  v_burn_rate NUMERIC;
  v_projected_end NUMERIC;
BEGIN
  -- Get project settings
  SELECT monthly_budget_usd, max_cost_per_query_usd, budget_enforcement_mode
  INTO v_project
  FROM projects
  WHERE id = p_project_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Project not found');
  END IF;
  
  -- Get current month spending
  v_current_spending := get_project_month_spending(p_project_id);
  v_remaining := v_project.monthly_budget_usd - v_current_spending;
  
  -- Calculate burn rate
  v_days_in_month := EXTRACT(DAY FROM (date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month - 1 day'));
  v_days_elapsed := GREATEST(EXTRACT(DAY FROM CURRENT_TIMESTAMP), 1);
  v_burn_rate := v_current_spending / v_days_elapsed;
  v_projected_end := v_burn_rate * v_days_in_month;
  
  RETURN jsonb_build_object(
    'monthly_budget_usd', v_project.monthly_budget_usd,
    'current_spending_usd', v_current_spending,
    'remaining_budget_usd', v_remaining,
    'estimated_cost_usd', p_estimated_cost,
    'will_exceed_budget', (v_current_spending + p_estimated_cost) > v_project.monthly_budget_usd,
    'burn_rate_per_day_usd', v_burn_rate,
    'projected_month_end_usd', v_projected_end,
    'on_track', v_projected_end <= v_project.monthly_budget_usd,
    'enforcement_mode', v_project.budget_enforcement_mode,
    'max_cost_per_query_usd', v_project.max_cost_per_query_usd
  );
END;
$$;

-- Add comments for documentation
COMMENT ON COLUMN public.projects.monthly_budget_usd IS 'Maximum monthly budget for RAG operations';
COMMENT ON COLUMN public.projects.max_cost_per_query_usd IS 'Maximum cost allowed per query';
COMMENT ON COLUMN public.projects.preferred_baseline_strategy IS 'quality_only, cost_aware, latency_aware, balanced';
COMMENT ON COLUMN public.projects.budget_enforcement_mode IS 'warn, abort, or auto_downgrade';