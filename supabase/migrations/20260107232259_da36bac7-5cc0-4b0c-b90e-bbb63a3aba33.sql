-- Training checkpoints for fault tolerance and auto-resume
CREATE TABLE public.training_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.training_jobs(id) ON DELETE CASCADE,
  step INTEGER NOT NULL,
  loss DECIMAL,
  val_loss DECIMAL,
  accuracy DECIMAL,
  file_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient checkpoint retrieval
CREATE INDEX idx_training_checkpoints_job_id ON public.training_checkpoints(job_id);
CREATE INDEX idx_training_checkpoints_step ON public.training_checkpoints(job_id, step DESC);

-- Enable RLS
ALTER TABLE public.training_checkpoints ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_checkpoints
CREATE POLICY "Users can view checkpoints of own jobs" 
ON public.training_checkpoints 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.training_jobs tj 
    WHERE tj.id = training_checkpoints.job_id 
    AND tj.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert checkpoints for own jobs" 
ON public.training_checkpoints 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.training_jobs tj 
    WHERE tj.id = training_checkpoints.job_id 
    AND tj.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete checkpoints of own jobs" 
ON public.training_checkpoints 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.training_jobs tj 
    WHERE tj.id = training_checkpoints.job_id 
    AND tj.user_id = auth.uid()
  )
);

-- Add pause/resume status to training_jobs if not exists
-- Also add checkpoint-related columns
DO $$
BEGIN
  -- Add checkpoint_path column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'training_jobs' AND column_name = 'checkpoint_path') THEN
    ALTER TABLE public.training_jobs ADD COLUMN checkpoint_path TEXT;
  END IF;
  
  -- Add total_steps column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'training_jobs' AND column_name = 'total_steps') THEN
    ALTER TABLE public.training_jobs ADD COLUMN total_steps INTEGER;
  END IF;
  
  -- Add current_checkpoint_step column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'training_jobs' AND column_name = 'current_checkpoint_step') THEN
    ALTER TABLE public.training_jobs ADD COLUMN current_checkpoint_step INTEGER DEFAULT 0;
  END IF;
END $$;

-- Enable realtime for training_checkpoints
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_checkpoints;