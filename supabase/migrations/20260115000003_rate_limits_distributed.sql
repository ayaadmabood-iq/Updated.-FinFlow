-- ============= Distributed Rate Limiting Migration =============
-- Migrates rate limiting from in-memory to database-backed storage
-- for proper distributed rate limiting across Edge Function instances

-- ============= Rate Limits Table =============

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,

  -- Sliding window tracking
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,

  -- Metadata
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise')),
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Composite unique constraint for user + endpoint + window
  CONSTRAINT rate_limits_unique UNIQUE (user_id, endpoint, window_start)
);

-- ============= Indexes for Performance =============

-- Primary lookup index (user + endpoint for active windows)
CREATE INDEX rate_limits_user_endpoint_idx
ON rate_limits(user_id, endpoint, window_start DESC);

-- Cleanup index (find old records)
CREATE INDEX rate_limits_window_start_idx
ON rate_limits(window_start);

-- Tier-based analysis index
CREATE INDEX rate_limits_tier_idx
ON rate_limits(tier);

-- Last request tracking index
CREATE INDEX rate_limits_last_request_idx
ON rate_limits(last_request_at);

-- ============= Row Level Security =============

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own rate limit records
CREATE POLICY "Users can view own rate limits"
  ON rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all rate limits
CREATE POLICY "Service role can manage rate limits"
  ON rate_limits FOR ALL
  USING (auth.role() = 'service_role');

-- ============= Cleanup Function =============

-- Function to cleanup expired rate limit records
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete records older than 5 minutes (well beyond any rate limit window)
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '5 minutes';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============= Atomic Increment Function =============

-- Function for atomic rate limit increment with conflict resolution
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_window_start TIMESTAMPTZ,
  p_tier TEXT
)
RETURNS TABLE (
  new_count INTEGER,
  is_new_window BOOLEAN
) AS $$
DECLARE
  v_count INTEGER;
  v_is_new BOOLEAN := FALSE;
BEGIN
  -- Try to increment existing record
  UPDATE rate_limits
  SET
    request_count = request_count + 1,
    last_request_at = NOW()
  WHERE
    user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start = p_window_start
  RETURNING request_count INTO v_count;

  -- If no record found, insert new one
  IF NOT FOUND THEN
    INSERT INTO rate_limits (
      user_id,
      endpoint,
      window_start,
      request_count,
      tier,
      last_request_at
    ) VALUES (
      p_user_id,
      p_endpoint,
      p_window_start,
      1,
      p_tier,
      NOW()
    )
    ON CONFLICT (user_id, endpoint, window_start)
    DO UPDATE SET
      request_count = rate_limits.request_count + 1,
      last_request_at = NOW()
    RETURNING request_count INTO v_count;

    v_is_new := TRUE;
  END IF;

  RETURN QUERY SELECT v_count, v_is_new;
END;
$$ LANGUAGE plpgsql;

-- ============= Statistics View =============

-- View for monitoring rate limit usage
CREATE OR REPLACE VIEW v_rate_limit_stats AS
SELECT
  tier,
  endpoint,
  COUNT(*) as active_windows,
  SUM(request_count) as total_requests,
  AVG(request_count) as avg_requests_per_window,
  MAX(request_count) as max_requests_in_window,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(window_start) as oldest_window,
  MAX(window_start) as newest_window
FROM rate_limits
WHERE window_start > NOW() - INTERVAL '1 hour'
GROUP BY tier, endpoint
ORDER BY total_requests DESC;

-- ============= Helper Functions =============

-- Get current rate limit status for a user
CREATE OR REPLACE FUNCTION get_rate_limit_status(
  p_user_id UUID,
  p_endpoint TEXT
)
RETURNS TABLE (
  endpoint TEXT,
  current_count INTEGER,
  window_start TIMESTAMPTZ,
  tier TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rl.endpoint,
    rl.request_count,
    rl.window_start,
    rl.tier
  FROM rate_limits rl
  WHERE
    rl.user_id = p_user_id
    AND rl.endpoint = p_endpoint
    AND rl.window_start > NOW() - INTERVAL '2 minutes'
  ORDER BY rl.window_start DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============= Performance Optimization =============

-- Create partial index for active windows only (improves query performance)
CREATE INDEX rate_limits_active_windows_idx
ON rate_limits(user_id, endpoint, window_start)
WHERE window_start > NOW() - INTERVAL '5 minutes';

-- ============= Monitoring Functions =============

-- Function to get rate limit metrics for monitoring
CREATE OR REPLACE FUNCTION get_rate_limit_metrics(
  p_time_window_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
  metric_name TEXT,
  metric_value NUMERIC,
  endpoint TEXT,
  tier TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Total requests by endpoint
  SELECT
    'total_requests'::TEXT,
    SUM(request_count)::NUMERIC,
    rl.endpoint,
    rl.tier
  FROM rate_limits rl
  WHERE window_start > NOW() - (p_time_window_minutes || ' minutes')::INTERVAL
  GROUP BY rl.endpoint, rl.tier

  UNION ALL

  -- Rate limit violations (requests exceeding typical limits)
  SELECT
    'rate_limit_violations'::TEXT,
    COUNT(*)::NUMERIC,
    rl.endpoint,
    rl.tier
  FROM rate_limits rl
  WHERE
    window_start > NOW() - (p_time_window_minutes || ' minutes')::INTERVAL
    AND request_count > CASE
      WHEN tier = 'free' THEN 60
      WHEN tier = 'pro' THEN 200
      ELSE 1000
    END
  GROUP BY rl.endpoint, rl.tier

  UNION ALL

  -- Unique users per endpoint
  SELECT
    'unique_users'::TEXT,
    COUNT(DISTINCT user_id)::NUMERIC,
    rl.endpoint,
    rl.tier
  FROM rate_limits rl
  WHERE window_start > NOW() - (p_time_window_minutes || ' minutes')::INTERVAL
  GROUP BY rl.endpoint, rl.tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============= Comments for Documentation =============

COMMENT ON TABLE rate_limits IS 'Distributed rate limiting storage for Edge Functions';
COMMENT ON COLUMN rate_limits.window_start IS 'Start of the sliding window for rate limiting';
COMMENT ON COLUMN rate_limits.request_count IS 'Number of requests in this window';
COMMENT ON COLUMN rate_limits.tier IS 'User subscription tier (free, pro, enterprise)';
COMMENT ON FUNCTION increment_rate_limit IS 'Atomically increment rate limit counter';
COMMENT ON FUNCTION cleanup_expired_rate_limits IS 'Remove expired rate limit records';
COMMENT ON VIEW v_rate_limit_stats IS 'Real-time statistics for rate limit monitoring';

-- ============= Initial Data =============

-- No initial data needed - rate limits are created dynamically

-- ============= Rollback Script =============
-- Uncomment to rollback this migration:

/*
DROP VIEW IF EXISTS v_rate_limit_stats;
DROP FUNCTION IF EXISTS get_rate_limit_metrics(INTEGER);
DROP FUNCTION IF EXISTS get_rate_limit_status(UUID, TEXT);
DROP FUNCTION IF EXISTS increment_rate_limit(UUID, TEXT, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS cleanup_expired_rate_limits();
DROP TABLE IF EXISTS rate_limits CASCADE;
*/
