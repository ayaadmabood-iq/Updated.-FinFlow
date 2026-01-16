-- ================================================
-- Phase 9: Quota Enforcement - Tier Limits & SQL Functions
-- ================================================

-- Create subscription tier enum if not exists (already exists)
-- CREATE TYPE subscription_tier AS ENUM ('free', 'starter', 'pro', 'enterprise');

-- Create tier_limits table
CREATE TABLE public.tier_limits (
  tier subscription_tier PRIMARY KEY,
  documents_limit integer, -- NULL means unlimited
  processing_limit integer, -- NULL means unlimited (per month)
  storage_bytes_limit bigint NOT NULL
);

-- Seed tier limits
INSERT INTO public.tier_limits (tier, documents_limit, processing_limit, storage_bytes_limit) VALUES
  ('free', 50, 20, 524288000), -- 500 MB
  ('starter', 500, 200, 5368709120), -- 5 GB
  ('pro', NULL, 1000, 26843545600), -- 25 GB, unlimited docs
  ('enterprise', NULL, NULL, 107374182400); -- 100 GB, unlimited docs & processing

-- Enable RLS on tier_limits (public read)
ALTER TABLE public.tier_limits ENABLE ROW LEVEL SECURITY;

-- Everyone can read tier limits
CREATE POLICY "Anyone can view tier limits"
  ON public.tier_limits
  FOR SELECT
  USING (true);

-- ================================================
-- check_quota function - Check if user can perform action
-- ================================================
CREATE OR REPLACE FUNCTION public.check_quota(
  _user_id uuid,
  _quota_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tier subscription_tier;
  _current bigint;
  _limit bigint;
  _allowed boolean;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO _tier
  FROM public.profiles
  WHERE id = _user_id;

  IF _tier IS NULL THEN
    _tier := 'free';
  END IF;

  -- Get current usage and limit based on quota type
  CASE _quota_type
    WHEN 'documents' THEN
      SELECT ul.documents_count, tl.documents_limit
      INTO _current, _limit
      FROM public.usage_limits ul
      JOIN public.tier_limits tl ON tl.tier = _tier
      WHERE ul.user_id = _user_id;

    WHEN 'processing' THEN
      SELECT ul.processing_count, tl.processing_limit
      INTO _current, _limit
      FROM public.usage_limits ul
      JOIN public.tier_limits tl ON tl.tier = _tier
      WHERE ul.user_id = _user_id;

    WHEN 'storage' THEN
      SELECT ul.storage_bytes, tl.storage_bytes_limit
      INTO _current, _limit
      FROM public.usage_limits ul
      JOIN public.tier_limits tl ON tl.tier = _tier
      WHERE ul.user_id = _user_id;

    ELSE
      RETURN jsonb_build_object(
        'allowed', false,
        'current', 0,
        'limit', 0,
        'error', 'Invalid quota type'
      );
  END CASE;

  -- Handle case where user has no usage record yet
  IF _current IS NULL THEN
    _current := 0;
  END IF;

  -- NULL limit means unlimited
  IF _limit IS NULL THEN
    _allowed := true;
  ELSE
    _allowed := _current < _limit;
  END IF;

  RETURN jsonb_build_object(
    'allowed', _allowed,
    'current', _current,
    'limit', _limit,
    'tier', _tier
  );
END;
$$;

-- ================================================
-- check_storage_quota function - Check storage with incoming size
-- ================================================
CREATE OR REPLACE FUNCTION public.check_storage_quota(
  _user_id uuid,
  _incoming_bytes bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tier subscription_tier;
  _current bigint;
  _limit bigint;
  _allowed boolean;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO _tier
  FROM public.profiles
  WHERE id = _user_id;

  IF _tier IS NULL THEN
    _tier := 'free';
  END IF;

  -- Get current storage and limit
  SELECT ul.storage_bytes, tl.storage_bytes_limit
  INTO _current, _limit
  FROM public.usage_limits ul
  JOIN public.tier_limits tl ON tl.tier = _tier
  WHERE ul.user_id = _user_id;

  IF _current IS NULL THEN
    _current := 0;
  END IF;

  -- Check if adding incoming bytes would exceed limit
  _allowed := (_current + _incoming_bytes) <= _limit;

  RETURN jsonb_build_object(
    'allowed', _allowed,
    'current', _current,
    'limit', _limit,
    'incoming', _incoming_bytes,
    'projected', _current + _incoming_bytes,
    'tier', _tier
  );
END;
$$;

-- ================================================
-- increment_usage function - Atomically increment usage
-- ================================================
CREATE OR REPLACE FUNCTION public.increment_usage(
  _user_id uuid,
  _quota_type text,
  _amount bigint DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE _quota_type
    WHEN 'documents' THEN
      UPDATE public.usage_limits
      SET documents_count = documents_count + _amount,
          updated_at = now()
      WHERE user_id = _user_id;

    WHEN 'processing' THEN
      UPDATE public.usage_limits
      SET processing_count = processing_count + _amount,
          updated_at = now()
      WHERE user_id = _user_id;

    WHEN 'storage' THEN
      UPDATE public.usage_limits
      SET storage_bytes = storage_bytes + _amount,
          updated_at = now()
      WHERE user_id = _user_id;

    ELSE
      RETURN false;
  END CASE;

  RETURN true;
END;
$$;

-- ================================================
-- decrement_usage function - Atomically decrement usage (for deletions)
-- ================================================
CREATE OR REPLACE FUNCTION public.decrement_usage(
  _user_id uuid,
  _quota_type text,
  _amount bigint DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE _quota_type
    WHEN 'documents' THEN
      UPDATE public.usage_limits
      SET documents_count = GREATEST(0, documents_count - _amount),
          updated_at = now()
      WHERE user_id = _user_id;

    WHEN 'storage' THEN
      UPDATE public.usage_limits
      SET storage_bytes = GREATEST(0, storage_bytes - _amount),
          updated_at = now()
      WHERE user_id = _user_id;

    ELSE
      RETURN false;
  END CASE;

  RETURN true;
END;
$$;

-- ================================================
-- reset_monthly_usage function - Reset processing count monthly
-- ================================================
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.usage_limits
  SET 
    processing_count = 0,
    reset_date = date_trunc('month', now()) + interval '1 month',
    updated_at = now()
  WHERE reset_date <= now();
END;
$$;

-- ================================================
-- get_quota_status function - Get full quota status for a user
-- ================================================
CREATE OR REPLACE FUNCTION public.get_quota_status(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tier subscription_tier;
  _usage record;
  _limits record;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO _tier
  FROM public.profiles
  WHERE id = _user_id;

  IF _tier IS NULL THEN
    _tier := 'free';
  END IF;

  -- Get usage
  SELECT documents_count, processing_count, storage_bytes, reset_date
  INTO _usage
  FROM public.usage_limits
  WHERE user_id = _user_id;

  -- Get limits
  SELECT documents_limit, processing_limit, storage_bytes_limit
  INTO _limits
  FROM public.tier_limits
  WHERE tier = _tier;

  RETURN jsonb_build_object(
    'tier', _tier,
    'documents', jsonb_build_object(
      'current', COALESCE(_usage.documents_count, 0),
      'limit', _limits.documents_limit
    ),
    'processing', jsonb_build_object(
      'current', COALESCE(_usage.processing_count, 0),
      'limit', _limits.processing_limit,
      'resetDate', _usage.reset_date
    ),
    'storage', jsonb_build_object(
      'current', COALESCE(_usage.storage_bytes, 0),
      'limit', _limits.storage_bytes_limit
    )
  );
END;
$$;