-- Create data_sources table
CREATE TABLE public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  
  -- Source Info
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('file', 'url', 'text')),
  original_url TEXT,
  
  -- File Info (if source_type = 'file')
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  
  -- Raw Content (if source_type = 'text' or 'url')
  raw_content TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own data sources"
ON public.data_sources FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own data sources"
ON public.data_sources FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data sources"
ON public.data_sources FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own data sources"
ON public.data_sources FOR DELETE
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_data_sources_project ON public.data_sources(project_id);
CREATE INDEX idx_data_sources_status ON public.data_sources(status);
CREATE INDEX idx_data_sources_user ON public.data_sources(user_id);

-- Updated at trigger
CREATE TRIGGER update_data_sources_updated_at
BEFORE UPDATE ON public.data_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for data sources
INSERT INTO storage.buckets (id, name, public)
VALUES ('data-sources', 'data-sources', false);

-- Storage policies
CREATE POLICY "Users can upload own files to data-sources"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'data-sources' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own files from data-sources"
ON storage.objects FOR SELECT
USING (bucket_id = 'data-sources' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files from data-sources"
ON storage.objects FOR DELETE
USING (bucket_id = 'data-sources' AND auth.uid()::text = (storage.foldername(name))[1]);