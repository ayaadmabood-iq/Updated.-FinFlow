// ============= Shared Type Definitions =============
// Centralized types to eliminate `any` usage across the codebase

import type { Database } from '@/integrations/supabase/types';

// ============= Database Row Types =============
export type Tables = Database['public']['Tables'];

// Knowledge Graph Types
export type KnowledgeGraphNodeRow = Tables['knowledge_graph_nodes']['Row'];
export type KnowledgeGraphEdgeRow = Tables['knowledge_graph_edges']['Row'];
export type KnowledgeGraphInsightRow = Tables['knowledge_graph_insights']['Row'];

// Document Types
export type DocumentRow = Tables['documents']['Row'];
export type ChunkRow = Tables['chunks']['Row'];

// AI & Governance Types
export type AIChangeRequestRow = Tables['ai_change_requests']['Row'];
export type AIQualityBaselineRow = Tables['ai_quality_baselines']['Row'];
export type AIRegressionAlertRow = Tables['ai_regression_alerts']['Row'];
export type AIModelRegistryRow = Tables['ai_model_registry']['Row'];
export type AIGovernanceAuditRow = Tables['ai_governance_audit']['Row'];

// Report Types
export type ReportTemplateRow = Tables['report_templates']['Row'];
export type GeneratedReportRow = Tables['generated_reports']['Row'];
export type DataExtractionRow = Tables['data_extractions']['Row'];

// Team Types
export type TeamRow = Tables['teams']['Row'];
export type TeamMemberRow = Tables['team_members']['Row'];
export type TeamActivityRow = Tables['team_activities']['Row'];
export type TeamInvitationRow = Tables['team_invitations']['Row'];

// ============= Custom Error Types =============

export interface QuotaExceededError extends Error {
  quotaExceeded: true;
  quotaType: 'documents' | 'storage';
  current: number;
  limit: number | null;
  tier: string;
}

export function createQuotaExceededError(
  message: string,
  quotaType: 'documents' | 'storage',
  current: number,
  limit: number | null,
  tier: string
): QuotaExceededError {
  const error = new Error(message) as QuotaExceededError;
  error.quotaExceeded = true;
  error.quotaType = quotaType;
  error.current = current;
  error.limit = limit;
  error.tier = tier;
  return error;
}

export function isQuotaExceededError(error: unknown): error is QuotaExceededError {
  return (
    error instanceof Error &&
    'quotaExceeded' in error &&
    (error as QuotaExceededError).quotaExceeded === true
  );
}

// ============= Graph Search Types =============

export interface GraphEntity {
  id: string;
  name: string;
  entityType: string;
  normalizedName: string;
  mentionCount: number;
  confidenceScore: number;
  properties?: Record<string, unknown>;
}

export interface GraphNeighbor {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  edgeId: string;
  relationship: string;
  distance: number;
}

export interface GraphPath {
  pathNodes: GraphEntity[];
  pathEdges: GraphEdge[];
  pathLength: number;
}

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: string;
  weight: number;
  evidenceSnippets: string[];
}

export interface GraphSearchContext {
  entities: GraphEntity[];
  neighbors: GraphNeighbor[];
  paths: GraphPath[];
}

// ============= Analytics Types =============

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface TrendDataPoint {
  date: string;
  count: number;
  metric?: number;
  category?: string;
}

export interface ParsedQueryIntent {
  queryType: 'count' | 'trend' | 'comparison' | 'detail' | 'aggregation';
  entities: string[];
  timeRange?: {
    start: string;
    end: string;
  };
  filters?: Record<string, unknown>;
  groupBy?: string[];
  orderBy?: string;
}

export interface VisualizationConfig {
  type: 'chart' | 'table' | 'metric' | 'list';
  chartType?: 'line' | 'bar' | 'pie' | 'area';
  xAxis?: string;
  yAxis?: string;
  series?: string[];
  colors?: string[];
}

export interface AnalyticsResultData {
  rows?: Record<string, unknown>[];
  total?: number;
  aggregations?: Record<string, number>;
  series?: TimeSeriesDataPoint[];
}

// ============= Extraction Job Types =============

export interface ExtractionJob {
  id: string;
  projectId: string;
  documentId: string | null;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  entitiesExtracted: number;
  relationshipsCreated: number;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

// ============= Cost Tracking Types =============

export type StageType = 'ingestion' | 'extraction' | 'language' | 'chunking' | 'summarization' | 'indexing';

export interface StageCostBreakdown {
  cost: number;
  percent: number;
}

export type CostBreakdownRecord = Record<StageType, StageCostBreakdown>;

// ============= Workflow Types =============

export interface WorkflowAction {
  type: string;
  config: Record<string, unknown>;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists' | 'in';
  value: unknown;
}

export interface WorkflowExecutionResult {
  type: string;
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
  duration_ms?: number;
}

// ============= Team Activity Types =============

export interface TeamActivityInsert {
  team_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  metadata: Record<string, unknown>;
}

// ============= Document Metadata Types =============

export interface EnrichedMetadata {
  tags?: string[];
  labels?: string[];
  customFields?: Record<string, unknown>;
  [key: string]: unknown;
}

// Use intersection type to extend DocumentRow while overriding enriched_metadata
export type DocumentWithMetadata = Omit<DocumentRow, 'enriched_metadata'> & {
  enriched_metadata?: EnrichedMetadata | null;
};

// ============= Report Template Types =============

export interface TemplateSection {
  id: string;
  title: string;
  title_ar: string;
  prompt: string;
  order: number;
}

export interface TemplateSettings {
  tone?: 'formal' | 'casual';
  includeCharts?: boolean;
  language?: 'auto' | 'en' | 'ar';
}

export interface SectionData {
  section_id: string;
  title: string;
  content: string;
  sources: { document_id: string; chunk_ids: string[] }[];
}

export interface ExtractionField {
  name: string;
  type: 'string' | 'number' | 'date' | 'currency';
  description: string;
}

export interface ExtractedRowValues {
  [key: string]: string | number | Date | null;
}

export interface ExtractedRow {
  document_id: string;
  document_name: string;
  values: ExtractedRowValues;
}
