-- RLS policies for usage_limits
CREATE POLICY "Users can view own usage_limits"
ON public.usage_limits
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all usage_limits"
ON public.usage_limits
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update usage_limits"
ON public.usage_limits
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "System can insert usage_limits"
ON public.usage_limits
FOR INSERT
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Allow admins to read all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Allow admins to update profiles
CREATE POLICY "Admins can update user profiles"
ON public.profiles
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_usage_limits_updated_at ON public.usage_limits;
CREATE TRIGGER update_usage_limits_updated_at
BEFORE UPDATE ON public.usage_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create usage_limits for new profiles
CREATE OR REPLACE FUNCTION public.handle_new_profile_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usage_limits (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_usage ON public.profiles;
CREATE TRIGGER on_profile_created_usage
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_profile_usage();

-- Create usage_limits for existing profiles
INSERT INTO public.usage_limits (user_id)
SELECT id FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.usage_limits ul WHERE ul.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;