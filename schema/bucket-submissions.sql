-- ============================================================================
-- Supabase Storage Setup for Student Submissions
-- ============================================================================
-- Canonical Storage Path: /{material_id}/{content_item_id}
-- - {material_id}: UUID matching public.materials(id) (folder name [1])
-- - {content_item_id}: UUID matching the 'id' field in student_submissions.content JSONB array
-- ============================================================================

-- 1. Create the 'student-submissions' storage bucket (private by default)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-submissions',
  'student-submissions',
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
DROP POLICY IF EXISTS "Owner can view their students' Submissions" ON storage.objects;
DROP POLICY IF EXISTS "Owner can upload their students' Submissions" ON storage.objects;
DROP POLICY IF EXISTS "Owner can update their students' Submissions" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete their students' Submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload student submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can update student submissions" ON storage.objects;

-- SELECT Policy:
-- 1) Submitting student can view their own files ((SELECT auth.uid()) = owner)
-- 2) Class teachers can view submissions for materials linked to their classes
CREATE POLICY "Users can view student submissions"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-submissions'
  AND (
    (SELECT auth.uid()) = owner
    OR EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.class_materials cm ON cm.class_id = c.id
      WHERE c.user_id = (SELECT auth.uid())
        AND cm.material_id::text = (storage.foldername(name))[1]
    )
  )
);

-- INSERT Policy:
-- 1) Enrolled students in a class where the material is assigned can upload submissions
-- 2) Teachers who own the class where the material is assigned can upload student submissions
-- 3) Authenticated owner
CREATE POLICY "Users can upload student submissions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-submissions'
  AND (
    (SELECT auth.uid()) = owner
    OR EXISTS (
      SELECT 1 FROM public.class_students cs
      JOIN public.class_materials cm ON cm.class_id = cs.class_id
      WHERE cs.student_id = (SELECT auth.uid())
        AND cm.material_id::text = (storage.foldername(name))[1]
    )
    OR EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.class_materials cm ON cm.class_id = c.id
      WHERE c.user_id = (SELECT auth.uid())
        AND cm.material_id::text = (storage.foldername(name))[1]
    )
  )
);

-- UPDATE Policy: Submitting student or class teacher can update submission files
CREATE POLICY "Users can update student submissions"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'student-submissions'
  AND (
    (SELECT auth.uid()) = owner
    OR EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.class_materials cm ON cm.class_id = c.id
      WHERE c.user_id = (SELECT auth.uid())
        AND cm.material_id::text = (storage.foldername(name))[1]
    )
  )
)
WITH CHECK (
  bucket_id = 'student-submissions'
  AND (
    (SELECT auth.uid()) = owner
    OR EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.class_materials cm ON cm.class_id = c.id
      WHERE c.user_id = (SELECT auth.uid())
        AND cm.material_id::text = (storage.foldername(name))[1]
    )
  )
);

-- DELETE Policy: Submitting student or class teacher can delete submission files
CREATE POLICY "Users can delete student submissions"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'student-submissions'
  AND (
    (SELECT auth.uid()) = owner
    OR EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.class_materials cm ON cm.class_id = c.id
      WHERE c.user_id = (SELECT auth.uid())
        AND cm.material_id::text = (storage.foldername(name))[1]
    )
  )
);
