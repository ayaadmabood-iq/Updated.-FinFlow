-- Create enum for content target formats
CREATE TYPE public.content_target_format AS ENUM (
  'presentation_outline',
  'linkedin_post',
  'twitter_thread',
  'executive_memo',
  'blog_post',
  'email_draft',
  'contract_draft',
  'report_summary',
  'meeting_notes',
  'press_release',
  'custom'
);

-- Create enum for content generation status
CREATE TYPE public.content_generation_status AS ENUM (
  'pending',
  'generating',
  'completed',
  'failed'
);

-- Create table for storing generated content and drafts
CREATE TABLE public.generated_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Source information
  source_document_ids UUID[] NOT NULL DEFAULT '{}',
  source_text TEXT,
  
  -- Generation details
  title TEXT NOT NULL,
  target_format content_target_format NOT NULL,
  custom_format_description TEXT,
  tone TEXT,
  language TEXT DEFAULT 'en',
  instructions TEXT,
  
  -- Generated output
  generated_content TEXT,
  structured_output JSONB,
  
  -- Status and metadata
  status content_generation_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  tokens_used INTEGER DEFAULT 0,
  generation_cost_usd NUMERIC(10, 6) DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create table for content versions (diff tracking)
CREATE TABLE public.content_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generated_content_id UUID NOT NULL REFERENCES public.generated_content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  version_number INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  structured_output JSONB,
  
  -- Diff information
  changes_summary TEXT,
  diff_from_previous JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(generated_content_id, version_number)
);

-- Create table for content templates (reusable generation templates)
CREATE TABLE public.content_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  target_format content_target_format NOT NULL,
  
  -- Template configuration
  system_prompt TEXT,
  output_structure JSONB,
  example_output TEXT,
  
  -- Metadata
  is_public BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for generated_content
CREATE POLICY "Users can view own generated content"
  ON public.generated_content FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view generated content via team membership"
  ON public.generated_content FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_shares ps
      JOIN public.team_members tm ON ps.team_id = tm.team_id
      WHERE ps.project_id = generated_content.project_id
        AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create generated content for their projects"
  ON public.generated_content FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create generated content via team membership"
  ON public.generated_content FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.project_shares ps
      JOIN public.team_members tm ON ps.team_id = tm.team_id
      WHERE ps.project_id = generated_content.project_id
        AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own generated content"
  ON public.generated_content FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own generated content"
  ON public.generated_content FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for content_versions
CREATE POLICY "Users can view content versions they own"
  ON public.content_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.generated_content gc
      WHERE gc.id = generated_content_id AND gc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create content versions for their content"
  ON public.content_versions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.generated_content gc
      WHERE gc.id = generated_content_id AND gc.user_id = auth.uid()
    )
  );

-- RLS Policies for content_templates
CREATE POLICY "Users can view own templates"
  ON public.content_templates FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create templates"
  ON public.content_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.content_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON public.content_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_generated_content_project ON public.generated_content(project_id);
CREATE INDEX idx_generated_content_user ON public.generated_content(user_id);
CREATE INDEX idx_generated_content_status ON public.generated_content(status);
CREATE INDEX idx_generated_content_format ON public.generated_content(target_format);
CREATE INDEX idx_content_versions_content ON public.content_versions(generated_content_id);
CREATE INDEX idx_content_templates_user ON public.content_templates(user_id);
CREATE INDEX idx_content_templates_public ON public.content_templates(is_public) WHERE is_public = true;

-- Trigger for updated_at
CREATE TRIGGER update_generated_content_updated_at
  BEFORE UPDATE ON public.generated_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_templates_updated_at
  BEFORE UPDATE ON public.content_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();