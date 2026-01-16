import { supabase } from '@/integrations/supabase/client';

// Re-export for backward compatibility
export type TimeSeriesDataPoint = {
  timestamp: string;
  value: number;
  label?: string;
  metadata?: Record<string, unknown>;
};

export type TrendDataPoint = {
  date: string;
  count: number;
  metric?: number;
  category?: string;
};

export interface DocumentTrend {
  id: string;
  project_id: string;
  user_id: string;
  trend_type: 'theme' | 'risk' | 'pattern' | 'metric';
  title: string;
  description: string | null;
  confidence_score: number | null;
  data_points: TrendDataPoint[];
  time_series_data: TimeSeriesDataPoint[];
  affected_document_ids: string[];
  first_detected_at: string;
  last_updated_at: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DocumentScore {
  id: string;
  document_id: string;
  project_id: string;
  user_id: string;
  risk_score: number | null;
  opportunity_score: number | null;
  risk_factors: RiskFactor[];
  opportunity_factors: OpportunityFactor[];
  flagged_clauses: FlaggedClause[];
  compliance_issues: ComplianceIssue[];
  key_dates: KeyDate[];
  ai_summary: string | null;
  scored_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RiskFactor {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score_impact: number;
}

export interface OpportunityFactor {
  name: string;
  description: string;
  value: 'low' | 'medium' | 'high';
  score_impact: number;
}

export interface FlaggedClause {
  text: string;
  type: 'risk' | 'opportunity';
  reason: string;
  location: string;
}

export interface ComplianceIssue {
  requirement: string;
  status: 'compliant' | 'non-compliant' | 'partial' | 'unknown';
  details: string;
}

export interface KeyDate {
  date: string;
  type: 'deadline' | 'renewal' | 'expiry' | 'milestone';
  description: string;
  is_past_due: boolean;
}

export interface ExecutiveBriefing {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  period_start: string;
  period_end: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  content_markdown: string | null;
  content_pdf_url: string | null;
  summary_stats: Record<string, any>;
  new_documents_summary: string | null;
  key_decisions: string | null;
  upcoming_deadlines: KeyDate[];
  whats_next: string | null;
  highlights: Highlight[];
  tokens_used: number;
  generation_cost_usd: number;
  error_message: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Highlight {
  type: 'info' | 'warning' | 'success' | 'alert';
  title: string;
  description: string;
}

export interface DocumentAnomaly {
  id: string;
  project_id: string;
  user_id: string;
  source_document_id: string;
  conflicting_document_id: string | null;
  anomaly_type: 'contradiction' | 'missing_data' | 'inconsistency' | 'compliance_gap' | 'duplicate' | 'outlier';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  field_name: string | null;
  source_value: string | null;
  conflicting_value: string | null;
  confidence_score: number | null;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  detected_at: string;
  created_at: string;
  updated_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnalyticsResultData = any[] | { value?: number; label?: string } | Record<string, unknown> | null;

export interface VisualizationConfig {
  chartType?: 'bar' | 'line' | 'pie';
  xAxis?: string;
  yAxis?: string;
  columns?: string[];
  label?: string;
  [key: string]: unknown;
}

export interface ParsedQueryIntent {
  queryType?: string;
  entities?: string[];
  timeRange?: { start: string; end: string };
  filters?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AnalyticsQuery {
  id: string;
  project_id: string;
  user_id: string;
  natural_query: string;
  parsed_intent: ParsedQueryIntent | null;
  generated_sql: string | null;
  result_type: 'chart' | 'table' | 'metric' | 'list' | null;
  result_data: AnalyticsResultData;
  visualization_config: VisualizationConfig | null;
  execution_time_ms: number | null;
  tokens_used: number;
  is_successful: boolean;
  error_message: string | null;
  created_at: string;
}

export interface AnalyticsSummary {
  total_documents: number;
  scored_documents: number;
  high_risk_count: number;
  high_opportunity_count: number;
  active_trends: number;
  unresolved_anomalies: number;
  critical_anomalies: number;
  avg_risk_score: number | null;
  avg_opportunity_score: number | null;
}

class AnalyticsService {
  // Document Trends
  async getTrends(projectId: string): Promise<DocumentTrend[]> {
    const { data, error } = await supabase
      .from('document_trends')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('last_updated_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as DocumentTrend[];
  }

  async detectTrends(projectId: string): Promise<DocumentTrend[]> {
    const { data, error } = await supabase.functions.invoke('detect-trends', {
      body: { projectId },
    });

    if (error) throw new Error(error.message);
    return data.trends;
  }

  // Document Scores
  async getDocumentScores(projectId: string): Promise<DocumentScore[]> {
    const { data, error } = await supabase
      .from('document_scores')
      .select('*')
      .eq('project_id', projectId)
      .order('risk_score', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as unknown as DocumentScore[];
  }

  async getDocumentScore(documentId: string): Promise<DocumentScore | null> {
    const { data, error } = await supabase
      .from('document_scores')
      .select('*')
      .eq('document_id', documentId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data as unknown as DocumentScore | null;
  }

  async scoreDocument(documentId: string): Promise<DocumentScore> {
    const { data, error } = await supabase.functions.invoke('score-document', {
      body: { documentId },
    });

    if (error) throw new Error(error.message);
    return data.score;
  }

  async scoreAllDocuments(projectId: string): Promise<{ scored: number; failed: number }> {
    const { data, error } = await supabase.functions.invoke('score-all-documents', {
      body: { projectId },
    });

    if (error) throw new Error(error.message);
    return data;
  }

  // Executive Briefings
  async getBriefings(projectId: string): Promise<ExecutiveBriefing[]> {
    const { data, error } = await supabase
      .from('executive_briefings')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as unknown as ExecutiveBriefing[];
  }

  async getBriefing(briefingId: string): Promise<ExecutiveBriefing | null> {
    const { data, error } = await supabase
      .from('executive_briefings')
      .select('*')
      .eq('id', briefingId)
      .single();

    if (error) throw new Error(error.message);
    return data as unknown as ExecutiveBriefing;
  }

  async generateBriefing(
    projectId: string,
    periodStart: Date,
    periodEnd: Date,
    title?: string
  ): Promise<ExecutiveBriefing> {
    const { data, error } = await supabase.functions.invoke('generate-briefing', {
      body: {
        projectId,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        title,
      },
    });

    if (error) throw new Error(error.message);
    return data.briefing;
  }

  async deleteBriefing(briefingId: string): Promise<void> {
    const { error } = await supabase
      .from('executive_briefings')
      .delete()
      .eq('id', briefingId);

    if (error) throw new Error(error.message);
  }

  // Document Anomalies
  async getAnomalies(projectId: string, includeResolved = false): Promise<DocumentAnomaly[]> {
    let query = supabase
      .from('document_anomalies')
      .select('*')
      .eq('project_id', projectId)
      .order('severity', { ascending: false })
      .order('detected_at', { ascending: false });

    if (!includeResolved) {
      query = query.eq('is_resolved', false);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as DocumentAnomaly[];
  }

  async detectAnomalies(projectId: string): Promise<DocumentAnomaly[]> {
    const { data, error } = await supabase.functions.invoke('detect-anomalies', {
      body: { projectId },
    });

    if (error) throw new Error(error.message);
    return data.anomalies;
  }

  async resolveAnomaly(
    anomalyId: string,
    resolutionNotes: string
  ): Promise<void> {
    const { error } = await supabase
      .from('document_anomalies')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolution_notes: resolutionNotes,
      })
      .eq('id', anomalyId);

    if (error) throw new Error(error.message);
  }

  // Natural Language Queries
  async executeQuery(
    projectId: string,
    naturalQuery: string
  ): Promise<AnalyticsQuery> {
    const { data, error } = await supabase.functions.invoke('execute-analytics-query', {
      body: { projectId, query: naturalQuery },
    });

    if (error) throw new Error(error.message);
    return data.result;
  }

  async getQueryHistory(projectId: string, limit = 20): Promise<AnalyticsQuery[]> {
    const { data, error } = await supabase
      .from('analytics_queries')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data as AnalyticsQuery[];
  }

  // Analytics Summary - computed from tables directly
  async getProjectSummary(projectId: string): Promise<AnalyticsSummary> {
    // Get document counts
    const { count: totalDocuments, error: docError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    if (docError) throw new Error(docError.message);

    // Get scored documents count
    const { count: scoredDocuments, error: scoredError } = await supabase
      .from('document_scores')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    if (scoredError) throw new Error(scoredError.message);

    // Get high risk documents
    const { count: highRiskCount, error: riskError } = await supabase
      .from('document_scores')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .gte('risk_score', 70);

    if (riskError) throw new Error(riskError.message);

    // Get high opportunity documents
    const { count: highOpportunityCount, error: oppError } = await supabase
      .from('document_scores')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .gte('opportunity_score', 70);

    if (oppError) throw new Error(oppError.message);

    // Get active trends
    const { count: activeTrends, error: trendError } = await supabase
      .from('document_trends')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('is_active', true);

    if (trendError) throw new Error(trendError.message);

    // Get unresolved anomalies
    const { count: unresolvedAnomalies, error: anomalyError } = await supabase
      .from('document_anomalies')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('is_resolved', false);

    if (anomalyError) throw new Error(anomalyError.message);

    // Get critical anomalies
    const { count: criticalAnomalies, error: criticalError } = await supabase
      .from('document_anomalies')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('is_resolved', false)
      .eq('severity', 'critical');

    if (criticalError) throw new Error(criticalError.message);

    // Get average scores
    const { data: avgScores, error: avgError } = await supabase
      .from('document_scores')
      .select('risk_score, opportunity_score')
      .eq('project_id', projectId);

    if (avgError) throw new Error(avgError.message);

    const avgRiskScore = avgScores?.length 
      ? avgScores.reduce((sum, s) => sum + (s.risk_score || 0), 0) / avgScores.length 
      : null;
    const avgOpportunityScore = avgScores?.length 
      ? avgScores.reduce((sum, s) => sum + (s.opportunity_score || 0), 0) / avgScores.length 
      : null;

    return {
      total_documents: totalDocuments || 0,
      scored_documents: scoredDocuments || 0,
      high_risk_count: highRiskCount || 0,
      high_opportunity_count: highOpportunityCount || 0,
      active_trends: activeTrends || 0,
      unresolved_anomalies: unresolvedAnomalies || 0,
      critical_anomalies: criticalAnomalies || 0,
      avg_risk_score: avgRiskScore,
      avg_opportunity_score: avgOpportunityScore,
    };
  }
}

export const analyticsService = new AnalyticsService();
