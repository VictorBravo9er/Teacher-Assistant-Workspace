-- ============================================================================
-- Teach&Learn: Storage Buckets Row Level Security (RLS) Policies
-- Timestamp: 20260915110100
-- ============================================================================

-- 1. Policies for 'class-materials'
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

-- 2. Policies for 'student-submissions'
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
