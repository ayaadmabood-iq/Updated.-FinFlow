-- Remove WITH CHECK from documents UPDATE policy to avoid soft-delete updates failing
DROP POLICY IF EXISTS documents_update_policy ON public.documents;

CREATE POLICY documents_update_policy
ON public.documents
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

-- Keep RLS enabled
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;