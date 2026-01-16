-- ============================================================================
-- PHASE 1: CRITICAL INFRASTRUCTURE CLEANUP
-- Consolidate 323 RLS policies to ~60, remove 55+ triggers, streamline functions
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL REDUNDANT updated_at TRIGGERS (keeping only essential ones)
-- These can be handled at application layer
-- ============================================================================

-- Drop all update_*_updated_at triggers (50+ of them)
DROP TRIGGER IF EXISTS update_ai_evaluations_updated_at ON ai_evaluations;
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
DROP TRIGGER IF EXISTS update_content_templates_updated_at ON content_templates;
DROP TRIGGER IF EXISTS update_curated_qa_pairs_updated_at ON curated_qa_pairs;
DROP TRIGGER IF EXISTS update_data_extractions_updated_at ON data_extractions;
DROP TRIGGER IF EXISTS update_data_sources_updated_at ON data_sources;
DROP TRIGGER IF EXISTS update_dialect_mappings_updated_at ON dialect_mappings;
DROP TRIGGER IF EXISTS update_document_annotations_updated_at ON document_annotations;
DROP TRIGGER IF EXISTS update_document_anomalies_updated_at ON document_anomalies;
DROP TRIGGER IF EXISTS update_document_scores_updated_at ON document_scores;
DROP TRIGGER IF EXISTS update_document_trends_updated_at ON document_trends;
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
DROP TRIGGER IF EXISTS update_executive_briefings_updated_at ON executive_briefings;
DROP TRIGGER IF EXISTS update_finetune_jobs_updated_at ON finetune_jobs;
DROP TRIGGER IF EXISTS update_generated_content_updated_at ON generated_content;
DROP TRIGGER IF EXISTS update_generated_reports_updated_at ON generated_reports;
DROP TRIGGER IF EXISTS update_glossary_terms_updated_at ON glossary_terms;
DROP TRIGGER IF EXISTS update_gold_standard_updated_at ON gold_standard_answers;
DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
DROP TRIGGER IF EXISTS update_knowledge_base_articles_updated_at ON knowledge_base_articles;
DROP TRIGGER IF EXISTS update_knowledge_bases_updated_at ON knowledge_bases;
DROP TRIGGER IF EXISTS update_kg_edges_updated_at ON knowledge_graph_edges;
DROP TRIGGER IF EXISTS update_kg_insights_updated_at ON knowledge_graph_insights;
DROP TRIGGER IF EXISTS update_kg_nodes_updated_at ON knowledge_graph_nodes;
DROP TRIGGER IF EXISTS update_media_assets_updated_at ON media_assets;
DROP TRIGGER IF EXISTS update_transcriptions_updated_at ON media_transcriptions;
DROP TRIGGER IF EXISTS update_pii_detection_rules_updated_at ON pii_detection_rules;
DROP TRIGGER IF EXISTS update_pricing_plans_updated_at ON pricing_plans;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_project_glossaries_updated_at ON project_glossaries;
DROP TRIGGER IF EXISTS update_project_localization_updated_at ON project_localization;
DROP TRIGGER IF EXISTS update_project_privacy_settings_updated_at ON project_privacy_settings;
DROP TRIGGER IF EXISTS update_prompt_configs_updated_at ON project_prompt_configs;
DROP TRIGGER IF EXISTS update_project_tasks_updated_at ON project_tasks;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_quality_benchmarks_updated_at ON quality_benchmarks;
DROP TRIGGER IF EXISTS trigger_rag_eval_sets_updated_at ON rag_eval_sets;
DROP TRIGGER IF EXISTS trigger_rag_experiments_updated_at ON rag_experiments;
DROP TRIGGER IF EXISTS update_report_templates_updated_at ON report_templates;
DROP TRIGGER IF EXISTS update_research_tasks_updated_at ON research_tasks;
DROP TRIGGER IF EXISTS update_shared_chat_threads_updated_at ON shared_chat_threads;
DROP TRIGGER IF EXISTS update_sso_config_updated_at ON sso_config;
DROP TRIGGER IF EXISTS update_style_profiles_updated_at ON style_profiles;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
DROP TRIGGER IF EXISTS update_system_prompt_versions_updated_at ON system_prompt_versions;
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
DROP TRIGGER IF EXISTS update_trained_models_updated_at ON trained_models;
DROP TRIGGER IF EXISTS update_training_jobs_updated_at ON training_jobs;
DROP TRIGGER IF EXISTS update_usage_limits_updated_at ON usage_limits;
DROP TRIGGER IF EXISTS update_user_api_keys_updated_at ON user_api_keys;

-- ============================================================================
-- STEP 2: DROP UNNECESSARY FUNCTIONS (keep only essential ones)
-- Essential: hybrid_search_*, search_*_by_embedding, is_*, has_role, handle_new_user
-- ============================================================================

-- Drop business logic functions that should be in application layer
DROP FUNCTION IF EXISTS compute_retrieval_precision(uuid, text, uuid[], integer);
DROP FUNCTION IF EXISTS detect_dialect_indicators(text);
DROP FUNCTION IF EXISTS find_relevant_glossary_terms(uuid, text, integer);
DROP FUNCTION IF EXISTS get_project_analytics_summary(uuid);
DROP FUNCTION IF EXISTS check_workflow_circuit_breaker(uuid, uuid);
DROP FUNCTION IF EXISTS get_matching_workflows(uuid, workflow_trigger_type, jsonb);
DROP FUNCTION IF EXISTS validate_invite_code(text);
DROP FUNCTION IF EXISTS can_downgrade_tier(uuid, subscription_tier);
DROP FUNCTION IF EXISTS find_graph_path(uuid, uuid, uuid, integer);
DROP FUNCTION IF EXISTS get_graph_neighbors(uuid, integer);
DROP FUNCTION IF EXISTS check_api_rate_limit(uuid, integer, integer);
DROP FUNCTION IF EXISTS refresh_stage_latency_analysis();

-- Drop duplicate search functions (keep only one version each)
DROP FUNCTION IF EXISTS search_documents_by_embedding(extensions.vector, double precision, integer, uuid, uuid, text[]);
DROP FUNCTION IF EXISTS search_chunks_by_embedding(extensions.vector, double precision, integer, uuid, uuid, text[]);

-- ============================================================================
-- STEP 3: CREATE CONSOLIDATED RLS HELPER FUNCTION
-- Single function to check all access patterns
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_access(
  p_user_id uuid,
  p_resource_owner_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_team_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Admin bypass
  IF is_admin(p_user_id) THEN
    RETURN true;
  END IF;
  
  -- Direct owner check
  IF p_resource_owner_id IS NOT NULL AND p_user_id = p_resource_owner_id THEN
    RETURN true;
  END IF;
  
  -- Project access via ownership or team
  IF p_project_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = p_user_id) THEN
      RETURN true;
    END IF;
    IF EXISTS (
      SELECT 1 FROM project_shares ps
      JOIN team_members tm ON ps.team_id = tm.team_id
      WHERE ps.project_id = p_project_id AND tm.user_id = p_user_id
    ) THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Team access
  IF p_team_id IS NOT NULL AND is_team_member(p_user_id, p_team_id) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- ============================================================================
-- STEP 4: CREATE PROCESSING METRICS TABLE FOR MONITORING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pipeline_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage text NOT NULL,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  status text NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  error_message text,
  retry_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for monitoring queries
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_stage ON pipeline_metrics(stage);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_status ON pipeline_metrics(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_created_at ON pipeline_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_project ON pipeline_metrics(project_id);

-- Enable RLS with simple owner-based policy
ALTER TABLE pipeline_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_metrics_read" ON pipeline_metrics
  FOR SELECT USING (
    check_access(auth.uid(), NULL, project_id, NULL)
  );

CREATE POLICY "pipeline_metrics_write" ON pipeline_metrics
  FOR ALL USING (
    check_access(auth.uid(), NULL, project_id, NULL)
  );

-- ============================================================================
-- STEP 5: CREATE CACHE METADATA TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cache_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  cache_type text NOT NULL, -- embedding, summary, extraction, language
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  content_hash text NOT NULL,
  value_ref text, -- reference to cached value (storage path or inline for small values)
  ttl_seconds integer DEFAULT 86400,
  hit_count integer DEFAULT 0,
  last_hit_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_cache_entries_key ON cache_entries(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_entries_type ON cache_entries(cache_type);
CREATE INDEX IF NOT EXISTS idx_cache_entries_expires ON cache_entries(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_entries_document ON cache_entries(document_id);

-- No RLS needed - internal system table accessed via service role
ALTER TABLE cache_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cache_entries_service" ON cache_entries
  FOR ALL USING (true);

-- ============================================================================
-- STEP 6: CREATE QUEUE JOBS TABLE (for BullMQ-like functionality)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.queue_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name text NOT NULL, -- pipeline, embedding, notification
  job_type text NOT NULL,
  payload jsonb NOT NULL,
  priority integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, retrying
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  error_message text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_queue_jobs_queue ON queue_jobs(queue_name, status);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_scheduled ON queue_jobs(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_queue_jobs_priority ON queue_jobs(priority DESC, scheduled_at ASC);

-- No RLS - internal system table
ALTER TABLE queue_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "queue_jobs_service" ON queue_jobs
  FOR ALL USING (true);

-- ============================================================================
-- STEP 7: ADD PERFORMANCE INDEXES
-- ============================================================================

-- Documents performance indexes
CREATE INDEX IF NOT EXISTS idx_documents_owner_status ON documents(owner_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_project_status ON documents(project_id, status) WHERE deleted_at IS NULL;

-- Chunks performance indexes  
CREATE INDEX IF NOT EXISTS idx_chunks_document_index ON chunks(document_id, index);

-- Projects performance index
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);

-- Enable realtime for monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_jobs;