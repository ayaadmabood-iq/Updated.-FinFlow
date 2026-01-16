-- ============= AI Governance & Continuous Improvement Schema =============
-- Evaluation-driven development, model upgrade governance, regression detection

-- AI Change Requests: Track all proposed AI configuration changes
CREATE TABLE IF NOT EXISTS public.ai_change_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  change_type text NOT NULL CHECK (change_type IN ('chunking_strategy', 'embedding_model', 'retrieval_config', 'prompt_template', 'threshold_adjustment')),
  proposed_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  current_config jsonb NOT NULL DEFAULT '{}',
  proposed_config jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'evaluating', 'approved', 'rejected', 'deployed', 'rolled_back')),
  requires_approval boolean NOT NULL DEFAULT true,
  is_breaking_change boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  evaluated_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  deployed_at timestamptz,
  rolled_back_at timestamptz,
  rollback_reason text
);

ALTER TABLE public.ai_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view change requests in their projects"
  ON public.ai_change_requests FOR SELECT
  USING (project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid()));

CREATE POLICY "Users can create change requests in their projects"
  ON public.ai_change_requests FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid()));

CREATE POLICY "Users can update change requests in their projects"
  ON public.ai_change_requests FOR UPDATE
  USING (project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid()));

-- Evaluation Gates: Require evaluation before deployment
CREATE TABLE IF NOT EXISTS public.ai_evaluation_gates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  change_request_id uuid NOT NULL REFERENCES public.ai_change_requests(id) ON DELETE CASCADE,
  baseline_metrics jsonb NOT NULL DEFAULT '{}',
  proposed_metrics jsonb NOT NULL DEFAULT '{}',
  passed boolean,
  failure_reasons text[],
  precision_delta numeric,
  recall_delta numeric,
  ndcg_delta numeric,
  latency_delta_ms integer,
  cost_delta_usd numeric,
  threshold_config jsonb NOT NULL DEFAULT '{"min_precision": 0, "min_recall": 0, "max_latency_increase_ms": 500, "max_cost_increase_percent": 20}',
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  evaluated_by uuid
);

ALTER TABLE public.ai_evaluation_gates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view evaluation gates via change requests"
  ON public.ai_evaluation_gates FOR SELECT
  USING (change_request_id IN (
    SELECT id FROM public.ai_change_requests 
    WHERE project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  ));

CREATE POLICY "Users can insert evaluation gates"
  ON public.ai_evaluation_gates FOR INSERT
  WITH CHECK (change_request_id IN (
    SELECT id FROM public.ai_change_requests 
    WHERE project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  ));

-- Model Version Registry: Track all active and historical model versions
CREATE TABLE IF NOT EXISTS public.ai_model_registry (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  model_type text NOT NULL CHECK (model_type IN ('embedding', 'chunking', 'summarization', 'generation')),
  model_name text NOT NULL,
  model_version text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  is_baseline boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}',
  performance_metrics jsonb DEFAULT '{}',
  deployment_percentage integer NOT NULL DEFAULT 0 CHECK (deployment_percentage >= 0 AND deployment_percentage <= 100),
  deployed_at timestamptz,
  deprecated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(project_id, model_type, model_version)
);

ALTER TABLE public.ai_model_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view model registry for their projects"
  ON public.ai_model_registry FOR SELECT
  USING (project_id IS NULL OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid()));

CREATE POLICY "Users can manage model registry for their projects"
  ON public.ai_model_registry FOR ALL
  USING (project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid()));

-- Quality Baselines: Store baseline metrics for comparison
CREATE TABLE IF NOT EXISTS public.ai_quality_baselines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  baseline_type text NOT NULL CHECK (baseline_type IN ('retrieval', 'chunking', 'embedding', 'summarization', 'overall')),
  metrics jsonb NOT NULL DEFAULT '{}',
  sample_size integer NOT NULL DEFAULT 0,
  model_config jsonb NOT NULL DEFAULT '{}',
  is_current boolean NOT NULL DEFAULT true,
  established_at timestamptz NOT NULL DEFAULT now(),
  established_by uuid,
  superseded_at timestamptz,
  superseded_by uuid
);

ALTER TABLE public.ai_quality_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quality baselines for their projects"
  ON public.ai_quality_baselines FOR SELECT
  USING (project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid()));

CREATE POLICY "Users can manage quality baselines for their projects"
  ON public.ai_quality_baselines FOR ALL
  USING (project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid()));

-- Regression Alerts: Track detected quality regressions
CREATE TABLE IF NOT EXISTS public.ai_regression_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('precision_drop', 'recall_drop', 'latency_spike', 'cost_anomaly', 'quality_drift', 'error_rate_spike')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metric_name text NOT NULL,
  baseline_value numeric NOT NULL,
  current_value numeric NOT NULL,
  delta_percent numeric NOT NULL,
  threshold_exceeded numeric,
  is_acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  related_change_id uuid REFERENCES public.ai_change_requests(id),
  detected_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

ALTER TABLE public.ai_regression_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view regression alerts for their projects"
  ON public.ai_regression_alerts FOR SELECT
  USING (project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid()));

CREATE POLICY "Users can manage regression alerts for their projects"
  ON public.ai_regression_alerts FOR ALL
  USING (project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid()));

-- AI Governance Audit Log: Immutable record of all AI governance actions
CREATE TABLE IF NOT EXISTS public.ai_governance_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  action_category text NOT NULL CHECK (action_category IN ('change_request', 'evaluation', 'approval', 'deployment', 'rollback', 'baseline_update', 'model_registration', 'alert_handling')),
  resource_type text NOT NULL,
  resource_id uuid,
  before_state jsonb,
  after_state jsonb,
  justification text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_governance_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view governance audit for their projects"
  ON public.ai_governance_audit FOR SELECT
  USING (project_id IS NULL OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid()));

-- Only service role can insert (via edge functions)
CREATE POLICY "Service role can insert governance audit"
  ON public.ai_governance_audit FOR INSERT
  WITH CHECK (true);

-- A/B Test Experiments: Track model comparison experiments
CREATE TABLE IF NOT EXISTS public.ai_ab_experiments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  experiment_name text NOT NULL,
  description text,
  control_model_id uuid REFERENCES public.ai_model_registry(id),
  treatment_model_id uuid REFERENCES public.ai_model_registry(id),
  control_percentage integer NOT NULL DEFAULT 50 CHECK (control_percentage >= 0 AND control_percentage <= 100),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
  start_date timestamptz,
  end_date timestamptz,
  min_sample_size integer NOT NULL DEFAULT 100,
  current_sample_size integer NOT NULL DEFAULT 0,
  control_metrics jsonb DEFAULT '{}',
  treatment_metrics jsonb DEFAULT '{}',
  winner text CHECK (winner IN ('control', 'treatment', 'no_difference', NULL)),
  statistical_significance numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  completed_at timestamptz
);

ALTER TABLE public.ai_ab_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view A/B experiments for their projects"
  ON public.ai_ab_experiments FOR SELECT
  USING (project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid()));

CREATE POLICY "Users can manage A/B experiments for their projects"
  ON public.ai_ab_experiments FOR ALL
  USING (project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid()));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_change_requests_project_status ON public.ai_change_requests(project_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_change_requests_created_at ON public.ai_change_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_evaluation_gates_change_request ON public.ai_evaluation_gates(change_request_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_registry_active ON public.ai_model_registry(project_id, model_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_quality_baselines_current ON public.ai_quality_baselines(project_id, baseline_type) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_ai_regression_alerts_unresolved ON public.ai_regression_alerts(project_id, severity) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_ai_governance_audit_project ON public.ai_governance_audit(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_ab_experiments_running ON public.ai_ab_experiments(project_id) WHERE status = 'running';

-- Trigger to ensure only one baseline per type per project
CREATE OR REPLACE FUNCTION public.ensure_single_ai_baseline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE public.ai_quality_baselines 
    SET is_current = false, superseded_at = now()
    WHERE project_id = NEW.project_id 
      AND baseline_type = NEW.baseline_type
      AND id != NEW.id 
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_single_ai_baseline_trigger ON public.ai_quality_baselines;
CREATE TRIGGER ensure_single_ai_baseline_trigger
  BEFORE INSERT OR UPDATE ON public.ai_quality_baselines
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_ai_baseline();

-- Function to check if AI change can be deployed
CREATE OR REPLACE FUNCTION public.can_deploy_ai_change(p_change_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_change RECORD;
  v_gate RECORD;
  v_result jsonb;
BEGIN
  -- Get change request
  SELECT * INTO v_change FROM public.ai_change_requests WHERE id = p_change_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_deploy', false, 'reason', 'Change request not found');
  END IF;
  
  -- Check status
  IF v_change.status NOT IN ('pending', 'approved') THEN
    RETURN jsonb_build_object('can_deploy', false, 'reason', 'Change must be pending or approved', 'current_status', v_change.status);
  END IF;
  
  -- Get latest evaluation gate
  SELECT * INTO v_gate 
  FROM public.ai_evaluation_gates 
  WHERE change_request_id = p_change_request_id 
  ORDER BY evaluated_at DESC 
  LIMIT 1;
  
  -- Must have evaluation
  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_deploy', false, 'reason', 'No evaluation found - evaluation is mandatory');
  END IF;
  
  -- Evaluation must pass
  IF v_gate.passed IS NOT true THEN
    RETURN jsonb_build_object(
      'can_deploy', false, 
      'reason', 'Evaluation failed', 
      'failure_reasons', v_gate.failure_reasons,
      'metrics', jsonb_build_object(
        'precision_delta', v_gate.precision_delta,
        'recall_delta', v_gate.recall_delta,
        'ndcg_delta', v_gate.ndcg_delta
      )
    );
  END IF;
  
  -- Check if breaking change requires approval
  IF v_change.is_breaking_change AND v_change.approved_at IS NULL THEN
    RETURN jsonb_build_object('can_deploy', false, 'reason', 'Breaking change requires explicit approval');
  END IF;
  
  RETURN jsonb_build_object(
    'can_deploy', true, 
    'evaluation_passed', true,
    'evaluated_at', v_gate.evaluated_at,
    'metrics', jsonb_build_object(
      'precision_delta', v_gate.precision_delta,
      'recall_delta', v_gate.recall_delta,
      'ndcg_delta', v_gate.ndcg_delta,
      'latency_delta_ms', v_gate.latency_delta_ms
    )
  );
END;
$$;