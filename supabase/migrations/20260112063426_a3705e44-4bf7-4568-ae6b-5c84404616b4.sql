-- Task 5.1: Domain-Specific Fine-Tuning & Custom AI Instructions

-- Style Profiles for custom tone and formatting
CREATE TABLE public.style_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tone TEXT NOT NULL DEFAULT 'professional',
  formality_level INTEGER NOT NULL DEFAULT 5 CHECK (formality_level BETWEEN 1 AND 10),
  writing_style TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  example_document_ids UUID[] DEFAULT '{}',
  custom_instructions TEXT,
  is_active BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, name)
);

-- Project Glossaries for domain vocabulary
CREATE TABLE public.project_glossaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  auto_inject BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, name)
);

-- Glossary Terms with indexed search (using trigger instead of generated column)
CREATE TABLE public.glossary_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  glossary_id UUID NOT NULL REFERENCES public.project_glossaries(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  category TEXT,
  examples TEXT[],
  context_hints TEXT[],
  do_not_translate BOOLEAN DEFAULT false,
  search_vector tsvector,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(glossary_id, term)
);

-- Trigger function to update search_vector
CREATE OR REPLACE FUNCTION public.update_glossary_term_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.term, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.definition, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.aliases, ' '), '')), 'A');
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_glossary_terms_search_vector
  BEFORE INSERT OR UPDATE ON public.glossary_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_glossary_term_search_vector();

-- Indexes for fast term lookup
CREATE INDEX idx_glossary_terms_search ON public.glossary_terms USING GIN(search_vector);
CREATE INDEX idx_glossary_terms_term ON public.glossary_terms(lower(term));

-- AI Response Feedback (RLHF Lite)
CREATE TABLE public.ai_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message_id UUID,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative', 'neutral')),
  corrected_response TEXT,
  feedback_text TEXT,
  feedback_category TEXT,
  is_used_for_training BOOLEAN DEFAULT false,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_feedback_project ON public.ai_feedback(project_id);
CREATE INDEX idx_ai_feedback_rating ON public.ai_feedback(rating);

-- System Prompt Versions for instruction versioning
CREATE TABLE public.system_prompt_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  mode TEXT NOT NULL DEFAULT 'default',
  system_prompt TEXT NOT NULL,
  temperature NUMERIC(3,2) DEFAULT 0.7 CHECK (temperature BETWEEN 0 AND 2),
  max_tokens INTEGER DEFAULT 2048,
  include_glossary BOOLEAN DEFAULT true,
  include_style_profile BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT false,
  version_number INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID REFERENCES public.system_prompt_versions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, name, version_number)
);

-- Curated Q&A Pairs for fine-tuning datasets
CREATE TABLE public.curated_qa_pairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES public.training_datasets(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID,
  system_prompt TEXT,
  user_message TEXT NOT NULL,
  assistant_response TEXT NOT NULL,
  quality_score NUMERIC(3,2) CHECK (quality_score BETWEEN 0 AND 1),
  quality_flags TEXT[],
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  token_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_curated_qa_dataset ON public.curated_qa_pairs(dataset_id);
CREATE INDEX idx_curated_qa_approved ON public.curated_qa_pairs(is_approved);

-- Enable RLS on all tables
ALTER TABLE public.style_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_glossaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glossary_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curated_qa_pairs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for style_profiles
CREATE POLICY "Users can view style profiles in their projects"
  ON public.style_profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

CREATE POLICY "Users can manage style profiles in their projects"
  ON public.style_profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

-- RLS Policies for project_glossaries
CREATE POLICY "Users can view glossaries in their projects"
  ON public.project_glossaries FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

CREATE POLICY "Users can manage glossaries in their projects"
  ON public.project_glossaries FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

-- RLS Policies for glossary_terms
CREATE POLICY "Users can view terms in their project glossaries"
  ON public.glossary_terms FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.project_glossaries g
    JOIN public.projects p ON p.id = g.project_id
    WHERE g.id = glossary_id AND p.owner_id = auth.uid()
  ));

CREATE POLICY "Users can manage terms in their project glossaries"
  ON public.glossary_terms FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.project_glossaries g
    JOIN public.projects p ON p.id = g.project_id
    WHERE g.id = glossary_id AND p.owner_id = auth.uid()
  ));

-- RLS Policies for ai_feedback
CREATE POLICY "Users can view feedback in their projects"
  ON public.ai_feedback FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

CREATE POLICY "Users can submit feedback in their projects"
  ON public.ai_feedback FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

CREATE POLICY "Users can update their own feedback"
  ON public.ai_feedback FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for system_prompt_versions
CREATE POLICY "Users can view prompts in their projects"
  ON public.system_prompt_versions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

CREATE POLICY "Users can manage prompts in their projects"
  ON public.system_prompt_versions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

-- RLS Policies for curated_qa_pairs
CREATE POLICY "Users can view QA pairs in their project datasets"
  ON public.curated_qa_pairs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

CREATE POLICY "Users can manage QA pairs in their project datasets"
  ON public.curated_qa_pairs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_style_profiles_updated_at
  BEFORE UPDATE ON public.style_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_glossaries_updated_at
  BEFORE UPDATE ON public.project_glossaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_glossary_terms_updated_at
  BEFORE UPDATE ON public.glossary_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_prompt_versions_updated_at
  BEFORE UPDATE ON public.system_prompt_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_curated_qa_pairs_updated_at
  BEFORE UPDATE ON public.curated_qa_pairs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to find relevant glossary terms for a query
CREATE OR REPLACE FUNCTION public.find_relevant_glossary_terms(
  p_project_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  term TEXT,
  definition TEXT,
  aliases TEXT[],
  category TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT gt.term, gt.definition, gt.aliases, gt.category
  FROM public.glossary_terms gt
  JOIN public.project_glossaries pg ON pg.id = gt.glossary_id
  WHERE pg.project_id = p_project_id
    AND pg.is_active = true
    AND pg.auto_inject = true
    AND (
      gt.search_vector @@ plainto_tsquery('english', p_query)
      OR lower(p_query) LIKE '%' || lower(gt.term) || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(gt.aliases) alias 
        WHERE lower(p_query) LIKE '%' || lower(alias) || '%'
      )
    )
  ORDER BY ts_rank(gt.search_vector, plainto_tsquery('english', p_query)) DESC
  LIMIT p_limit;
END;
$$;

-- Comments
COMMENT ON TABLE public.style_profiles IS 'Custom AI writing style and tone profiles per project';
COMMENT ON TABLE public.project_glossaries IS 'Domain-specific vocabulary collections';
COMMENT ON TABLE public.glossary_terms IS 'Individual terms with definitions and aliases';
COMMENT ON TABLE public.ai_feedback IS 'User feedback on AI responses for RLHF';
COMMENT ON TABLE public.system_prompt_versions IS 'Versioned system prompts for different AI modes';
COMMENT ON TABLE public.curated_qa_pairs IS 'High-quality Q&A pairs for fine-tuning datasets';