-- Create enums for media types
CREATE TYPE public.media_type AS ENUM ('image', 'chart', 'diagram', 'video', 'audio');
CREATE TYPE public.extraction_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE public.transcription_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Media assets table for storing extracted/uploaded media
CREATE TABLE public.media_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  media_type public.media_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  duration_seconds NUMERIC,
  page_number INTEGER,
  source_coordinates JSONB,
  ai_description TEXT,
  ai_tags TEXT[],
  extracted_data JSONB,
  embedding TEXT,
  search_vector tsvector,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Visual extractions table for chart-to-data conversions
CREATE TABLE public.visual_extractions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  extraction_type TEXT NOT NULL,
  status public.extraction_status NOT NULL DEFAULT 'pending',
  extracted_data JSONB,
  structured_table JSONB,
  chart_type TEXT,
  data_labels TEXT[],
  data_values JSONB,
  confidence_score NUMERIC,
  error_message TEXT,
  tokens_used INTEGER,
  processing_cost_usd NUMERIC,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Transcriptions table for video/audio
CREATE TABLE public.media_transcriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status public.transcription_status NOT NULL DEFAULT 'pending',
  transcript_text TEXT,
  transcript_segments JSONB,
  language TEXT,
  duration_seconds NUMERIC,
  word_count INTEGER,
  speaker_labels JSONB,
  keyframes JSONB,
  visual_summary TEXT,
  tokens_used INTEGER,
  processing_cost_usd NUMERIC,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  search_vector tsvector,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat image uploads for multi-modal chat
CREATE TABLE public.chat_image_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES public.shared_chat_threads(id) ON DELETE CASCADE,
  message_id UUID,
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  ai_analysis JSONB,
  selected_region JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Function to update media_assets search vector
CREATE OR REPLACE FUNCTION public.update_media_assets_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.ai_description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.ai_tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update transcription search vector
CREATE OR REPLACE FUNCTION public.update_transcription_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.transcript_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for search vectors
CREATE TRIGGER trigger_media_assets_search_vector
  BEFORE INSERT OR UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_media_assets_search_vector();

CREATE TRIGGER trigger_transcription_search_vector
  BEFORE INSERT OR UPDATE ON public.media_transcriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_transcription_search_vector();

-- Enable RLS on all tables
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_image_uploads ENABLE ROW LEVEL SECURITY;

-- RLS policies for media_assets
CREATE POLICY "Users can view media in their projects" ON public.media_assets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = media_assets.project_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.project_shares WHERE project_id = media_assets.project_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create media in their projects" ON public.media_assets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = media_assets.project_id AND owner_id = auth.uid())
  );

CREATE POLICY "Users can update their own media" ON public.media_assets
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own media" ON public.media_assets
  FOR DELETE USING (user_id = auth.uid());

-- RLS policies for visual_extractions
CREATE POLICY "Users can view extractions in their projects" ON public.visual_extractions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = visual_extractions.project_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.project_shares WHERE project_id = visual_extractions.project_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create extractions in their projects" ON public.visual_extractions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = visual_extractions.project_id AND owner_id = auth.uid())
  );

CREATE POLICY "Users can update their own extractions" ON public.visual_extractions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own extractions" ON public.visual_extractions
  FOR DELETE USING (user_id = auth.uid());

-- RLS policies for media_transcriptions
CREATE POLICY "Users can view transcriptions in their projects" ON public.media_transcriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = media_transcriptions.project_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.project_shares WHERE project_id = media_transcriptions.project_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create transcriptions in their projects" ON public.media_transcriptions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = media_transcriptions.project_id AND owner_id = auth.uid())
  );

CREATE POLICY "Users can update their own transcriptions" ON public.media_transcriptions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own transcriptions" ON public.media_transcriptions
  FOR DELETE USING (user_id = auth.uid());

-- RLS policies for chat_image_uploads
CREATE POLICY "Users can view chat images in their projects" ON public.chat_image_uploads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = chat_image_uploads.project_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.project_shares WHERE project_id = chat_image_uploads.project_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can upload chat images" ON public.chat_image_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat images" ON public.chat_image_uploads
  FOR DELETE USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_media_assets_project ON public.media_assets(project_id);
CREATE INDEX idx_media_assets_document ON public.media_assets(document_id);
CREATE INDEX idx_media_assets_type ON public.media_assets(media_type);
CREATE INDEX idx_media_assets_search ON public.media_assets USING GIN(search_vector);
CREATE INDEX idx_media_assets_tags ON public.media_assets USING GIN(ai_tags);

CREATE INDEX idx_visual_extractions_media ON public.visual_extractions(media_asset_id);
CREATE INDEX idx_visual_extractions_project ON public.visual_extractions(project_id);
CREATE INDEX idx_visual_extractions_status ON public.visual_extractions(status);

CREATE INDEX idx_transcriptions_media ON public.media_transcriptions(media_asset_id);
CREATE INDEX idx_transcriptions_project ON public.media_transcriptions(project_id);
CREATE INDEX idx_transcriptions_status ON public.media_transcriptions(status);
CREATE INDEX idx_transcriptions_search ON public.media_transcriptions USING GIN(search_vector);

CREATE INDEX idx_chat_images_project ON public.chat_image_uploads(project_id);
CREATE INDEX idx_chat_images_thread ON public.chat_image_uploads(thread_id);

-- Triggers for updated_at
CREATE TRIGGER update_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_visual_extractions_updated_at
  BEFORE UPDATE ON public.visual_extractions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transcriptions_updated_at
  BEFORE UPDATE ON public.media_transcriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for media assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-assets', 'media-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for media-assets bucket
CREATE POLICY "Users can view media files" ON storage.objects
  FOR SELECT USING (bucket_id = 'media-assets');

CREATE POLICY "Authenticated users can upload media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their media files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'media-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their media files" ON storage.objects
  FOR DELETE USING (bucket_id = 'media-assets' AND auth.uid()::text = (storage.foldername(name))[1]);