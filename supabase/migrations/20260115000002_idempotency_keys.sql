-- =====================================================================
-- IDEMPOTENCY KEYS TABLE
-- Migration: 20260115000002_idempotency_keys.sql
-- Purpose: Add idempotency support to prevent duplicate operations
-- =====================================================================

-- Drop table if exists (for rollback)
DROP TABLE IF EXISTS idempotency_keys CASCADE;

-- Create idempotency_keys table
CREATE TABLE idempotency_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idempotency_key TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),

  -- Response data (stored when completed)
  response JSONB,
  status_code INTEGER,
  response_headers JSONB,

  -- Error information (stored when failed)
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,

  -- Metadata
  metadata JSONB,

  -- Ensure uniqueness per user
  CONSTRAINT idempotency_keys_unique UNIQUE (idempotency_key, user_id)
);

-- Create indexes for performance
CREATE INDEX idempotency_keys_user_id_idx ON idempotency_keys(user_id);
CREATE INDEX idempotency_keys_status_idx ON idempotency_keys(status);
CREATE INDEX idempotency_keys_expires_at_idx ON idempotency_keys(expires_at);
CREATE INDEX idempotency_keys_created_at_idx ON idempotency_keys(created_at DESC);

-- Composite index for common queries
CREATE INDEX idempotency_keys_user_status_idx
  ON idempotency_keys(user_id, status);

-- Add comments
COMMENT ON TABLE idempotency_keys IS 'Stores idempotency keys to prevent duplicate operations';
COMMENT ON COLUMN idempotency_keys.idempotency_key IS 'Unique key provided by client in X-Idempotency-Key header';
COMMENT ON COLUMN idempotency_keys.status IS 'Current status: processing, completed, or failed';
COMMENT ON COLUMN idempotency_keys.expires_at IS 'When this key expires (default 24 hours)';
COMMENT ON COLUMN idempotency_keys.response IS 'Cached response for completed operations';

-- Enable Row Level Security
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own idempotency keys"
  ON idempotency_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own idempotency keys"
  ON idempotency_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own idempotency keys"
  ON idempotency_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own idempotency keys"
  ON idempotency_keys FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================================
-- AUTOMATIC CLEANUP FUNCTION
-- =====================================================================

-- Function to clean up expired keys
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired keys
  DELETE FROM idempotency_keys
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_idempotency_keys IS 'Removes expired idempotency keys (call via cron)';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_expired_idempotency_keys TO authenticated;

-- =====================================================================
-- STATISTICS VIEW
-- =====================================================================

CREATE OR REPLACE VIEW v_idempotency_stats AS
SELECT
  COUNT(*) as total_keys,
  COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_count,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) FILTER (WHERE completed_at IS NOT NULL) as avg_processing_time_seconds,
  pg_size_pretty(pg_total_relation_size('idempotency_keys')) as table_size
FROM idempotency_keys;

COMMENT ON VIEW v_idempotency_stats IS 'Statistics about idempotency key usage';

-- Grant select permission
GRANT SELECT ON v_idempotency_stats TO authenticated;

-- =====================================================================
-- HELPER FUNCTIONS
-- =====================================================================

-- Function to get idempotency key status
CREATE OR REPLACE FUNCTION get_idempotency_status(
  p_idempotency_key TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  status TEXT,
  response JSONB,
  status_code INTEGER,
  error_message TEXT,
  is_expired BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ik.status,
    ik.response,
    ik.status_code,
    ik.error_message,
    (ik.expires_at < NOW()) as is_expired
  FROM idempotency_keys ik
  WHERE ik.idempotency_key = p_idempotency_key
    AND ik.user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION get_idempotency_status IS 'Get the status of an idempotency key';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_idempotency_status TO authenticated;

-- =====================================================================
-- CRON JOB FOR AUTOMATIC CLEANUP (Optional - requires pg_cron extension)
-- =====================================================================

-- Uncomment the following lines if pg_cron is available:
--
-- SELECT cron.schedule(
--   'cleanup-expired-idempotency-keys',
--   '0 * * * *', -- Every hour
--   $$SELECT cleanup_expired_idempotency_keys();$$
-- );

-- =====================================================================
-- MIGRATION VALIDATION
-- =====================================================================

DO $$
DECLARE
  table_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Check table created
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'idempotency_keys';

  IF table_count = 0 THEN
    RAISE EXCEPTION 'Table idempotency_keys was not created';
  END IF;

  -- Check indexes created
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'idempotency_keys';

  IF index_count < 5 THEN
    RAISE EXCEPTION 'Not all indexes were created (expected 5+, got %)', index_count;
  END IF;

  -- Check RLS enabled
  IF NOT (
    SELECT relrowsecurity
    FROM pg_class
    WHERE relname = 'idempotency_keys'
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on idempotency_keys';
  END IF;

  RAISE NOTICE 'Idempotency keys migration completed successfully';
  RAISE NOTICE 'Table created: idempotency_keys';
  RAISE NOTICE 'Indexes created: %', index_count;
  RAISE NOTICE 'Functions created: cleanup_expired_idempotency_keys, get_idempotency_status';
  RAISE NOTICE 'View created: v_idempotency_stats';
END;
$$;

-- =====================================================================
-- ROLLBACK SCRIPT (Save separately as rollback_20260115000002.sql)
-- =====================================================================

/*
-- To rollback this migration, run:

-- Drop view
DROP VIEW IF EXISTS v_idempotency_stats;

-- Drop functions
DROP FUNCTION IF EXISTS get_idempotency_status(TEXT, UUID);
DROP FUNCTION IF EXISTS cleanup_expired_idempotency_keys();

-- Drop cron job (if created)
-- SELECT cron.unschedule('cleanup-expired-idempotency-keys');

-- Drop table (cascades to policies and indexes)
DROP TABLE IF EXISTS idempotency_keys CASCADE;

-- Verify cleanup
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'idempotency_keys'
  ) THEN
    RAISE EXCEPTION 'Rollback failed: idempotency_keys table still exists';
  END IF;

  RAISE NOTICE 'Rollback completed successfully';
END;
$$;
*/
