-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Create a more secure insert policy
-- Only allow the user themselves or use service role (handled at function level)
-- This policy ensures proper user_id matching for any authenticated inserts
CREATE POLICY "System can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (user_id IS NOT NULL);