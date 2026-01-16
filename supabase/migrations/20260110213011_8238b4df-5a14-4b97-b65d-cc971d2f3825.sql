-- =============================================================================
-- Phase 7: Open Source Model Fine-tuning Support
-- =============================================================================

-- Supported base models for fine-tuning
CREATE TABLE public.base_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_type TEXT NOT NULL,
  size TEXT NOT NULL,
  description TEXT,
  requirements JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.base_models ENABLE ROW LEVEL SECURITY;

-- Anyone can view active base models
CREATE POLICY "Anyone can view active base models"
ON public.base_models FOR SELECT
USING (is_active = true);

-- Fine-tuning jobs for open source models
CREATE TABLE public.finetune_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  base_model_id UUID REFERENCES public.base_models(id) NOT NULL,
  dataset_id UUID REFERENCES public.training_datasets(id),
  
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  external_job_id TEXT,
  
  training_config JSONB NOT NULL DEFAULT '{
    "epochs": 3,
    "batch_size": 4,
    "learning_rate": 0.00002,
    "warmup_steps": 100,
    "max_seq_length": 2048,
    "lora_r": 16,
    "lora_alpha": 32,
    "lora_dropout": 0.05
  }',
  
  training_samples INTEGER DEFAULT 0,
  current_epoch INTEGER DEFAULT 0,
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  loss FLOAT,
  
  output_model_path TEXT,
  metrics JSONB DEFAULT '{}',
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion TIMESTAMPTZ,
  
  gpu_hours FLOAT DEFAULT 0,
  estimated_cost FLOAT DEFAULT 0,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.finetune_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for finetune_jobs
CREATE POLICY "Users can view own finetune jobs"
ON public.finetune_jobs FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "Users can create own finetune jobs"
ON public.finetune_jobs FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own finetune jobs"
ON public.finetune_jobs FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own finetune jobs"
ON public.finetune_jobs FOR DELETE
USING (owner_id = auth.uid());

-- Indexes for finetune_jobs
CREATE INDEX idx_finetune_jobs_owner ON public.finetune_jobs(owner_id);
CREATE INDEX idx_finetune_jobs_project ON public.finetune_jobs(project_id);
CREATE INDEX idx_finetune_jobs_status ON public.finetune_jobs(status);
CREATE INDEX idx_finetune_jobs_created ON public.finetune_jobs(created_at DESC);

-- Trained models registry
CREATE TABLE public.trained_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  finetune_job_id UUID REFERENCES public.finetune_jobs(id) ON DELETE SET NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  base_model TEXT NOT NULL,
  
  provider TEXT NOT NULL,
  model_path TEXT NOT NULL,
  
  model_size_bytes BIGINT,
  quantization TEXT DEFAULT 'none',
  
  inference_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  status TEXT DEFAULT 'active',
  is_public BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trained_models ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trained_models
CREATE POLICY "Users can view own trained models"
ON public.trained_models FOR SELECT
USING (owner_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can create own trained models"
ON public.trained_models FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own trained models"
ON public.trained_models FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own trained models"
ON public.trained_models FOR DELETE
USING (owner_id = auth.uid());

-- Indexes for trained_models
CREATE INDEX idx_trained_models_owner ON public.trained_models(owner_id);
CREATE INDEX idx_trained_models_status ON public.trained_models(status);
CREATE INDEX idx_trained_models_created ON public.trained_models(created_at DESC);

-- Insert default base models
INSERT INTO public.base_models (name, provider, model_type, size, description, requirements) VALUES
('meta-llama/Llama-2-7b-hf', 'huggingface', 'llama', '7B', 'Meta LLaMA 2 7B - Good balance of performance and resources', '{"min_vram_gb": 16, "recommended_vram_gb": 24}'),
('meta-llama/Llama-2-13b-hf', 'huggingface', 'llama', '13B', 'Meta LLaMA 2 13B - Better quality, more resources needed', '{"min_vram_gb": 32, "recommended_vram_gb": 48}'),
('mistralai/Mistral-7B-v0.1', 'huggingface', 'mistral', '7B', 'Mistral 7B - Excellent performance for its size', '{"min_vram_gb": 16, "recommended_vram_gb": 24}'),
('mistralai/Mixtral-8x7B-v0.1', 'huggingface', 'mistral', '47B', 'Mixtral 8x7B MoE - State of the art open model', '{"min_vram_gb": 48, "recommended_vram_gb": 80}'),
('tiiuae/falcon-7b', 'huggingface', 'falcon', '7B', 'Falcon 7B - Strong multilingual support', '{"min_vram_gb": 16, "recommended_vram_gb": 24}'),
('Qwen/Qwen-7B', 'huggingface', 'qwen', '7B', 'Qwen 7B - Excellent for multilingual and coding', '{"min_vram_gb": 16, "recommended_vram_gb": 24}'),
('microsoft/phi-2', 'huggingface', 'phi', '2.7B', 'Phi-2 - Small but powerful, great for limited resources', '{"min_vram_gb": 8, "recommended_vram_gb": 12}');

-- Trigger for updated_at on finetune_jobs
CREATE TRIGGER update_finetune_jobs_updated_at
BEFORE UPDATE ON public.finetune_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on trained_models
CREATE TRIGGER update_trained_models_updated_at
BEFORE UPDATE ON public.trained_models
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();