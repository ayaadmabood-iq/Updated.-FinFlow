-- Create enum for supported Arabic dialects
CREATE TYPE arabic_dialect AS ENUM (
  'msa',       -- Modern Standard Arabic
  'gulf',      -- Gulf Arabic (Khaleeji)
  'levantine', -- Levantine (Syrian, Lebanese, Palestinian, Jordanian)
  'egyptian',  -- Egyptian Arabic
  'maghrebi',  -- North African (Moroccan, Algerian, Tunisian, Libyan)
  'iraqi',     -- Iraqi Arabic
  'yemeni'     -- Yemeni Arabic
);

-- Create enum for supported jurisdictions
CREATE TYPE jurisdiction_region AS ENUM (
  'sau',  -- Saudi Arabia
  'uae',  -- United Arab Emirates
  'egy',  -- Egypt
  'jor',  -- Jordan
  'kwt',  -- Kuwait
  'bhr',  -- Bahrain
  'omn',  -- Oman
  'qat',  -- Qatar
  'lbn',  -- Lebanon
  'mar',  -- Morocco
  'dza',  -- Algeria
  'tun',  -- Tunisia
  'irq',  -- Iraq
  'yen',  -- Yemen
  'global' -- No specific jurisdiction
);

-- Project jurisdiction settings
CREATE TABLE public.project_localization (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Jurisdiction settings
  primary_jurisdiction jurisdiction_region DEFAULT 'global',
  secondary_jurisdictions jurisdiction_region[] DEFAULT '{}',
  
  -- Dialect preferences
  input_dialect_detection BOOLEAN DEFAULT true,
  preferred_output_dialect arabic_dialect DEFAULT 'msa',
  auto_translate_to_msa BOOLEAN DEFAULT false,
  
  -- Cultural settings
  professional_tone TEXT DEFAULT 'formal', -- formal, semi-formal, informal
  use_local_greetings BOOLEAN DEFAULT true,
  use_hijri_dates BOOLEAN DEFAULT false,
  currency_format TEXT DEFAULT 'SAR',
  
  -- Cross-language settings
  enable_cross_language_search BOOLEAN DEFAULT true,
  auto_translate_queries BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_project_localization UNIQUE (project_id)
);

-- Dialect mappings and terminology
CREATE TABLE public.dialect_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  dialect arabic_dialect NOT NULL,
  dialect_term TEXT NOT NULL,
  msa_equivalent TEXT NOT NULL,
  english_translation TEXT,
  context TEXT, -- legal, technical, general, etc.
  usage_notes TEXT,
  is_verified BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Legal/regulatory term mappings by jurisdiction
CREATE TABLE public.jurisdiction_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jurisdiction jurisdiction_region NOT NULL,
  term_key TEXT NOT NULL, -- e.g., 'vat', 'sadad', 'cr_number'
  local_term_ar TEXT NOT NULL,
  local_term_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  legal_reference TEXT, -- Link to law/regulation
  effective_date DATE,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_jurisdiction_term UNIQUE (jurisdiction, term_key)
);

-- Cross-language query cache for performance
CREATE TABLE public.cross_language_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  source_query TEXT NOT NULL,
  source_language TEXT NOT NULL, -- 'ar', 'en', etc.
  translated_query TEXT NOT NULL,
  target_language TEXT NOT NULL,
  query_embedding vector(1536),
  
  result_count INTEGER DEFAULT 0,
  avg_relevance_score REAL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  use_count INTEGER DEFAULT 1
);

-- Document dialect analysis results
CREATE TABLE public.document_dialect_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  detected_dialects JSONB DEFAULT '[]', -- [{dialect: 'egyptian', confidence: 0.85, sample: '...'}]
  primary_dialect arabic_dialect,
  dialect_confidence REAL,
  
  has_mixed_dialects BOOLEAN DEFAULT false,
  dialect_regions JSONB DEFAULT '[]', -- regions within document
  
  msa_conversion_available BOOLEAN DEFAULT false,
  msa_converted_text TEXT,
  
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_document_dialect UNIQUE (document_id)
);

-- Cultural tone templates
CREATE TABLE public.cultural_tone_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  jurisdiction jurisdiction_region,
  tone_type TEXT NOT NULL, -- 'greeting', 'closing', 'formal_address', 'email_opening', etc.
  template_ar TEXT NOT NULL,
  template_en TEXT,
  usage_context TEXT, -- 'email', 'report', 'meeting_notes', etc.
  formality_level TEXT DEFAULT 'formal', -- formal, semi-formal, informal
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_localization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dialect_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurisdiction_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_language_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_dialect_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cultural_tone_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_localization
CREATE POLICY "Users can view their project localization"
  ON public.project_localization FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their project localization"
  ON public.project_localization FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their project localization"
  ON public.project_localization FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their project localization"
  ON public.project_localization FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for dialect_mappings
CREATE POLICY "Users can view dialect mappings"
  ON public.dialect_mappings FOR SELECT
  USING (auth.uid() = user_id OR project_id IS NULL);

CREATE POLICY "Users can insert dialect mappings"
  ON public.dialect_mappings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their dialect mappings"
  ON public.dialect_mappings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their dialect mappings"
  ON public.dialect_mappings FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for jurisdiction_terms (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view jurisdiction terms"
  ON public.jurisdiction_terms FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for cross_language_queries
CREATE POLICY "Users can view their cross-language queries"
  ON public.cross_language_queries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert cross-language queries"
  ON public.cross_language_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their cross-language queries"
  ON public.cross_language_queries FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for document_dialect_analysis
CREATE POLICY "Users can view their document dialect analysis"
  ON public.document_dialect_analysis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert document dialect analysis"
  ON public.document_dialect_analysis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their document dialect analysis"
  ON public.document_dialect_analysis FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for cultural_tone_templates (read-only for all)
CREATE POLICY "Authenticated users can view tone templates"
  ON public.cultural_tone_templates FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX idx_project_localization_project ON public.project_localization(project_id);
CREATE INDEX idx_dialect_mappings_project ON public.dialect_mappings(project_id);
CREATE INDEX idx_dialect_mappings_dialect ON public.dialect_mappings(dialect);
CREATE INDEX idx_jurisdiction_terms_jurisdiction ON public.jurisdiction_terms(jurisdiction);
CREATE INDEX idx_cross_language_queries_project ON public.cross_language_queries(project_id);
CREATE INDEX idx_cross_language_queries_source ON public.cross_language_queries(source_language, source_query);
CREATE INDEX idx_document_dialect_analysis_document ON public.document_dialect_analysis(document_id);
CREATE INDEX idx_document_dialect_analysis_dialect ON public.document_dialect_analysis(primary_dialect);
CREATE INDEX idx_cultural_tone_templates_jurisdiction ON public.cultural_tone_templates(jurisdiction);

-- Add triggers for updated_at
CREATE TRIGGER update_project_localization_updated_at
  BEFORE UPDATE ON public.project_localization
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dialect_mappings_updated_at
  BEFORE UPDATE ON public.dialect_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default jurisdiction terms
INSERT INTO public.jurisdiction_terms (jurisdiction, term_key, local_term_ar, local_term_en, description_ar, description_en) VALUES
  ('sau', 'sadad', 'سداد', 'SADAD', 'نظام المدفوعات الإلكتروني في المملكة العربية السعودية', 'Electronic bill payment system in Saudi Arabia'),
  ('sau', 'vat', 'ضريبة القيمة المضافة', 'VAT', 'ضريبة القيمة المضافة بنسبة 15%', 'Value Added Tax at 15%'),
  ('sau', 'cr_number', 'السجل التجاري', 'Commercial Registration', 'رقم السجل التجاري للشركات', 'Company commercial registration number'),
  ('sau', 'zakat', 'الزكاة', 'Zakat', 'الزكاة الشرعية على الشركات', 'Islamic tax on businesses'),
  ('uae', 'vat', 'ضريبة القيمة المضافة', 'VAT', 'ضريبة القيمة المضافة بنسبة 5%', 'Value Added Tax at 5%'),
  ('uae', 'trade_license', 'الرخصة التجارية', 'Trade License', 'رخصة مزاولة النشاط التجاري', 'License to conduct business activity'),
  ('egy', 'tax_id', 'الرقم الضريبي', 'Tax ID', 'رقم التسجيل الضريبي', 'Tax registration number'),
  ('egy', 'social_insurance', 'التأمينات الاجتماعية', 'Social Insurance', 'نظام التأمين الاجتماعي للموظفين', 'Employee social insurance system');

-- Insert default cultural tone templates
INSERT INTO public.cultural_tone_templates (name, jurisdiction, tone_type, template_ar, template_en, usage_context, formality_level, is_default) VALUES
  ('Gulf Formal Greeting', 'sau', 'greeting', 'السلام عليكم ورحمة الله وبركاته،\n\nأتمنى أن تصلكم رسالتي وأنتم بخير وصحة.', 'Peace be upon you,\n\nI hope this message finds you in good health.', 'email', 'formal', true),
  ('Gulf Semi-Formal Greeting', 'sau', 'greeting', 'السلام عليكم،\n\nتحية طيبة وبعد،', 'Greetings,', 'email', 'semi-formal', false),
  ('Gulf Formal Closing', 'sau', 'closing', 'وتفضلوا بقبول فائق الاحترام والتقدير،', 'With highest regards and appreciation,', 'email', 'formal', true),
  ('Egyptian Formal Greeting', 'egy', 'greeting', 'السلام عليكم،\n\nتحية طيبة،', 'Peace be upon you,\n\nBest regards,', 'email', 'formal', true),
  ('Levantine Formal Greeting', 'lbn', 'greeting', 'حضرة السيد/السيدة المحترم/ة،\n\nتحية وبعد،', 'Dear Sir/Madam,', 'email', 'formal', true),
  ('Report Header', NULL, 'report_header', 'بسم الله الرحمن الرحيم', 'In the name of God, the Most Gracious, the Most Merciful', 'report', 'formal', true);

-- Function to detect dialect from text
CREATE OR REPLACE FUNCTION detect_dialect_indicators(input_text TEXT)
RETURNS TABLE (
  dialect TEXT,
  indicator_count INTEGER,
  sample_matches TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This is a simplified detection based on common dialect markers
  -- Real implementation would use ML model via edge function
  RETURN QUERY
  SELECT 
    d.dialect_name,
    COUNT(*)::INTEGER as matches,
    ARRAY_AGG(DISTINCT d.marker)::TEXT[] as samples
  FROM (
    VALUES 
      ('egyptian', 'ده'),
      ('egyptian', 'دي'),
      ('egyptian', 'كده'),
      ('egyptian', 'ليه'),
      ('gulf', 'هالشي'),
      ('gulf', 'وايد'),
      ('gulf', 'زين'),
      ('levantine', 'هيك'),
      ('levantine', 'شو'),
      ('levantine', 'كتير'),
      ('maghrebi', 'واش'),
      ('maghrebi', 'بزاف'),
      ('maghrebi', 'كيفاش')
  ) AS d(dialect_name, marker)
  WHERE input_text ILIKE '%' || d.marker || '%'
  GROUP BY d.dialect_name
  ORDER BY matches DESC;
END;
$$;