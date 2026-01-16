-- Drop existing restrictive UPDATE policy and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;

-- Create PERMISSIVE UPDATE policy for document owners
CREATE POLICY "Users can update their own documents"
ON documents
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Also fix the DELETE policy to be PERMISSIVE
DROP POLICY IF EXISTS "Users can soft delete their own documents" ON documents;

CREATE POLICY "Users can delete their own documents"
ON documents
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());