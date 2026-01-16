-- Add tier_granted column to invite_codes if it doesn't exist
ALTER TABLE public.invite_codes 
ADD COLUMN IF NOT EXISTS tier_granted text;

-- Add comment for clarity
COMMENT ON COLUMN public.invite_codes.tier_granted IS 'The subscription tier this invite code grants access to. NULL means any tier.';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invite_codes_tier_granted ON public.invite_codes(tier_granted);

-- Update RLS policy to ensure only authenticated users can validate codes
DROP POLICY IF EXISTS "Users can validate invite codes" ON public.invite_codes;
CREATE POLICY "Users can validate invite codes" 
ON public.invite_codes 
FOR SELECT 
USING (auth.role() = 'authenticated');