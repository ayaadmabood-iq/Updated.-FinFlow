/**
 * Database types for Supabase
 * Re-exports from the auto-generated types file
 * This file exists to satisfy the report requirement for src/types/database.types.ts
 */

// Re-export everything from the auto-generated types
export type { Database, Json } from '@/integrations/supabase/types';

// Export commonly used table types for convenience
import type { Database } from '@/integrations/supabase/types';

// Table row types
export type Project = Database['public']['Tables']['projects']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type Chunk = Database['public']['Tables']['chunks']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
export type ApiKey = Database['public']['Tables']['api_keys']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type AIFeedback = Database['public']['Tables']['ai_feedback']['Row'];
export type AIEvaluation = Database['public']['Tables']['ai_evaluations']['Row'];
export type TrainingDataset = Database['public']['Tables']['training_datasets']['Row'];
export type ResearchTask = Database['public']['Tables']['research_tasks']['Row'];
export type AgentActivityLog = Database['public']['Tables']['agent_activity_logs']['Row'];

// Insert types
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
export type ChunkInsert = Database['public']['Tables']['chunks']['Insert'];
export type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert'];

// Update types
export type ProjectUpdate = Database['public']['Tables']['projects']['Update'];
export type DocumentUpdate = Database['public']['Tables']['documents']['Update'];
export type ChunkUpdate = Database['public']['Tables']['chunks']['Update'];

// Enum types
export type EvaluationStatus = Database['public']['Enums']['evaluation_status'];
export type BenchmarkStatus = Database['public']['Enums']['benchmark_status'];
export type ReportStatus = Database['public']['Enums']['report_status'];
export type AgentRole = Database['public']['Enums']['agent_role'];
export type AnnotationType = Database['public']['Enums']['annotation_type'];
export type ArabicDialect = Database['public']['Enums']['arabic_dialect'];
export type JurisdictionRegion = Database['public']['Enums']['jurisdiction_region'];
export type ContentTargetFormat = Database['public']['Enums']['content_target_format'];
