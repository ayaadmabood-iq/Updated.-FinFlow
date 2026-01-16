-- Table for storing detected trends across documents
CREATE TABLE public.document_trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  trend_type TEXT NOT NULL CHECK (trend_type IN ('theme', 'risk', 'pattern', 'metric')),
  title TEXT NOT NULL,
  description TEXT,
  confidence_score NUMERIC(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  data_points JSONB DEFAULT '[]'::jsonb,
  time_series_data JSONB DEFAULT '[]'::jsonb,
  affected_document_ids UUID[] DEFAULT '{}',
  first_detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for document risk/opportunity scores
CREATE TABLE public.document_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  opportunity_score INTEGER CHECK (opportunity_score >= 0 AND opportunity_score <= 100),
  risk_factors JSONB DEFAULT '[]'::jsonb,
  opportunity_factors JSONB DEFAULT '[]'::jsonb,
  flagged_clauses JSONB DEFAULT '[]'::jsonb,
  compliance_issues JSONB DEFAULT '[]'::jsonb,
  key_dates JSONB DEFAULT '[]'::jsonb,
  ai_summary TEXT,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id)
);

-- Table for executive briefings
CREATE TABLE public.executive_briefings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
  content_markdown TEXT,
  content_pdf_url TEXT,
  summary_stats JSONB DEFAULT '{}'::jsonb,
  new_documents_summary TEXT,
  key_decisions TEXT,
  upcoming_deadlines JSONB DEFAULT '[]'::jsonb,
  whats_next TEXT,
  highlights JSONB DEFAULT '[]'::jsonb,
  tokens_used INTEGER DEFAULT 0,
  generation_cost_usd NUMERIC(10,6) DEFAULT 0,
  error_message TEXT,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for detected anomalies (Red Flags)
CREATE TABLE public.document_anomalies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  source_document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  conflicting_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('contradiction', 'missing_data', 'inconsistency', 'compliance_gap', 'duplicate', 'outlier')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  field_name TEXT,
  source_value TEXT,
  conflicting_value TEXT,
  confidence_score NUMERIC(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for natural language query history
CREATE TABLE public.analytics_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  natural_query TEXT NOT NULL,
  parsed_intent JSONB,
  generated_sql TEXT,
  result_type TEXT CHECK (result_type IN ('chart', 'table', 'metric', 'list')),
  result_data JSONB,
  visualization_config JSONB,
  execution_time_ms INTEGER,
  tokens_used INTEGER DEFAULT 0,
  is_successful BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.document_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_queries ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_trends
CREATE POLICY "Users can view their own trends" ON public.document_trends
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create trends" ON public.document_trends
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trends" ON public.document_trends
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trends" ON public.document_trends
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for document_scores
CREATE POLICY "Users can view their own scores" ON public.document_scores
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create scores" ON public.document_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own scores" ON public.document_scores
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scores" ON public.document_scores
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for executive_briefings
CREATE POLICY "Users can view their own briefings" ON public.executive_briefings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create briefings" ON public.executive_briefings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own briefings" ON public.executive_briefings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own briefings" ON public.executive_briefings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for document_anomalies
CREATE POLICY "Users can view their own anomalies" ON public.document_anomalies
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create anomalies" ON public.document_anomalies
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own anomalies" ON public.document_anomalies
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own anomalies" ON public.document_anomalies
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for analytics_queries
CREATE POLICY "Users can view their own queries" ON public.analytics_queries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create queries" ON public.analytics_queries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_document_trends_project ON public.document_trends(project_id);
CREATE INDEX idx_document_trends_type ON public.document_trends(trend_type);
CREATE INDEX idx_document_trends_active ON public.document_trends(is_active) WHERE is_active = true;

CREATE INDEX idx_document_scores_project ON public.document_scores(project_id);
CREATE INDEX idx_document_scores_document ON public.document_scores(document_id);
CREATE INDEX idx_document_scores_risk ON public.document_scores(risk_score DESC);
CREATE INDEX idx_document_scores_opportunity ON public.document_scores(opportunity_score DESC);

CREATE INDEX idx_executive_briefings_project ON public.executive_briefings(project_id);
CREATE INDEX idx_executive_briefings_status ON public.executive_briefings(status);
CREATE INDEX idx_executive_briefings_period ON public.executive_briefings(period_start, period_end);

CREATE INDEX idx_document_anomalies_project ON public.document_anomalies(project_id);
CREATE INDEX idx_document_anomalies_severity ON public.document_anomalies(severity);
CREATE INDEX idx_document_anomalies_unresolved ON public.document_anomalies(is_resolved) WHERE is_resolved = false;
CREATE INDEX idx_document_anomalies_source ON public.document_anomalies(source_document_id);

CREATE INDEX idx_analytics_queries_project ON public.analytics_queries(project_id);
CREATE INDEX idx_analytics_queries_user ON public.analytics_queries(user_id);

-- Function to get project analytics summary
CREATE OR REPLACE FUNCTION public.get_project_analytics_summary(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_documents', (SELECT COUNT(*) FROM documents WHERE project_id = p_project_id AND deleted_at IS NULL),
    'scored_documents', (SELECT COUNT(*) FROM document_scores WHERE project_id = p_project_id),
    'high_risk_count', (SELECT COUNT(*) FROM document_scores WHERE project_id = p_project_id AND risk_score >= 70),
    'high_opportunity_count', (SELECT COUNT(*) FROM document_scores WHERE project_id = p_project_id AND opportunity_score >= 70),
    'active_trends', (SELECT COUNT(*) FROM document_trends WHERE project_id = p_project_id AND is_active = true),
    'unresolved_anomalies', (SELECT COUNT(*) FROM document_anomalies WHERE project_id = p_project_id AND is_resolved = false),
    'critical_anomalies', (SELECT COUNT(*) FROM document_anomalies WHERE project_id = p_project_id AND is_resolved = false AND severity = 'critical'),
    'avg_risk_score', (SELECT ROUND(AVG(risk_score)::numeric, 1) FROM document_scores WHERE project_id = p_project_id),
    'avg_opportunity_score', (SELECT ROUND(AVG(opportunity_score)::numeric, 1) FROM document_scores WHERE project_id = p_project_id)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Trigger to update timestamps
CREATE TRIGGER update_document_scores_updated_at
  BEFORE UPDATE ON public.document_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_executive_briefings_updated_at
  BEFORE UPDATE ON public.executive_briefings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_anomalies_updated_at
  BEFORE UPDATE ON public.document_anomalies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_trends_updated_at
  BEFORE UPDATE ON public.document_trends
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();