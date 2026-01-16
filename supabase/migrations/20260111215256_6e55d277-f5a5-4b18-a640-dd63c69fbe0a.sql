-- Create materialized view for average stage latency
CREATE MATERIALIZED VIEW v_stage_latency_analysis AS
SELECT 
  stage_name,
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE status = 'completed') as successful_runs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_runs,
  ROUND(AVG(duration_ms)::NUMERIC, 2) as avg_duration_ms,
  ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE status = 'completed'))::NUMERIC, 2) as median_duration_ms,
  ROUND((PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE status = 'completed'))::NUMERIC, 2) as p95_duration_ms,
  ROUND((PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE status = 'completed'))::NUMERIC, 2) as p99_duration_ms,
  SUM(total_tokens) as total_tokens_all_time,
  SUM(estimated_cost_usd) as total_cost_usd,
  ROUND(AVG(estimated_cost_usd) FILTER (WHERE estimated_cost_usd > 0), 8) as avg_cost_per_call
FROM public.pipeline_logs
GROUP BY stage_name;

-- Create unique index for refreshing the materialized view
CREATE UNIQUE INDEX idx_v_stage_latency_analysis_stage ON v_stage_latency_analysis(stage_name);

-- Create view for daily cost analytics
CREATE OR REPLACE VIEW v_daily_ai_costs AS
SELECT 
  DATE(created_at) as date,
  SUM(total_tokens) as total_tokens,
  SUM(prompt_tokens) as total_prompt_tokens,
  SUM(completion_tokens) as total_completion_tokens,
  SUM(estimated_cost_usd) as total_cost_usd,
  COUNT(DISTINCT trace_id) as documents_processed,
  COUNT(*) as total_api_calls
FROM public.pipeline_logs
WHERE estimated_cost_usd > 0
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Create view for most expensive documents
CREATE OR REPLACE VIEW v_expensive_documents AS
SELECT 
  d.id as document_id,
  d.name as document_name,
  d.original_name,
  d.project_id,
  d.processing_cost_usd,
  d.total_tokens_used,
  d.created_at,
  p.name as project_name
FROM public.documents d
LEFT JOIN public.projects p ON d.project_id = p.id
WHERE d.processing_cost_usd > 0
  AND d.deleted_at IS NULL
ORDER BY d.processing_cost_usd DESC;

-- Create view for pipeline health (failure rates by stage in last 24h)
CREATE OR REPLACE VIEW v_pipeline_health AS
SELECT 
  stage_name,
  COUNT(*) as total_last_24h,
  COUNT(*) FILTER (WHERE status = 'completed') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'failed')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
    2
  ) as failure_rate_percent,
  ROUND(AVG(duration_ms)::NUMERIC, 0) as avg_duration_ms
FROM public.pipeline_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY stage_name
ORDER BY failure_rate_percent DESC;

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_stage_latency_analysis()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_stage_latency_analysis;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add comments
COMMENT ON MATERIALIZED VIEW v_stage_latency_analysis IS 'Aggregated stage performance metrics for identifying bottlenecks';
COMMENT ON VIEW v_daily_ai_costs IS 'Daily AI usage costs for billing and monitoring';
COMMENT ON VIEW v_expensive_documents IS 'Documents sorted by processing cost for cost analysis';
COMMENT ON VIEW v_pipeline_health IS 'Real-time pipeline health showing failure rates by stage';