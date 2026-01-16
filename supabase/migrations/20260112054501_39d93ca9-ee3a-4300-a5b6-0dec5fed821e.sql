-- Create enum for integration providers
CREATE TYPE integration_provider AS ENUM ('google_drive', 'gmail', 'slack', 'microsoft_teams', 'webhook');

-- Create enum for integration status
CREATE TYPE integration_status AS ENUM ('pending', 'active', 'expired', 'revoked', 'error');

-- Create integrations table for OAuth connections
CREATE TABLE public.integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  provider integration_provider NOT NULL,
  status integration_status NOT NULL DEFAULT 'pending',
  
  -- Encrypted token storage (using Supabase Vault pattern)
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Provider-specific configuration
  config JSONB DEFAULT '{}'::jsonb,
  -- e.g., { "watch_folder_id": "xxx", "label_id": "xxx", "webhook_url": "xxx" }
  
  -- Webhook settings for outbound
  webhook_url TEXT,
  webhook_secret TEXT,
  webhook_events TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Metadata
  display_name TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, project_id, provider)
);

-- Create API keys table for developer access
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Key details (store hashed, show prefix only)
  key_prefix VARCHAR(8) NOT NULL,
  key_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  
  -- Permissions & limits
  scopes TEXT[] DEFAULT ARRAY['ingest:write', 'documents:read']::TEXT[],
  rate_limit_per_minute INT DEFAULT 60,
  rate_limit_per_day INT DEFAULT 1000,
  
  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  usage_count INT DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create integration events table for activity feed
CREATE TABLE public.integration_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL,
  
  -- Event details
  event_type TEXT NOT NULL,
  -- e.g., 'file_detected', 'file_ingested', 'notification_sent', 'api_call', 'error'
  provider integration_provider,
  
  -- Event data
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Related resources
  resource_type TEXT,
  resource_id TEXT,
  resource_name TEXT,
  
  -- Status
  status TEXT DEFAULT 'success',
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create API rate limiting table
CREATE TABLE public.api_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  window_type TEXT NOT NULL, -- 'minute' or 'day'
  request_count INT DEFAULT 1,
  
  UNIQUE(api_key_id, window_start, window_type)
);

-- Enable RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integrations
CREATE POLICY "Users can view their own integrations"
  ON public.integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own integrations"
  ON public.integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
  ON public.integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations"
  ON public.integrations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for API keys
CREATE POLICY "Users can view their own API keys"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
  ON public.api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
  ON public.api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for integration events
CREATE POLICY "Users can view their own integration events"
  ON public.integration_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert integration events"
  ON public.integration_events FOR INSERT
  WITH CHECK (true);

-- RLS for rate limits (system managed)
CREATE POLICY "System can manage rate limits"
  ON public.api_rate_limits FOR ALL
  USING (true);

-- Indexes for performance
CREATE INDEX idx_integrations_user_id ON public.integrations(user_id);
CREATE INDEX idx_integrations_project_id ON public.integrations(project_id);
CREATE INDEX idx_integrations_provider ON public.integrations(provider);
CREATE INDEX idx_integrations_status ON public.integrations(status);

CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_project_id ON public.api_keys(project_id);
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON public.api_keys(is_active);

CREATE INDEX idx_integration_events_user_id ON public.integration_events(user_id);
CREATE INDEX idx_integration_events_project_id ON public.integration_events(project_id);
CREATE INDEX idx_integration_events_created_at ON public.integration_events(created_at DESC);
CREATE INDEX idx_integration_events_event_type ON public.integration_events(event_type);

CREATE INDEX idx_api_rate_limits_key_window ON public.api_rate_limits(api_key_id, window_start, window_type);

-- Trigger for updated_at
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check API rate limit
CREATE OR REPLACE FUNCTION public.check_api_rate_limit(
  p_api_key_id UUID,
  p_rate_limit_per_minute INT,
  p_rate_limit_per_day INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_minute_count INT;
  v_day_count INT;
  v_minute_start TIMESTAMPTZ;
  v_day_start TIMESTAMPTZ;
BEGIN
  v_minute_start := date_trunc('minute', now());
  v_day_start := date_trunc('day', now());
  
  -- Get current minute count
  SELECT COALESCE(request_count, 0) INTO v_minute_count
  FROM api_rate_limits
  WHERE api_key_id = p_api_key_id 
    AND window_start = v_minute_start 
    AND window_type = 'minute';
  
  -- Get current day count
  SELECT COALESCE(SUM(request_count), 0) INTO v_day_count
  FROM api_rate_limits
  WHERE api_key_id = p_api_key_id 
    AND window_start >= v_day_start
    AND window_type = 'minute';
  
  -- Check limits
  IF v_minute_count >= p_rate_limit_per_minute THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'minute_limit_exceeded',
      'retry_after', 60 - EXTRACT(SECOND FROM now())::INT
    );
  END IF;
  
  IF v_day_count >= p_rate_limit_per_day THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit_exceeded',
      'retry_after', EXTRACT(EPOCH FROM (v_day_start + interval '1 day' - now()))::INT
    );
  END IF;
  
  -- Increment counter
  INSERT INTO api_rate_limits (api_key_id, window_start, window_type, request_count)
  VALUES (p_api_key_id, v_minute_start, 'minute', 1)
  ON CONFLICT (api_key_id, window_start, window_type)
  DO UPDATE SET request_count = api_rate_limits.request_count + 1;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'minute_remaining', p_rate_limit_per_minute - v_minute_count - 1,
    'daily_remaining', p_rate_limit_per_day - v_day_count - 1
  );
END;
$$;

-- Enable realtime for integration events
ALTER PUBLICATION supabase_realtime ADD TABLE public.integration_events;