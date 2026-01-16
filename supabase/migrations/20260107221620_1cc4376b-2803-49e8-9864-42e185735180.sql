-- Training metrics storage for tracking fine-tuning progress
CREATE TABLE public.training_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.training_jobs(id) ON DELETE CASCADE,
  step INTEGER NOT NULL,
  loss DECIMAL,
  accuracy DECIMAL,
  tokens_processed INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.training_metrics ENABLE ROW LEVEL SECURITY;

-- Users can view metrics for their own training jobs
CREATE POLICY "Users can view their training metrics"
ON public.training_metrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.training_jobs tj
    WHERE tj.id = job_id AND tj.user_id = auth.uid()
  )
);

-- Users can insert metrics for their own jobs
CREATE POLICY "Users can insert training metrics"
ON public.training_metrics
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.training_jobs tj
    WHERE tj.id = job_id AND tj.user_id = auth.uid()
  )
);

-- Export history for tracking dataset exports
CREATE TABLE public.export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES public.training_datasets(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  format TEXT NOT NULL,
  record_count INTEGER,
  file_size_bytes BIGINT,
  file_url TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own exports
CREATE POLICY "Users can view their exports"
ON public.export_history
FOR SELECT
USING (user_id = auth.uid());

-- Users can create exports
CREATE POLICY "Users can create exports"
ON public.export_history
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own exports
CREATE POLICY "Users can update their exports"
ON public.export_history
FOR UPDATE
USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_training_metrics_job_id ON public.training_metrics(job_id);
CREATE INDEX idx_training_metrics_step ON public.training_metrics(job_id, step);
CREATE INDEX idx_export_history_project ON public.export_history(project_id);
CREATE INDEX idx_export_history_user ON public.export_history(user_id);

-- Enable realtime for training metrics
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_metrics;