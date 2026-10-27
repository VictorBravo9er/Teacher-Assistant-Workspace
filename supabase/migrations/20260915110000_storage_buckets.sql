-- ============================================================================
-- Teach&Learn: Storage Buckets Setup
-- Timestamp: 20260915110000
-- Combines class-materials and student-submissions storage buckets and RLS.
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

-- 2. Policies for 'class-materials'
DROP POLICY IF EXISTS "Owner can view their class materials" ON storage.objects;
DROP POLICY IF EXISTS "Owner can upload their class materials" ON storage.objects;
DROP POLICY IF EXISTS "Owner can update their class materials" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete their class materials" ON storage.objects;

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

-- 3. Create the 'student-submissions' storage bucket (private by default)
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

-- 4. Policies for 'student-submissions'
DROP POLICY IF EXISTS "Owner can view their students' Submissions" ON storage.objects;
DROP POLICY IF EXISTS "Owner can upload their students' Submissions" ON storage.objects;
DROP POLICY IF EXISTS "Owner can update their students' Submissions" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete their students' Submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can view student submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload student submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can update student submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete student submissions" ON storage.objects;

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
