import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminSupabase } from "../_shared/supabaseAdmin.ts";
import { verifyCallerAuth } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const { class_id, scope_type = "class", selected_ids = [] } = body;

    if (!class_id) {
      return jsonResponse({ error: "Missing required parameter: class_id" }, 400);
    }

    // 1. Verify caller authorization (Teacher or Service Role)
    const authCtx = await verifyCallerAuth(req, class_id);
    if (!authCtx.isAuthorized) {
      return jsonResponse({ error: authCtx.errorMessage || "Forbidden" }, 403);
    }

    // 2. Fetch Class Details & Institute Info
    const { data: classData, error: classError } = await adminSupabase
      .from("classes")
      .select(`
        id,
        name,
        academic_year,
        semester,
        subject,
        teacher_name,
        teaching_style,
        experience_level,
        special_notes,
        assessment_preferences,
        institutes ( name, city, state, country )
      `)
      .eq("id", class_id)
      .maybeSingle();

    if (classError || !classData) {
      return jsonResponse({ error: "Class not found" }, 404);
    }

    // 3. Fetch Class Instructions (Prompts & Rubric Guidelines)
    const { data: instructionsData, error: instError } = await adminSupabase
      .from("class_instructions")
      .select("instructions (*)")
      .eq("class_id", class_id);

    if (instError) throw instError;

    const instructions = (instructionsData || []).map((row: any) => {
      const i = row.instructions || {};
      return {
        id: i.id,
        title: i.title,
        type: i.type,
        content: i.content,
        whenToApply: i.when_to_apply,
      };
    });

    // 4. Fetch Class Materials (Syllabus, Files, Scored Assignments & Rubrics)
    const { data: materialsData, error: matError } = await adminSupabase
      .from("class_materials")
      .select("materials (*)")
      .eq("class_id", class_id);

    if (matError) throw matError;

    const materials = (materialsData || []).map((row: any) => {
      const m = row.materials || {};
      return {
        id: m.id,
        name: m.name,
        category: m.category,
        toBeScored: m.to_be_scored || false,
        dueAt: m.due_at,
        maxScore: m.max_score,
        rubricCriteria: m.rubric_criteria || [],
        tags: m.tags || [],
        contentItems: (m.content || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          path: c.path,
          description: c.description,
        })),
      };
    });

    // 5. Fetch Enrolled Students with Class Portfolio Metadata
    const { data: studentsData, error: studError } = await adminSupabase
      .from("class_students")
      .select(`
        learning_style,
        strengths,
        weaknesses,
        performance_tier,
        current_score,
        current_grade,
        general_feedback,
        behavioral_notes,
        students ( id, name, email, avatar_url )
      `)
      .eq("class_id", class_id);

    if (studError) throw studError;

    // 6. Fetch Submissions & Attendance for context
    const { data: submissionsData, error: subError } = await adminSupabase
      .from("student_submissions")
      .select("*")
      .eq("class_id", class_id);

    if (subError) throw subError;

    const { data: attendanceData, error: attError } = await adminSupabase
      .from("attendance_records")
      .select("*")
      .eq("class_id", class_id);

    if (attError) throw attError;

    const students = (studentsData || []).map((row: any) => {
      const student = row.students || {};
      const studSubs = (submissionsData || []).filter(
        (s: any) => s.student_id === student.id
      );
      const studAtt = (attendanceData || []).filter(
        (a: any) => a.student_id === student.id
      );

      const presentCount = studAtt.filter((a: any) => a.status === "Present").length;
      const lateCount = studAtt.filter((a: any) => a.status === "Late").length;
      const excusedCount = studAtt.filter((a: any) => a.status === "Excused").length;
      const attendanceRate =
        studAtt.length > 0
          ? Math.round(((presentCount + excusedCount + lateCount * 0.5) / studAtt.length) * 100)
          : 100;

      return {
        id: student.id,
        name: student.name || "Unknown Student",
        email: student.email || "",
        learningStyle: row.learning_style || "",
        strengths: row.strengths || [],
        weaknesses: row.weaknesses || [],
        performanceTier: row.performance_tier || "Average",
        currentScore: row.current_score !== null ? Number(row.current_score) : null,
        currentGrade: row.current_grade || null,
        generalFeedback: row.general_feedback || "",
        behavioralNotes: row.behavioral_notes || "",
        attendanceRate,
        submissionsCount: studSubs.length,
        evaluatedCount: studSubs.filter(
          (s: any) => s.score !== null && s.score !== undefined
        ).length,
      };
    });

    // 7. Apply Scoping if requested
    let scopedContext: any = null;
    if (scope_type === "students" && selected_ids.length > 0) {
      scopedContext = {
        type: "students",
        selectedStudents: students.filter((s: any) => selected_ids.includes(s.id)),
        studentSubmissions: (submissionsData || []).filter((sub: any) =>
          selected_ids.includes(sub.student_id)
        ),
      };
    } else if (scope_type === "materials" && selected_ids.length > 0) {
      scopedContext = {
        type: "materials",
        selectedMaterials: materials.filter((m: any) => selected_ids.includes(m.id)),
      };
    } else if (scope_type === "assessments" && selected_ids.length > 0) {
      scopedContext = {
        type: "assessments",
        selectedMaterials: materials.filter(
          (m: any) => m.toBeScored && selected_ids.includes(m.id)
        ),
        submissions: (submissionsData || []).filter((sub: any) =>
          selected_ids.includes(sub.material_id)
        ),
      };
    }

    const institutesObj: any = classData.institutes;
    const instituteAddress = institutesObj
      ? [institutesObj.city, institutesObj.state, institutesObj.country]
          .filter(Boolean)
          .join(", ")
      : "";

    return jsonResponse({
      success: true,
      classContext: {
        id: classData.id,
        name: classData.name,
        subject: classData.subject || "",
        academicYear: classData.academic_year || "",
        semester: classData.semester || "",
        teacherName: classData.teacher_name || "",
        teachingStyle: classData.teaching_style || [],
        experienceLevel: classData.experience_level || "",
        specialNotes: classData.special_notes || "",
        assessmentPreferences: classData.assessment_preferences || [],
        instituteName: institutesObj?.name || "Teach&Learn Academic Workspace",
        instituteAddress,
        instructions,
        materials,
        students,
        totalEnrolled: students.length,
        totalMaterials: materials.length,
        totalInstructions: instructions.length,
        totalSubmissions: (submissionsData || []).length,
        scopedContext,
      },
    });
  } catch (error: any) {
    console.error("Get Class Agent Context Error:", error);
    return jsonResponse({ error: error.message || "Internal Server Error" }, 500);
  }
});
