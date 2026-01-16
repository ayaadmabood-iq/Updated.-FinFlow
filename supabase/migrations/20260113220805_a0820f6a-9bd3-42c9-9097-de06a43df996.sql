-- Create metrics table for storing application metrics
CREATE TABLE IF NOT EXISTS public.metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  tags JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (metrics are system-level)
CREATE POLICY "Service role can manage metrics"
ON public.metrics
FOR ALL
USING (true)
WITH CHECK (true);

-- Create indexes for efficient querying
CREATE INDEX idx_metrics_name ON public.metrics(name);
CREATE INDEX idx_metrics_timestamp ON public.metrics(timestamp DESC);
CREATE INDEX idx_metrics_name_timestamp ON public.metrics(name, timestamp DESC);
CREATE INDEX idx_metrics_tags ON public.metrics USING GIN(tags);

-- Create function to aggregate metrics
CREATE OR REPLACE FUNCTION public.aggregate_metrics(
  metric_name TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  interval_minutes INTEGER DEFAULT 5
)
RETURNS TABLE (
  time_bucket TIMESTAMPTZ,
  avg_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  sum_value NUMERIC,
  count_value BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('minute', m.timestamp) + 
      (EXTRACT(MINUTE FROM m.timestamp)::INTEGER / interval_minutes * interval_minutes) * INTERVAL '1 minute' AS time_bucket,
    AVG(m.value) AS avg_value,
    MIN(m.value) AS min_value,
    MAX(m.value) AS max_value,
    SUM(m.value) AS sum_value,
    COUNT(*) AS count_value
  FROM public.metrics m
  WHERE m.name = metric_name
    AND m.timestamp >= start_time
    AND m.timestamp <= end_time
  GROUP BY 1
  ORDER BY 1 DESC;
END;
$$;

-- Create function to get metric summary
CREATE OR REPLACE FUNCTION public.get_metrics_summary(
  time_range INTERVAL DEFAULT INTERVAL '24 hours'
)
RETURNS TABLE (
  metric_name TEXT,
  total_count BIGINT,
  avg_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  sum_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.name AS metric_name,
    COUNT(*) AS total_count,
    AVG(m.value) AS avg_value,
    MIN(m.value) AS min_value,
    MAX(m.value) AS max_value,
    SUM(m.value) AS sum_value
  FROM public.metrics m
  WHERE m.timestamp >= NOW() - time_range
  GROUP BY m.name
  ORDER BY total_count DESC;
END;
$$;

-- Create function to cleanup old metrics (keep 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_metrics()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.metrics
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;