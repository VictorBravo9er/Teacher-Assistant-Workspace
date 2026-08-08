-- ============================================================================
-- Supabase Storage Setup for Class Materials
-- ============================================================================

-- 1. Create the 'class-materials' storage bucket (private by default)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'class-materials',
  'class-materials',
  false,
  52428800, -- 50 MB limit
  ARRAY[
    'image/jpeg', 
    'image/png', 
    'image/svg+xml', 
    'application/pdf', 
    'text/plain', 
    'text/csv', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
    'application/vnd.ms-excel', 
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', 
    'application/vnd.ms-powerpoint'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Row Level Security Policies for storage.objects
-- Enable RLS on storage.objects if not already enabled (managed by Supabase by default)

-- DROP existing policies if re-running script to avoid duplicate errors
DROP POLICY IF EXISTS "Owner can view their class materials" ON storage.objects;
DROP POLICY IF EXISTS "Owner can upload their class materials" ON storage.objects;
DROP POLICY IF EXISTS "Owner can update their class materials" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete their class materials" ON storage.objects;

-- SELECT Policy: Full read access for file owner
CREATE POLICY "Owner can view their class materials"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'class-materials'
  AND (
    (SELECT auth.uid()) = owner 
    OR (SELECT auth.uid())::text = (storage.foldername(name))[1]
  )
);

-- INSERT Policy: Full upload access for file owner matching path folder
CREATE POLICY "Owner can upload their class materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'class-materials'
  AND (
    (SELECT auth.uid()) = owner 
    OR (SELECT auth.uid())::text = (storage.foldername(name))[1]
  )
);

-- UPDATE Policy: Full update access for file owner
CREATE POLICY "Owner can update their class materials"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'class-materials'
  AND (
    (SELECT auth.uid()) = owner 
    OR (SELECT auth.uid())::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'class-materials'
  AND (
    (SELECT auth.uid()) = owner 
    OR (SELECT auth.uid())::text = (storage.foldername(name))[1]
  )
);

-- DELETE Policy: Full deletion access for file owner
CREATE POLICY "Owner can delete their class materials"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'class-materials'
  AND (
    (SELECT auth.uid()) = owner 
    OR (SELECT auth.uid())::text = (storage.foldername(name))[1]
  )
);
