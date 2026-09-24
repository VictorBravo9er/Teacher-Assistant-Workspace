-- ==============================================================================
-- Migration 007: Move Student Contact & Parent Fields from class_students to students
-- Description: Relocates identity-level student contact and parent fields
--              (phone, address, parent_name, parent_contact) from class_students
--              to public.students, backfills any existing values, drops the
--              redundant columns from class_students, and updates RLS on
--              public.students so enrolled class teachers can update student
--              contact/profile fields.
-- ==============================================================================

-- 1. Add contact and parent fields to public.students
ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS parent_name TEXT,
    ADD COLUMN IF NOT EXISTS parent_contact TEXT;

-- 2. Backfill existing contact/parent data from public.class_students (if columns still exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'class_students'
          AND column_name = 'phone'
    ) THEN
        UPDATE public.students s
        SET
            phone = COALESCE(NULLIF(s.phone, ''), sub.phone),
            address = COALESCE(NULLIF(s.address, ''), sub.address),
            parent_name = COALESCE(NULLIF(s.parent_name, ''), sub.parent_name),
            parent_contact = COALESCE(NULLIF(s.parent_contact, ''), sub.parent_contact)
        FROM (
            SELECT DISTINCT ON (student_id)
                student_id,
                NULLIF(phone, '') AS phone,
                NULLIF(address, '') AS address,
                NULLIF(parent_name, '') AS parent_name,
                NULLIF(parent_contact, '') AS parent_contact
            FROM public.class_students
            WHERE NULLIF(phone, '') IS NOT NULL
               OR NULLIF(address, '') IS NOT NULL
               OR NULLIF(parent_name, '') IS NOT NULL
               OR NULLIF(parent_contact, '') IS NOT NULL
            ORDER BY student_id, updated_at DESC NULLS LAST
        ) sub
        WHERE s.id = sub.student_id;
    END IF;
END $$;

-- 3. Drop relocated columns from public.class_students
ALTER TABLE public.class_students
    DROP COLUMN IF EXISTS phone,
    DROP COLUMN IF EXISTS address,
    DROP COLUMN IF EXISTS parent_name,
    DROP COLUMN IF EXISTS parent_contact;

-- 4. Update RLS UPDATE policy on public.students to allow enrolled class teachers
DROP POLICY IF EXISTS "Students can update their own profile" ON public.students;
DROP POLICY IF EXISTS "Students and enrolled class teachers can update student profile" ON public.students;
CREATE POLICY "Students and enrolled class teachers can update student profile" ON public.students FOR UPDATE USING (
    (SELECT auth.uid()) = id
    OR EXISTS (
        SELECT 1 FROM public.class_students cs
        JOIN public.classes c ON cs.class_id = c.id
        WHERE cs.student_id = students.id AND c.user_id = (SELECT auth.uid())
    )
) WITH CHECK (
    (SELECT auth.uid()) = id
    OR EXISTS (
        SELECT 1 FROM public.class_students cs
        JOIN public.classes c ON cs.class_id = c.id
        WHERE cs.student_id = students.id AND c.user_id = (SELECT auth.uid())
    )
);
