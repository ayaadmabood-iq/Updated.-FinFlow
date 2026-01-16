-- Create report template categories enum
CREATE TYPE public.report_category AS ENUM (
  'technical-audit',
  'financial-summary',
  'legal-comparison',
  'research-synthesis',
  'contract-analysis',
  'compliance-review',
  'custom'
);

-- Create report status enum
CREATE TYPE public.report_status AS ENUM (
  'pending',
  'generating',
  'ready',
  'failed'
);

-- Create report_templates table
CREATE TABLE public.report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  category report_category NOT NULL DEFAULT 'custom',
  icon TEXT DEFAULT 'FileText',
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT true,
  owner_id UUID REFERENCES auth.users(id),
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- sections structure: [{ "id": "uuid", "title": "string", "title_ar": "string", "prompt": "string", "order": number }]
  settings JSONB DEFAULT '{}'::jsonb,
  -- settings: { "language": "auto|en|ar", "tone": "formal|casual", "includeCharts": boolean }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create generated_reports table
CREATE TABLE public.generated_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.report_templates(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  status report_status NOT NULL DEFAULT 'pending',
  source_document_ids TEXT[] NOT NULL DEFAULT '{}',
  language TEXT DEFAULT 'auto',
  
  -- Generated content
  content_markdown TEXT,
  sections_data JSONB DEFAULT '[]'::jsonb,
  -- sections_data: [{ "section_id": "uuid", "title": "string", "content": "string", "sources": [{ "document_id": "uuid", "chunk_ids": ["uuid"] }] }]
  
  -- Metadata
  total_tokens_used INTEGER DEFAULT 0,
  generation_cost_usd NUMERIC(10, 6) DEFAULT 0,
  generation_time_ms INTEGER,
  error_message TEXT,
  
  -- Export info
  exported_formats TEXT[] DEFAULT '{}',
  last_exported_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create data_extractions table for structured data extraction
CREATE TABLE public.data_extractions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  status report_status NOT NULL DEFAULT 'pending',
  source_document_ids TEXT[] NOT NULL DEFAULT '{}',
  
  -- Extraction configuration
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- fields: [{ "name": "string", "type": "string|number|date|currency", "description": "string" }]
  
  -- Extracted data
  extracted_data JSONB DEFAULT '[]'::jsonb,
  -- extracted_data: [{ "document_id": "uuid", "document_name": "string", "values": { "field_name": "value" } }]
  
  total_tokens_used INTEGER DEFAULT 0,
  extraction_cost_usd NUMERIC(10, 6) DEFAULT 0,
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_extractions ENABLE ROW LEVEL SECURITY;

-- RLS policies for report_templates
CREATE POLICY "Users can view public templates"
  ON public.report_templates FOR SELECT
  USING (is_public = true OR owner_id = auth.uid());

CREATE POLICY "Users can create their own templates"
  ON public.report_templates FOR INSERT
  WITH CHECK (auth.uid() = owner_id AND is_system = false);

CREATE POLICY "Users can update their own templates"
  ON public.report_templates FOR UPDATE
  USING (auth.uid() = owner_id AND is_system = false);

CREATE POLICY "Users can delete their own templates"
  ON public.report_templates FOR DELETE
  USING (auth.uid() = owner_id AND is_system = false);

-- RLS policies for generated_reports
CREATE POLICY "Users can view their own reports"
  ON public.generated_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create reports for their projects"
  ON public.generated_reports FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own reports"
  ON public.generated_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
  ON public.generated_reports FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for data_extractions
CREATE POLICY "Users can view their own extractions"
  ON public.data_extractions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create extractions for their projects"
  ON public.data_extractions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own extractions"
  ON public.data_extractions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own extractions"
  ON public.data_extractions FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_report_templates_category ON public.report_templates(category);
CREATE INDEX idx_report_templates_is_public ON public.report_templates(is_public);
CREATE INDEX idx_generated_reports_project_id ON public.generated_reports(project_id);
CREATE INDEX idx_generated_reports_user_id ON public.generated_reports(user_id);
CREATE INDEX idx_generated_reports_status ON public.generated_reports(status);
CREATE INDEX idx_data_extractions_project_id ON public.data_extractions(project_id);
CREATE INDEX idx_data_extractions_user_id ON public.data_extractions(user_id);

-- Insert system templates
INSERT INTO public.report_templates (name, name_ar, description, description_ar, category, icon, is_system, is_public, sections, settings) VALUES
(
  'Technical Audit Report',
  'تقرير التدقيق الفني',
  'Comprehensive technical analysis and audit of systems, code, or infrastructure',
  'تحليل تقني شامل وتدقيق للأنظمة أو الكود أو البنية التحتية',
  'technical-audit',
  'Shield',
  true,
  true,
  '[
    {"id": "exec-summary", "title": "Executive Summary", "title_ar": "الملخص التنفيذي", "prompt": "Provide a brief executive summary of the key findings from all documents. Focus on the most critical issues and recommendations.", "order": 1},
    {"id": "findings", "title": "Key Findings", "title_ar": "النتائج الرئيسية", "prompt": "List and analyze all significant findings from the documents. Categorize by severity (Critical, High, Medium, Low).", "order": 2},
    {"id": "risks", "title": "Risk Assessment", "title_ar": "تقييم المخاطر", "prompt": "Identify and assess potential risks mentioned or implied in the documents. Provide a risk matrix if applicable.", "order": 3},
    {"id": "recommendations", "title": "Recommendations", "title_ar": "التوصيات", "prompt": "Provide actionable recommendations based on the findings. Prioritize by impact and effort.", "order": 4},
    {"id": "conclusion", "title": "Conclusion", "title_ar": "الخلاصة", "prompt": "Summarize the overall audit results and next steps.", "order": 5}
  ]'::jsonb,
  '{"tone": "formal", "includeCharts": true}'::jsonb
),
(
  'Financial Summary',
  'الملخص المالي',
  'Synthesize financial data and metrics from multiple documents into a cohesive report',
  'تجميع البيانات والمقاييس المالية من عدة مستندات في تقرير متماسك',
  'financial-summary',
  'DollarSign',
  true,
  true,
  '[
    {"id": "overview", "title": "Financial Overview", "title_ar": "نظرة مالية عامة", "prompt": "Provide a high-level overview of the financial situation based on all documents.", "order": 1},
    {"id": "metrics", "title": "Key Metrics", "title_ar": "المقاييس الرئيسية", "prompt": "Extract and summarize key financial metrics, KPIs, and figures from the documents.", "order": 2},
    {"id": "trends", "title": "Trends & Analysis", "title_ar": "الاتجاهات والتحليل", "prompt": "Analyze trends, patterns, and significant changes in the financial data.", "order": 3},
    {"id": "outlook", "title": "Financial Outlook", "title_ar": "التوقعات المالية", "prompt": "Based on the data, provide insights on the financial outlook and projections.", "order": 4}
  ]'::jsonb,
  '{"tone": "formal", "includeCharts": true}'::jsonb
),
(
  'Legal Comparison',
  'المقارنة القانونية',
  'Compare and contrast legal documents, contracts, or agreements',
  'مقارنة وتحليل المستندات القانونية أو العقود أو الاتفاقيات',
  'legal-comparison',
  'Scale',
  true,
  true,
  '[
    {"id": "summary", "title": "Comparison Summary", "title_ar": "ملخص المقارنة", "prompt": "Provide an overview comparing the key aspects of all documents.", "order": 1},
    {"id": "terms", "title": "Key Terms Comparison", "title_ar": "مقارنة الشروط الرئيسية", "prompt": "Compare and contrast the key terms, obligations, and conditions across documents.", "order": 2},
    {"id": "differences", "title": "Notable Differences", "title_ar": "الاختلافات الملحوظة", "prompt": "Highlight significant differences between the documents that could affect decisions.", "order": 3},
    {"id": "risks", "title": "Legal Risks", "title_ar": "المخاطر القانونية", "prompt": "Identify potential legal risks or concerns in the documents.", "order": 4},
    {"id": "recommendation", "title": "Recommendation", "title_ar": "التوصية", "prompt": "Based on the comparison, provide a recommendation or suggested course of action.", "order": 5}
  ]'::jsonb,
  '{"tone": "formal", "includeCharts": false}'::jsonb
),
(
  'Research Synthesis',
  'تجميع البحث',
  'Combine insights from multiple research documents or papers',
  'دمج الرؤى من عدة وثائق أو أوراق بحثية',
  'research-synthesis',
  'BookOpen',
  true,
  true,
  '[
    {"id": "abstract", "title": "Abstract", "title_ar": "الملخص", "prompt": "Write a comprehensive abstract synthesizing the main themes and findings from all documents.", "order": 1},
    {"id": "methodology", "title": "Methodology Overview", "title_ar": "نظرة على المنهجية", "prompt": "Summarize the methodologies used across the research documents.", "order": 2},
    {"id": "findings", "title": "Synthesized Findings", "title_ar": "النتائج المجمعة", "prompt": "Synthesize the key findings, identifying common themes and conflicting results.", "order": 3},
    {"id": "gaps", "title": "Research Gaps", "title_ar": "الفجوات البحثية", "prompt": "Identify gaps in the research and areas for further study.", "order": 4},
    {"id": "conclusion", "title": "Conclusion", "title_ar": "الخلاصة", "prompt": "Provide a comprehensive conclusion based on the synthesized research.", "order": 5}
  ]'::jsonb,
  '{"tone": "formal", "includeCharts": true}'::jsonb
),
(
  'Contract Analysis',
  'تحليل العقد',
  'Deep analysis of contract terms, obligations, and conditions',
  'تحليل معمق لشروط العقد والالتزامات والأحكام',
  'contract-analysis',
  'FileText',
  true,
  true,
  '[
    {"id": "overview", "title": "Contract Overview", "title_ar": "نظرة عامة على العقد", "prompt": "Provide an overview of the contract including parties, purpose, and effective dates.", "order": 1},
    {"id": "obligations", "title": "Key Obligations", "title_ar": "الالتزامات الرئيسية", "prompt": "List and explain the key obligations for each party.", "order": 2},
    {"id": "financial", "title": "Financial Terms", "title_ar": "الشروط المالية", "prompt": "Detail all financial terms including payment schedules, penalties, and incentives.", "order": 3},
    {"id": "termination", "title": "Termination & Renewal", "title_ar": "الإنهاء والتجديد", "prompt": "Explain termination conditions, notice periods, and renewal terms.", "order": 4},
    {"id": "risks", "title": "Risk Analysis", "title_ar": "تحليل المخاطر", "prompt": "Identify potential risks and areas of concern in the contract.", "order": 5}
  ]'::jsonb,
  '{"tone": "formal", "includeCharts": false}'::jsonb
),
(
  'Compliance Review',
  'مراجعة الامتثال',
  'Review documents against compliance requirements and standards',
  'مراجعة المستندات مقابل متطلبات ومعايير الامتثال',
  'compliance-review',
  'CheckCircle',
  true,
  true,
  '[
    {"id": "scope", "title": "Review Scope", "title_ar": "نطاق المراجعة", "prompt": "Define the scope of the compliance review and applicable standards.", "order": 1},
    {"id": "checklist", "title": "Compliance Checklist", "title_ar": "قائمة التحقق من الامتثال", "prompt": "Create a compliance checklist based on the documents and identify status of each item.", "order": 2},
    {"id": "gaps", "title": "Compliance Gaps", "title_ar": "فجوات الامتثال", "prompt": "Identify areas where documents or processes do not meet compliance requirements.", "order": 3},
    {"id": "remediation", "title": "Remediation Plan", "title_ar": "خطة المعالجة", "prompt": "Suggest remediation steps for identified compliance gaps.", "order": 4},
    {"id": "conclusion", "title": "Compliance Status", "title_ar": "حالة الامتثال", "prompt": "Provide an overall compliance status and summary.", "order": 5}
  ]'::jsonb,
  '{"tone": "formal", "includeCharts": true}'::jsonb
);

-- Create trigger for updated_at
CREATE TRIGGER update_report_templates_updated_at
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_generated_reports_updated_at
  BEFORE UPDATE ON public.generated_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_extractions_updated_at
  BEFORE UPDATE ON public.data_extractions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();