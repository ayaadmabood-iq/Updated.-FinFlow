-- Remove the public policy that exposes all invite codes
DROP POLICY IF EXISTS "Anyone can view valid invite codes" ON public.invite_codes;

-- Add admin-only policy for viewing invite codes
CREATE POLICY "Admins can view invite codes" 
ON public.invite_codes 
FOR SELECT 
USING (public.is_admin(auth.uid()));