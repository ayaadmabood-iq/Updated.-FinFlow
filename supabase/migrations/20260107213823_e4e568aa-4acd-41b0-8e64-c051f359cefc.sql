-- Create training_datasets table for Phase 5
CREATE TABLE public.training_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  
  -- Dataset info
  name TEXT NOT NULL,
  description TEXT,
  format TEXT NOT NULL DEFAULT 'openai' CHECK (format IN ('openai', 'anthropic', 'alpaca', 'sharegpt', 'custom')),
  
  -- Generation settings
  system_prompt TEXT,
  pair_generation_mode TEXT DEFAULT 'auto' CHECK (pair_generation_mode IN ('auto', 'qa', 'instruction', 'conversation', 'custom')),
  
  -- Statistics
  total_pairs INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10,4),
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'training', 'completed', 'failed')),
  error_message TEXT,
  
  -- Output
  jsonl_content TEXT,
  jsonl_storage_path TEXT,
  validation_result JSONB DEFAULT '{}',
  
  -- Timestamps
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create training_pairs table for individual prompt/completion pairs
CREATE TABLE public.training_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES public.training_datasets(id) ON DELETE CASCADE NOT NULL,
  
  -- Pair content
  system_message TEXT,
  user_message TEXT NOT NULL,
  assistant_message TEXT NOT NULL,
  
  -- Source tracking
  source_chunk_id UUID REFERENCES public.chunks(id) ON DELETE SET NULL,
  source_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  
  -- Quality
  quality_score DECIMAL(3,2),
  token_count INTEGER,
  is_valid BOOLEAN DEFAULT TRUE,
  validation_errors TEXT[],
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.training_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_pairs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_datasets
CREATE POLICY "Users can view own datasets" ON public.training_datasets
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can create own datasets" ON public.training_datasets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own datasets" ON public.training_datasets
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can delete own datasets" ON public.training_datasets
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for training_pairs (via dataset ownership)
CREATE POLICY "Users can view pairs of own datasets" ON public.training_pairs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM training_datasets WHERE id = dataset_id AND user_id = auth.uid())
  );
  
CREATE POLICY "Users can create pairs for own datasets" ON public.training_pairs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM training_datasets WHERE id = dataset_id AND user_id = auth.uid())
  );
  
CREATE POLICY "Users can update pairs of own datasets" ON public.training_pairs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM training_datasets WHERE id = dataset_id AND user_id = auth.uid())
  );
  
CREATE POLICY "Users can delete pairs of own datasets" ON public.training_pairs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM training_datasets WHERE id = dataset_id AND user_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_training_datasets_project ON public.training_datasets(project_id);
CREATE INDEX idx_training_datasets_status ON public.training_datasets(status);
CREATE INDEX idx_training_pairs_dataset ON public.training_pairs(dataset_id);
CREATE INDEX idx_training_pairs_quality ON public.training_pairs(quality_score);