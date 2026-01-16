-- Create subscription_tier enum if not exists
DO $$ BEGIN
  CREATE TYPE public.subscription_tier AS ENUM ('free', 'starter', 'pro', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_status enum if not exists
DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('active', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add subscription_tier column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_tier public.subscription_tier NOT NULL DEFAULT 'free';

-- Add status column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status public.user_status NOT NULL DEFAULT 'active';

-- Create usage_limits table
CREATE TABLE IF NOT EXISTS public.usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  documents_count INTEGER NOT NULL DEFAULT 0,
  processing_count INTEGER NOT NULL DEFAULT 0,
  storage_bytes BIGINT NOT NULL DEFAULT 0,
  reset_date TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on usage_limits
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;