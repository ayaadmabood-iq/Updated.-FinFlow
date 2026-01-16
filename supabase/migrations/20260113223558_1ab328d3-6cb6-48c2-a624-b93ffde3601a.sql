-- ============= AI Usage Logs Table =============
-- Centralized logging for all AI operations
-- Tracks: user, project, operation, model, tokens, cost, latency, security

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  project_id uuid NULL,
  operation text NOT NULL,
  model text NOT NULL,
  modality text DEFAULT 'text' CHECK (modality IN ('text', 'vision', 'audio', 'embedding')),
  blocked boolean DEFAULT false,
  block_reason text NULL,
  threats text[] NULL,
  input_length integer DEFAULT 0,
  tokens_in integer DEFAULT 0,
  tokens_out integer DEFAULT 0,
  tokens_total integer DEFAULT 0,
  cost_usd numeric(10,8) DEFAULT 0,
  latency_ms integer DEFAULT 0,
  model_selection_reason text NULL,
  metadata jsonb NULL,
  request_id uuid DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_created 
  ON public.ai_usage_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_project_created 
  ON public.ai_usage_logs(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_operation_created 
  ON public.ai_usage_logs(operation, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_blocked 
  ON public.ai_usage_logs(blocked) WHERE blocked = true;

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at 
  ON public.ai_usage_logs(created_at DESC);

-- RLS Policies
-- Users can read their own logs
CREATE POLICY "Users can read own AI usage logs"
  ON public.ai_usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all logs
CREATE POLICY "Admins can read all AI usage logs"
  ON public.ai_usage_logs
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Only service role can insert (Edge Functions use service role)
CREATE POLICY "Service role can insert AI usage logs"
  ON public.ai_usage_logs
  FOR INSERT
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.ai_usage_logs IS 'Centralized logging for all AI operations - tracks usage, costs, and security events';
COMMENT ON COLUMN public.ai_usage_logs.blocked IS 'Whether the request was blocked due to security concerns';
COMMENT ON COLUMN public.ai_usage_logs.threats IS 'Array of detected threat patterns if any';
COMMENT ON COLUMN public.ai_usage_logs.modality IS 'Type of AI request: text, vision, audio, or embedding';