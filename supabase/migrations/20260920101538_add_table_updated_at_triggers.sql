-- ==============================================================================
-- Migration 006: Multi-Component TTL & Granular Database Revalidation Engine
-- ==============================================================================

-- 1. Reusable trigger function to set updated_at to UTC now()
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- 2. Add updated_at columns to tables where missing
ALTER TABLE public.templates 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.materials 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.instructions 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.students 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.class_students 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.attendance_records 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.student_submissions 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.class_materials 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.class_instructions 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.template_materials 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.template_instructions 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- 3. Attach BEFORE UPDATE triggers
DROP TRIGGER IF EXISTS trg_classes_updated_at ON public.classes;
CREATE TRIGGER trg_classes_updated_at
    BEFORE UPDATE ON public.classes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_templates_updated_at ON public.templates;
CREATE TRIGGER trg_templates_updated_at
    BEFORE UPDATE ON public.templates
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_materials_updated_at ON public.materials;
CREATE TRIGGER trg_materials_updated_at
    BEFORE UPDATE ON public.materials
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_instructions_updated_at ON public.instructions;
CREATE TRIGGER trg_instructions_updated_at
    BEFORE UPDATE ON public.instructions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_students_updated_at ON public.students;
CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_class_students_updated_at ON public.class_students;
CREATE TRIGGER trg_class_students_updated_at
    BEFORE UPDATE ON public.class_students
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_attendance_records_updated_at ON public.attendance_records;
CREATE TRIGGER trg_attendance_records_updated_at
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_student_submissions_updated_at ON public.student_submissions;
CREATE TRIGGER trg_student_submissions_updated_at
    BEFORE UPDATE ON public.student_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_class_materials_updated_at ON public.class_materials;
CREATE TRIGGER trg_class_materials_updated_at
    BEFORE UPDATE ON public.class_materials
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_class_instructions_updated_at ON public.class_instructions;
CREATE TRIGGER trg_class_instructions_updated_at
    BEFORE UPDATE ON public.class_instructions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_template_materials_updated_at ON public.template_materials;
CREATE TRIGGER trg_template_materials_updated_at
    BEFORE UPDATE ON public.template_materials
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_template_instructions_updated_at ON public.template_instructions;
CREATE TRIGGER trg_template_instructions_updated_at
    BEFORE UPDATE ON public.template_instructions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;
CREATE TRIGGER trg_announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_notification_logs_updated_at ON public.notification_logs;
CREATE TRIGGER trg_notification_logs_updated_at
    BEFORE UPDATE ON public.notification_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER trg_chat_sessions_updated_at
    BEFORE UPDATE ON public.chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 4. Granular Workspace Component Revalidation Engine
CREATE OR REPLACE FUNCTION public.check_workspace_modifications(
    p_client_timestamps jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_wiped BOOLEAN := false;
    v_accessible_class_ids UUID[];
    v_c_id UUID;
    v_server_timestamps jsonb := '{}'::jsonb;
    v_stale_components jsonb := '[]'::jsonb;
    v_classes_max TIMESTAMPTZ;
    v_templates_max TIMESTAMPTZ;
    v_students_max TIMESTAMPTZ;
    v_materials_max TIMESTAMPTZ;
    v_instructions_max TIMESTAMPTZ;
    v_classes_count INT;
    v_templates_count INT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'stale_components', jsonb_build_array(),
            'server_timestamps', '{}'::jsonb,
            'is_wiped', true
        );
    END IF;

    -- Collect accessible classes for teacher OR student
    -- Teacher: classes owned by user
    -- Student: classes student is enrolled in
    SELECT COALESCE(array_agg(DISTINCT id), ARRAY[]::UUID[])
    INTO v_accessible_class_ids
    FROM (
        SELECT id FROM public.classes WHERE user_id = v_user_id
        UNION
        SELECT class_id AS id FROM public.class_students WHERE student_id = v_user_id
    ) t;

    -- Check if user data exists at all
    SELECT COUNT(*) INTO v_classes_count FROM unnest(v_accessible_class_ids);
    SELECT COUNT(*) INTO v_templates_count FROM public.templates WHERE user_id = v_user_id;

    IF v_classes_count = 0 AND v_templates_count = 0 THEN
        -- The workspace is empty or wiped in DB
        -- If client provided any cached keys, flag everything as wiped and stale so client purges cache
        v_is_wiped := true;
        IF p_client_timestamps IS NOT NULL AND p_client_timestamps <> '{}'::jsonb THEN
            SELECT jsonb_agg(key) INTO v_stale_components FROM jsonb_object_keys(p_client_timestamps) key;
        END IF;
        RETURN jsonb_build_object(
            'stale_components', COALESCE(v_stale_components, '[]'::jsonb),
            'server_timestamps', '{}'::jsonb,
            'is_wiped', true
        );
    END IF;

    -- 1. classes_meta
    SELECT MAX(c.updated_at)
    INTO v_classes_max
    FROM public.classes c
    WHERE c.id = ANY(v_accessible_class_ids);

    IF v_classes_max IS NOT NULL THEN
        v_server_timestamps := jsonb_set(
            v_server_timestamps, 
            '{classes_meta}', 
            to_jsonb(to_char(v_classes_max, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))
        );
    END IF;

    -- 2. templates (for teachers)
    SELECT MAX(t.updated_at)
    INTO v_templates_max
    FROM public.templates t
    WHERE t.user_id = v_user_id;

    IF v_templates_max IS NOT NULL THEN
        v_server_timestamps := jsonb_set(
            v_server_timestamps, 
            '{templates}', 
            to_jsonb(to_char(v_templates_max, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))
        );
    END IF;

    -- 3. Per-class components for accessible classes
    FOREACH v_c_id IN ARRAY v_accessible_class_ids LOOP
        -- class_students:<class_id>
        SELECT GREATEST(
            (SELECT MAX(cs.updated_at) FROM public.class_students cs WHERE cs.class_id = v_c_id),
            (SELECT MAX(s.updated_at) FROM public.students s WHERE s.id IN (SELECT cs2.student_id FROM public.class_students cs2 WHERE cs2.class_id = v_c_id)),
            (SELECT MAX(ar.updated_at) FROM public.attendance_records ar WHERE ar.class_id = v_c_id),
            (SELECT MAX(sub.updated_at) FROM public.student_submissions sub WHERE sub.class_id = v_c_id)
        ) INTO v_students_max;

        IF v_students_max IS NOT NULL THEN
            v_server_timestamps := jsonb_set(
                v_server_timestamps,
                ARRAY['class_students:' || v_c_id::text],
                to_jsonb(to_char(v_students_max, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))
            );
        END IF;

        -- class_materials:<class_id>
        SELECT GREATEST(
            (SELECT MAX(cm.updated_at) FROM public.class_materials cm WHERE cm.class_id = v_c_id),
            (SELECT MAX(m.updated_at) FROM public.materials m WHERE m.id IN (SELECT cm2.material_id FROM public.class_materials cm2 WHERE cm2.class_id = v_c_id))
        ) INTO v_materials_max;

        IF v_materials_max IS NOT NULL THEN
            v_server_timestamps := jsonb_set(
                v_server_timestamps,
                ARRAY['class_materials:' || v_c_id::text],
                to_jsonb(to_char(v_materials_max, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))
            );
        END IF;

        -- class_instructions:<class_id>
        SELECT GREATEST(
            (SELECT MAX(ci.updated_at) FROM public.class_instructions ci WHERE ci.class_id = v_c_id),
            (SELECT MAX(i.updated_at) FROM public.instructions i WHERE i.id IN (SELECT ci2.instruction_id FROM public.class_instructions ci2 WHERE ci2.class_id = v_c_id))
        ) INTO v_instructions_max;

        IF v_instructions_max IS NOT NULL THEN
            v_server_timestamps := jsonb_set(
                v_server_timestamps,
                ARRAY['class_instructions:' || v_c_id::text],
                to_jsonb(to_char(v_instructions_max, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))
            );
        END IF;
    END LOOP;

    -- Detailed key-by-key comparison:
    -- A component is stale if:
    -- 1. Client has a key that is NOT in server_timestamps (e.g. deleted or no longer accessible)
    -- 2. Client timestamp is NULL or empty or older than server timestamp
    -- 3. Server has a component that client does not have cached yet
    SELECT COALESCE(jsonb_agg(comp_key), '[]'::jsonb)
    INTO v_stale_components
    FROM (
        SELECT key AS comp_key
        FROM jsonb_each_text(p_client_timestamps)
        WHERE (
            NOT (v_server_timestamps ? key)
            OR
            value IS NULL
            OR
            value = ''
            OR
            (CASE 
                WHEN value ~ '^\d{4}-\d{2}-\d{2}' THEN value::timestamptz 
                ELSE '1970-01-01T00:00:00Z'::timestamptz 
             END) < (v_server_timestamps->>key)::timestamptz
        )
        UNION
        SELECT key AS comp_key
        FROM jsonb_each_text(v_server_timestamps)
        WHERE NOT (p_client_timestamps ? key)
    ) comp_diff;

    RETURN jsonb_build_object(
        'stale_components', v_stale_components,
        'server_timestamps', v_server_timestamps,
        'is_wiped', false
    );
END;
$$;

-- Alias get_workspace_last_modified to check_workspace_modifications
CREATE OR REPLACE FUNCTION public.get_workspace_last_modified(
    p_client_timestamps jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN public.check_workspace_modifications(p_client_timestamps);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_workspace_modifications(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_workspace_last_modified(jsonb) TO authenticated, service_role;
