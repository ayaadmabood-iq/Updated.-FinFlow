-- Reset documents RLS policies (drop all + recreate clean permissive policies)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'documents'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.documents', r.policyname);
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Recreate simple permissive policies
CREATE POLICY documents_select_policy
ON public.documents
FOR SELECT
TO authenticated
USING (owner_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY documents_insert_policy
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY documents_update_policy
ON public.documents
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY documents_delete_policy
ON public.documents
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());