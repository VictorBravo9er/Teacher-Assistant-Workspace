-- ============================================================================
-- Teach&Learn: Core Baseline Functions, Triggers, and RPCs
-- Timestamp: 20260915100300
-- ============================================================================

-- 1. Baseline Trigger Functions & Triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  IF (new.raw_user_meta_data->>'role') = 'student' OR (new.raw_user_meta_data->>'role') IS NULL THEN
    INSERT INTO public.students (id, name, email)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'full_name', 'Unknown Student'),
      new.email
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger AS $$
BEGIN
  IF (new.raw_user_meta_data->>'role') = 'student' OR (new.raw_user_meta_data->>'role') IS NULL THEN
    IF old.email IS DISTINCT FROM new.email OR old.raw_user_meta_data->>'full_name' IS DISTINCT FROM new.raw_user_meta_data->>'full_name' THEN
      UPDATE public.students
      SET email = new.email,
          name = COALESCE(new.raw_user_meta_data->>'full_name', name)
      WHERE id = new.id;
    END IF;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_update();

CREATE OR REPLACE FUNCTION auto_set_to_be_scored()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.category IN ('Practical', 'Assignment', 'Test', 'Exam') THEN
        NEW.to_be_scored := true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_set_to_be_scored ON public.materials;
CREATE TRIGGER trg_auto_set_to_be_scored
BEFORE INSERT OR UPDATE ON public.materials
FOR EACH ROW EXECUTE FUNCTION auto_set_to_be_scored();

CREATE OR REPLACE FUNCTION public.sync_student_class_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
    v_avg_score NUMERIC;
    v_tier TEXT;
    v_grade TEXT;
BEGIN
    v_class_id := COALESCE(NEW.class_id, OLD.class_id);
    v_student_id := COALESCE(NEW.student_id, OLD.student_id);

    SELECT 
        ROUND(AVG((score / NULLIF(COALESCE(m.max_score, 100), 0)) * 100), 2)
    INTO v_avg_score
    FROM public.student_submissions s
    LEFT JOIN public.materials m ON s.material_id = m.id
    WHERE s.class_id = v_class_id
      AND s.student_id = v_student_id
      AND s.score IS NOT NULL;

    IF v_avg_score IS NULL THEN
        v_tier := 'Average';
        v_grade := NULL;
    ELSIF v_avg_score >= 88 THEN
        v_tier := 'High';
        v_grade := 'A';
    ELSIF v_avg_score >= 75 THEN
        v_tier := 'Average';
        v_grade := 'B';
    ELSIF v_avg_score >= 60 THEN
        v_tier := 'Average';
        v_grade := 'C';
    ELSE
        v_tier := 'At Risk';
        v_grade := 'D';
    END IF;

    UPDATE public.class_students
    SET current_score = v_avg_score,
        current_grade = v_grade,
        performance_tier = v_tier
    WHERE class_id = v_class_id
      AND student_id = v_student_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_student_scores ON public.student_submissions;
CREATE TRIGGER trg_sync_student_scores
AFTER INSERT OR UPDATE OF score, class_id, student_id OR DELETE
ON public.student_submissions
FOR EACH ROW EXECUTE FUNCTION public.sync_student_class_scores();

-- 2. Baseline Functions & RPCs
CREATE OR REPLACE FUNCTION search_institutes(search_term TEXT)
RETURNS SETOF public.institutes
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
BEGIN
  IF trim(search_term) = '' THEN
    RETURN QUERY SELECT * FROM public.institutes ORDER BY created_at DESC LIMIT 5;
  ELSE
    RETURN QUERY
      SELECT * FROM public.institutes
      WHERE
        word_similarity(search_term, name) > 0.1 OR
        word_similarity(search_term, city) > 0.1 OR
        word_similarity(search_term, district) > 0.1 OR
        word_similarity(search_term, state) > 0.1
      ORDER BY
        GREATEST(
          word_similarity(search_term, name),
          word_similarity(search_term, city),
          word_similarity(search_term, district),
          word_similarity(search_term, state)
        ) DESC
      LIMIT 5;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION search_districts(search_term TEXT) RETURNS TABLE(result TEXT) LANGUAGE sql SECURITY INVOKER SET search_path = public, extensions AS $$ SELECT district FROM public.institutes WHERE district IS NOT NULL AND district != '' AND word_similarity(search_term, district) > 0.1 GROUP BY district ORDER BY word_similarity(search_term, district) DESC LIMIT 5; $$;
CREATE OR REPLACE FUNCTION search_cities(search_term TEXT) RETURNS TABLE(result TEXT) LANGUAGE sql SECURITY INVOKER SET search_path = public, extensions AS $$ SELECT city FROM public.institutes WHERE city IS NOT NULL AND city != '' AND word_similarity(search_term, city) > 0.1 GROUP BY city ORDER BY word_similarity(search_term, city) DESC LIMIT 5; $$;
CREATE OR REPLACE FUNCTION search_states(search_term TEXT) RETURNS TABLE(result TEXT) LANGUAGE sql SECURITY INVOKER SET search_path = public, extensions AS $$ SELECT state FROM public.institutes WHERE state IS NOT NULL AND state != '' AND word_similarity(search_term, state) > 0.1 GROUP BY state ORDER BY word_similarity(search_term, state) DESC LIMIT 5; $$;
CREATE OR REPLACE FUNCTION search_countries(search_term TEXT) RETURNS TABLE(result TEXT) LANGUAGE sql SECURITY INVOKER SET search_path = public, extensions AS $$ SELECT country FROM public.institutes WHERE country IS NOT NULL AND country != '' AND word_similarity(search_term, country) > 0.1 GROUP BY country ORDER BY word_similarity(search_term, country) DESC LIMIT 5; $$;

CREATE OR REPLACE FUNCTION update_material_contents(p_table_name text, p_record_id uuid, p_diff_array jsonb)
RETURNS text[] LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
    v_deleted_paths text[] := ARRAY[]::text[];
    v_diff_item jsonb; v_existing_content jsonb; v_new_content jsonb := '[]'::jsonb;
    v_existing_item jsonb; v_found boolean;
BEGIN
    IF p_table_name = 'materials' THEN SELECT content INTO v_existing_content FROM public.materials WHERE id = p_record_id;
    ELSIF p_table_name = 'student_submissions' THEN SELECT content INTO v_existing_content FROM public.student_submissions WHERE id = p_record_id;
    ELSE RAISE EXCEPTION 'Invalid table name.'; END IF;

    IF v_existing_content IS NULL THEN RETURN v_deleted_paths; END IF;

    FOR v_existing_item IN SELECT * FROM jsonb_array_elements(v_existing_content) LOOP
        v_found := false;
        FOR v_diff_item IN SELECT * FROM jsonb_array_elements(p_diff_array) LOOP
            IF jsonb_typeof(v_diff_item) = 'string' AND v_diff_item#>>'{}' = v_existing_item->>'id' THEN
                v_found := true;
                IF v_existing_item->>'type' = 'File' THEN v_deleted_paths := array_append(v_deleted_paths, v_existing_item->>'path'); END IF;
                EXIT;
            END IF;
        END LOOP;
        IF NOT v_found THEN v_new_content := v_new_content || v_existing_item; END IF;
    END LOOP;

    FOR v_diff_item IN SELECT * FROM jsonb_array_elements(p_diff_array) LOOP
        IF jsonb_typeof(v_diff_item) = 'object' THEN v_new_content := v_new_content || v_diff_item; END IF;
    END LOOP;

    IF p_table_name = 'materials' THEN UPDATE public.materials SET content = v_new_content WHERE id = p_record_id;
    ELSIF p_table_name = 'student_submissions' THEN UPDATE public.student_submissions SET content = v_new_content WHERE id = p_record_id;
    END IF;
    RETURN v_deleted_paths;
END;
$$;

CREATE OR REPLACE FUNCTION add_student_to_class(
    p_class_id UUID, p_student_id UUID, p_learning_style TEXT, p_strengths TEXT[],
    p_weaknesses TEXT[], p_performance_tier TEXT, p_current_score NUMERIC,
    p_current_grade TEXT, p_general_feedback TEXT, p_behavioral_notes TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
    INSERT INTO public.class_students (class_id, student_id, performance_tier, current_score, current_grade, learning_style, strengths, weaknesses, general_feedback, behavioral_notes)
    VALUES (p_class_id, p_student_id, p_performance_tier, p_current_score, p_current_grade, p_learning_style, p_strengths, p_weaknesses, p_general_feedback, p_behavioral_notes)
    ON CONFLICT (class_id, student_id) DO UPDATE SET
        performance_tier = COALESCE(EXCLUDED.performance_tier, public.class_students.performance_tier),
        current_score = COALESCE(EXCLUDED.current_score, public.class_students.current_score),
        current_grade = COALESCE(EXCLUDED.current_grade, public.class_students.current_grade),
        learning_style = COALESCE(EXCLUDED.learning_style, public.class_students.learning_style),
        strengths = COALESCE(EXCLUDED.strengths, public.class_students.strengths),
        weaknesses = COALESCE(EXCLUDED.weaknesses, public.class_students.weaknesses),
        general_feedback = COALESCE(EXCLUDED.general_feedback, public.class_students.general_feedback),
        behavioral_notes = COALESCE(EXCLUDED.behavioral_notes, public.class_students.behavioral_notes);
    RETURN p_student_id;
END;
$$;

CREATE OR REPLACE FUNCTION unlink_material_from_class(p_class_id UUID, p_material_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM public.class_materials 
    WHERE class_id = p_class_id AND material_id = p_material_id;
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION archive_material(p_material_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    UPDATE public.materials
    SET is_archived = true
    WHERE id = p_material_id;
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION delete_submission_atomic(p_submission_id UUID)
RETURNS text[]
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_deleted_paths text[] := ARRAY[]::text[];
    v_item jsonb;
BEGIN
    FOR v_item IN SELECT jsonb_array_elements(content) FROM public.student_submissions WHERE id = p_submission_id LOOP
        IF v_item->>'type' = 'File' AND v_item->>'path' IS NOT NULL 
           AND NOT (v_item->>'path' LIKE 'text://%' OR v_item->>'path' LIKE 'grade://%') THEN
            v_deleted_paths := array_append(v_deleted_paths, v_item->>'path');
        END IF;
    END LOOP;

    DELETE FROM public.student_submissions WHERE id = p_submission_id;
    RETURN v_deleted_paths;
END;
$$;

CREATE OR REPLACE FUNCTION delete_material(p_material_id uuid) RETURNS text[] LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
    v_deleted_paths text[] := ARRAY[]::text[];
    v_item jsonb;
    v_submission_count int;
    v_other_ref_count int;
BEGIN
    SELECT count(*) INTO v_submission_count FROM public.student_submissions WHERE material_id = p_material_id;
    IF v_submission_count > 0 THEN 
        RAISE EXCEPTION 'Cannot hard-delete material. There are % student submissions attached. Please archive the material or unlink it from the class instead.', v_submission_count; 
    END IF;

    FOR v_item IN SELECT jsonb_array_elements(content) FROM public.materials WHERE id = p_material_id LOOP
        IF v_item->>'type' = 'File' AND v_item->>'path' IS NOT NULL 
           AND NOT (v_item->>'path' LIKE 'text://%' OR v_item->>'path' LIKE 'grade://%') THEN
            
            SELECT (
                (SELECT count(*) FROM public.materials m, jsonb_array_elements(m.content) elem WHERE m.id <> p_material_id AND elem->>'path' = v_item->>'path') +
                (SELECT count(*) FROM public.class_materials cm, jsonb_array_elements(cm.custom_content) elem WHERE cm.material_id <> p_material_id AND elem->>'path' = v_item->>'path') +
                (SELECT count(*) FROM public.template_materials tm, jsonb_array_elements(tm.custom_content) elem WHERE tm.material_id <> p_material_id AND elem->>'path' = v_item->>'path')
            ) INTO v_other_ref_count;

            IF v_other_ref_count = 0 THEN
                v_deleted_paths := array_append(v_deleted_paths, v_item->>'path');
            END IF;
        END IF;
    END LOOP;

    DELETE FROM public.materials WHERE id = p_material_id;
    RETURN v_deleted_paths;
END;
$$;
