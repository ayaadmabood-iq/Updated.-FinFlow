-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due');

-- Create pricing_plans table (reuses existing subscription_tier enum)
CREATE TABLE public.pricing_plans (
  tier public.subscription_tier PRIMARY KEY,
  price_monthly DECIMAL(10, 2),
  currency TEXT NOT NULL DEFAULT 'USD',
  documents_limit INTEGER,
  processing_limit INTEGER,
  storage_limit_bytes BIGINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pricing_plans
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active pricing plans
CREATE POLICY "Anyone can view active pricing plans"
ON public.pricing_plans FOR SELECT
USING (is_active = true);

-- Admins can manage pricing plans
CREATE POLICY "Admins can manage pricing plans"
ON public.pricing_plans FOR ALL
USING (public.is_admin(auth.uid()));

-- Seed pricing plans (matching Phase 9 tier_limits)
INSERT INTO public.pricing_plans (tier, price_monthly, currency, documents_limit, processing_limit, storage_limit_bytes, is_active)
VALUES
  ('free', 0, 'USD', 50, 20, 524288000, true),
  ('starter', 9.99, 'USD', 500, 200, 5368709120, true),
  ('pro', 29.99, 'USD', NULL, 1000, 26843545600, true),
  ('enterprise', NULL, 'USD', NULL, NULL, 107374182400, true);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier public.subscription_tier NOT NULL DEFAULT 'free',
  status public.subscription_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  provider TEXT,
  provider_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id)
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
ON public.subscriptions FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own subscription
CREATE POLICY "Users can insert own subscription"
ON public.subscriptions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own subscription
CREATE POLICY "Users can update own subscription"
ON public.subscriptions FOR UPDATE
USING (user_id = auth.uid());

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions FOR SELECT
USING (public.is_admin(auth.uid()));

-- Admins can update all subscriptions
CREATE POLICY "Admins can update all subscriptions"
ON public.subscriptions FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Create invite_codes table for soft launch
CREATE TABLE public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on invite_codes
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can validate invite codes (needed for signup)
CREATE POLICY "Anyone can view valid invite codes"
ON public.invite_codes FOR SELECT
USING (true);

-- Admins can manage invite codes
CREATE POLICY "Admins can manage invite codes"
ON public.invite_codes FOR ALL
USING (public.is_admin(auth.uid()));

-- Function to validate and use invite code
CREATE OR REPLACE FUNCTION public.validate_invite_code(_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite invite_codes%ROWTYPE;
BEGIN
  SELECT * INTO _invite
  FROM invite_codes
  WHERE code = _code;

  IF _invite IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid invite code');
  END IF;

  IF _invite.expires_at IS NOT NULL AND _invite.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invite code has expired');
  END IF;

  IF _invite.used_count >= _invite.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invite code has reached maximum uses');
  END IF;

  -- Increment used count
  UPDATE invite_codes
  SET used_count = used_count + 1
  WHERE id = _invite.id;

  RETURN jsonb_build_object('valid', true);
END;
$$;

-- Function to sync subscription tier to profiles
CREATE OR REPLACE FUNCTION public.sync_subscription_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET subscription_tier = NEW.tier,
      updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Trigger to sync subscription changes to profile
CREATE TRIGGER sync_subscription_tier
AFTER INSERT OR UPDATE OF tier ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_subscription_to_profile();

-- Function to check if downgrade is allowed
CREATE OR REPLACE FUNCTION public.can_downgrade_tier(_user_id UUID, _new_tier subscription_tier)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _usage usage_limits%ROWTYPE;
  _new_limits tier_limits%ROWTYPE;
BEGIN
  SELECT * INTO _usage FROM usage_limits WHERE user_id = _user_id;
  SELECT * INTO _new_limits FROM tier_limits WHERE tier = _new_tier;

  IF _new_limits.documents_limit IS NOT NULL AND _usage.documents_count > _new_limits.documents_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'documents',
      'current', _usage.documents_count,
      'limit', _new_limits.documents_limit
    );
  END IF;

  IF _new_limits.storage_bytes_limit IS NOT NULL AND _usage.storage_bytes > _new_limits.storage_bytes_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'storage',
      'current', _usage.storage_bytes,
      'limit', _new_limits.storage_bytes_limit
    );
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Create updated_at trigger for subscriptions
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for pricing_plans
CREATE TRIGGER update_pricing_plans_updated_at
BEFORE UPDATE ON public.pricing_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed some invite codes for soft launch
INSERT INTO public.invite_codes (code, max_uses, expires_at)
VALUES
  ('BETA2024', 100, '2025-12-31'::timestamp with time zone),
  ('EARLYBIRD', 50, '2025-06-30'::timestamp with time zone);