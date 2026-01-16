-- ============================================================================
-- FIX SECURITY WARNINGS: Restrict internal tables to service role only
-- ============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "cache_entries_service" ON cache_entries;
DROP POLICY IF EXISTS "queue_jobs_service" ON queue_jobs;

-- cache_entries: Only accessible via service role (no user access needed)
-- Since these tables are internal, we disable RLS and rely on service role access
ALTER TABLE cache_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE queue_jobs DISABLE ROW LEVEL SECURITY;

-- Revoke direct access from anon and authenticated users
REVOKE ALL ON cache_entries FROM anon, authenticated;
REVOKE ALL ON queue_jobs FROM anon, authenticated;

-- Grant only to service role (edge functions use service role)
GRANT ALL ON cache_entries TO service_role;
GRANT ALL ON queue_jobs TO service_role;

-- Fix pipeline_metrics - drop the duplicate ALL policy and keep proper separation
DROP POLICY IF EXISTS "pipeline_metrics_write" ON pipeline_metrics;

-- Proper write policies for pipeline_metrics
CREATE POLICY "pipeline_metrics_insert" ON pipeline_metrics
  FOR INSERT WITH CHECK (
    check_access(auth.uid(), NULL, project_id, NULL)
  );

CREATE POLICY "pipeline_metrics_update" ON pipeline_metrics
  FOR UPDATE USING (
    check_access(auth.uid(), NULL, project_id, NULL)
  );

CREATE POLICY "pipeline_metrics_delete" ON pipeline_metrics
  FOR DELETE USING (
    check_access(auth.uid(), NULL, project_id, NULL)
  );