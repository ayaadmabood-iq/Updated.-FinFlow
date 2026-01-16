-- Create training_jobs table to track fine-tuning jobs
CREATE TABLE public.training_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES public.training_datasets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Provider information
  provider TEXT NOT NULL DEFAULT 'openai',
  base_model TEXT NOT NULL,
  fine_tuned_model_id TEXT,
  provider_job_id TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  progress_percent INTEGER DEFAULT 0,
  current_step TEXT,
  
  -- Training configuration
  training_config JSONB DEFAULT '{}'::jsonb,
  
  -- Results
  result_metrics JSONB,
  error_message TEXT,
  
  -- Auto-training settings
  auto_started BOOLEAN DEFAULT false,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_training_jobs_dataset ON public.training_jobs(dataset_id);
CREATE INDEX idx_training_jobs_user ON public.training_jobs(user_id);
CREATE INDEX idx_training_jobs_status ON public.training_jobs(status);
CREATE INDEX idx_training_jobs_project ON public.training_jobs(project_id);

-- Enable RLS
ALTER TABLE public.training_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own training jobs"
  ON public.training_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own training jobs"
  ON public.training_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training jobs"
  ON public.training_jobs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own training jobs"
  ON public.training_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_training_jobs_updated_at
  BEFORE UPDATE ON public.training_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create user_api_keys table for storing encrypted API keys
CREATE TABLE public.user_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  
  -- Encrypted keys (stored encrypted, never plain text)
  openai_key_encrypted TEXT,
  anthropic_key_encrypted TEXT,
  
  -- Key metadata (not the actual keys)
  openai_key_set BOOLEAN DEFAULT false,
  anthropic_key_set BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_api_keys
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies for API keys
CREATE POLICY "Users can view own API key status"
  ON public.user_api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys"
  ON public.user_api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON public.user_api_keys FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON public.user_api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_api_keys_updated_at
  BEFORE UPDATE ON public.user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add auto_train_enabled to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS auto_train_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS auto_train_model TEXT DEFAULT 'gpt-4o-mini-2024-07-18';

-- Enable realtime for training_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_jobs;