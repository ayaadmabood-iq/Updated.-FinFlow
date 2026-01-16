-- Fix media-assets storage bucket security
-- 1. Make the bucket private instead of public
UPDATE storage.buckets 
SET public = false 
WHERE id = 'media-assets';

-- 2. Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view media files" ON storage.objects;

-- 3. Create proper owner-scoped policies for media-assets bucket
-- Users can only view their own media files
CREATE POLICY "Users can view their own media files" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'media-assets' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can only upload to their own folder
CREATE POLICY "Users can upload their own media files" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'media-assets' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can only update their own media files
CREATE POLICY "Users can update their own media files" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'media-assets' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can only delete their own media files
CREATE POLICY "Users can delete their own media files" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'media-assets' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );