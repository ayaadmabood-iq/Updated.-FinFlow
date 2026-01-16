-- Fix security issues

-- 1. Drop the insecure view and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.v_stage_failure_rates;

-- Create a secure regular view (no SECURITY DEFINER)
CREATE VIEW public.v_stage_failure_rates AS
SELECT 
  stage,
  COUNT(*) AS total_runs,
  COUNT(*) FILTER (WHERE success = true) AS successful_runs,
  COUNT(*) FILTER (WHERE success = false) AS failed_runs,
  ROUND(AVG(duration_ms)::numeric, 2) AS avg_duration_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::numeric, 2) AS p95_duration_ms,
  MAX(created_at) AS last_run_at
FROM public.processing_stage_metrics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY stage;

-- 2. Fix the overly permissive RLS policy - restrict to service role only
DROP POLICY IF EXISTS "Service can insert metrics" ON public.processing_stage_metrics;

-- Create a proper insert policy that checks document ownership
-- For metrics insertion, we need to allow service role but also authenticated users for their own docs
CREATE POLICY "Authenticated users can insert metrics for own documents"
ON public.processing_stage_metrics
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents d 
    WHERE d.id = document_id AND d.owner_id = auth.uid()
  )
);