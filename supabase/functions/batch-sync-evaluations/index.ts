import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminSupabase } from "../_shared/supabaseAdmin.ts";
import { verifyCallerAuth } from "../_shared/auth.ts";

interface EvaluationItem {
  submission_id?: string;
  student_id: string;
  material_id?: string;
  score: number;
  max_score?: number;
  grade?: string;
  feedback?: string;
  private_teacher_notes?: string;
  rubric_breakdown?: Record<string, any> | any[];
  status?: string;
  content?: any[];
}

function calculateTier(avgScore: number): { tier: string; letterGrade: string } {
  if (avgScore >= 88) return { tier: "High", letterGrade: "A" };
  if (avgScore >= 75) return { tier: "Average", letterGrade: "B" };
  if (avgScore >= 60) return { tier: "Average", letterGrade: "C" };
  return { tier: "At Risk", letterGrade: "D" };
}

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
    const { class_id, evaluations = [] } = body;

    if (!class_id || !Array.isArray(evaluations) || evaluations.length === 0) {
      return jsonResponse(
        { error: "Missing class_id or evaluations array is empty" },
        400,
      );
    }

    // 1. Verify caller authorization (Teacher or Service Role)
    const authCtx = await verifyCallerAuth(req, class_id);
    if (!authCtx.isAuthorized) {
      return jsonResponse({ error: authCtx.errorMessage || "Forbidden" }, 403);
    }

    const affectedStudentIds = new Set<string>();
    let updatedCount = 0;

    // 2. Process each evaluation
    for (const evalItem of evaluations as EvaluationItem[]) {
      if (!evalItem.student_id) continue;

      const studentId = evalItem.student_id;
      affectedStudentIds.add(studentId);

      const targetId =
        evalItem.submission_id && !evalItem.submission_id.startsWith("sub-")
          ? evalItem.submission_id
          : crypto.randomUUID();

      const calculatedGrade =
        evalItem.grade ||
        `${Math.round(
          evalItem.max_score ? (evalItem.score / evalItem.max_score) * 100 : evalItem.score
        )}%`;

      // Check if submission exists
      let existingSub: any = null;
      if (evalItem.submission_id && !evalItem.submission_id.startsWith("sub-")) {
        const { data } = await adminSupabase
          .from("student_submissions")
          .select("id")
          .eq("id", evalItem.submission_id)
          .maybeSingle();
        existingSub = data;
      }

      if (!existingSub && evalItem.material_id) {
        const { data } = await adminSupabase
          .from("student_submissions")
          .select("id")
          .eq("class_id", class_id)
          .eq("student_id", studentId)
          .eq("material_id", evalItem.material_id)
          .maybeSingle();
        existingSub = data;
      }

      const submissionPayload: any = {
        score: evalItem.score,
        grade: calculatedGrade,
        feedback: evalItem.feedback || null,
        private_teacher_notes: evalItem.private_teacher_notes || null,
        rubric_breakdown: evalItem.rubric_breakdown || null,
        status: evalItem.status || "Graded",
        reviewed_at: new Date().toISOString(),
      };

      if (existingSub) {
        const { error: updateErr } = await adminSupabase
          .from("student_submissions")
          .update(submissionPayload)
          .eq("id", existingSub.id);

        if (updateErr) throw updateErr;
        updatedCount++;
      } else {
        // Create new submission
        submissionPayload.id = targetId;
        submissionPayload.class_id = class_id;
        submissionPayload.student_id = studentId;
        submissionPayload.material_id = evalItem.material_id || null;
        submissionPayload.submitted_at = new Date().toISOString();

        // Enforce valid content shape if provided or create synthetic fallback
        submissionPayload.content =
          Array.isArray(evalItem.content) && evalItem.content.length > 0
            ? evalItem.content.map((c: any) => ({
                id: c.id || crypto.randomUUID(),
                name: c.name || "Evaluation Entry",
                type: c.type === "URL" ? "URL" : "File",
                path: c.path || "grade://direct-entry",
                description: c.description || "Submission Turn-in",
              }))
            : [
                {
                  id: crypto.randomUUID(),
                  name: "Evaluation Entry",
                  type: "File",
                  path: "grade://direct-entry",
                  description: "Evaluation review record",
                },
              ];

        const { error: insertErr } = await adminSupabase
          .from("student_submissions")
          .insert(submissionPayload);

        if (insertErr) throw insertErr;
        updatedCount++;
      }
    }

    // 3. Recalculate and update aggregate scores for all affected students in class_students
    const updatedStudentSummaries: Array<{ studentId: string; avgScore: number; tier: string }> = [];

    for (const studentId of affectedStudentIds) {
      const { data: allStudentSubs, error: subsFetchErr } = await adminSupabase
        .from("student_submissions")
        .select("score, grade, max_score")
        .eq("class_id", class_id)
        .eq("student_id", studentId);

      if (subsFetchErr) continue;

      const scoredSubs = (allStudentSubs || []).filter(
        (s: any) => s.score !== null && s.score !== undefined
      );

      if (scoredSubs.length > 0) {
        const totalPct = scoredSubs.reduce((acc: number, s: any) => {
          const max = s.max_score || 100;
          return acc + (Number(s.score) / max) * 100;
        }, 0);

        const avgScore = Math.round(totalPct / scoredSubs.length);
        const { tier, letterGrade } = calculateTier(avgScore);

        await adminSupabase
          .from("class_students")
          .update({
            current_score: avgScore,
            performance_tier: tier,
            current_grade: letterGrade,
          })
          .eq("class_id", class_id)
          .eq("student_id", studentId);

        updatedStudentSummaries.push({ studentId, avgScore, tier });
      }
    }

    return jsonResponse({
      success: true,
      updated_count: updatedCount,
      affected_students: Array.from(affectedStudentIds),
      student_summaries: updatedStudentSummaries,
    });
  } catch (error: any) {
    console.error("Batch Sync Evaluations Error:", error);
    return jsonResponse({ error: error.message || "Internal Server Error" }, 500);
  }
});
