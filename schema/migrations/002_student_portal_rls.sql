-- ============================================================================
-- Migration 002: Student Portal RLS Overhaul
-- Expands SELECT policies for classes, materials, and instructions so that
-- enrolled students (in public.class_students) can access their course materials.
-- ============================================================================

-- 1. public.classes: Allow enrolled students to view class metadata
DROP POLICY IF EXISTS "Users can only view their own classes" ON public.classes;
DROP POLICY IF EXISTS "Users can view classes" ON public.classes;
CREATE POLICY "Users can view classes" ON public.classes FOR SELECT USING (
    (SELECT auth.uid()) = user_id 
    OR EXISTS (
        SELECT 1 FROM public.class_students cs 
        WHERE cs.class_id = classes.id AND cs.student_id = (SELECT auth.uid())
    )
);

-- 2. public.class_materials: Allow enrolled students to view material associations
DROP POLICY IF EXISTS "Users can access class_materials via class ownership" ON public.class_materials;
DROP POLICY IF EXISTS "Users can access class_materials" ON public.class_materials;
CREATE POLICY "Users can access class_materials" ON public.class_materials FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = class_materials.class_id AND c.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
        SELECT 1 FROM public.class_students cs
        WHERE cs.class_id = class_materials.class_id AND cs.student_id = (SELECT auth.uid())
    )
);

-- 3. public.materials: Allow enrolled students to read materials linked to their classes
DROP POLICY IF EXISTS "Users can only view their own materials" ON public.materials;
DROP POLICY IF EXISTS "Users can view materials" ON public.materials;
CREATE POLICY "Users can view materials" ON public.materials FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
        SELECT 1 FROM public.class_materials cm
        JOIN public.class_students cs ON cs.class_id = cm.class_id
        WHERE cm.material_id = materials.id AND cs.student_id = (SELECT auth.uid())
    )
);

-- 4. public.class_instructions: Allow enrolled students to view assigned instructions
DROP POLICY IF EXISTS "Users can access class_instructions via class ownership" ON public.class_instructions;
DROP POLICY IF EXISTS "Users can access class_instructions" ON public.class_instructions;
CREATE POLICY "Users can access class_instructions" ON public.class_instructions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = class_instructions.class_id AND c.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
        SELECT 1 FROM public.class_students cs
        WHERE cs.class_id = class_instructions.class_id AND cs.student_id = (SELECT auth.uid())
    )
);

-- 5. public.instructions: Allow enrolled students to view instructions linked to their classes
DROP POLICY IF EXISTS "Users can only view their own instructions" ON public.instructions;
DROP POLICY IF EXISTS "Users can view instructions" ON public.instructions;
CREATE POLICY "Users can view instructions" ON public.instructions FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
        SELECT 1 FROM public.class_instructions ci
        JOIN public.class_students cs ON cs.class_id = ci.class_id
        WHERE ci.instruction_id = instructions.id AND cs.student_id = (SELECT auth.uid())
    )
);
