import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminSupabase } from "../_shared/supabaseAdmin.ts";
import { getAuthClient } from "../_shared/supabaseClient.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify caller authentication via Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    // Client for checking caller auth via RLS (Request-scoped)
    const authClient = getAuthClient(authHeader);

    const url = new URL(req.url);
    const path = url.pathname;

    // ----------------------------------------------------
    // PATCH /invite-student
    // Update Email of Unconfirmed Student
    // ----------------------------------------------------
    if (req.method === "PATCH") {
      const { student_id, new_email, class_id } = await req.json();

      if (!student_id || !new_email || !class_id) {
        return jsonResponse({ error: "Missing required fields (student_id, new_email, class_id)" }, 400);
      }

      // Check if authenticated caller owns the class using their own JWT via RLS
      const { data: classData, error: classError } = await authClient
        .from("classes")
        .select("id")
        .eq("id", class_id)
        .maybeSingle();

      if (classError || !classData) {
        return jsonResponse({ error: "Forbidden: You do not own this class." }, 403);
      }

      // 1) Update email (Admin API) — triggers handle_user_update in Postgres.
      const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
        student_id,
        { email: new_email },
      );
      if (updateError) throw updateError;

      // 2) Resend confirmation/invite email to the new address.
      const { error: resendError } = await adminSupabase.auth.resend({
        type: "invite",
        email: new_email,
      });

      if (resendError) {
        console.warn(
          "Failed to resend invite, attempting signup confirmation resend instead",
          resendError,
        );
        const { error: signupResendError } = await adminSupabase.auth.resend({
          type: "signup",
          email: new_email,
        });
        if (signupResendError) throw signupResendError;
      }

      return jsonResponse({ success: true });
    }

    // ----------------------------------------------------
    // POST /invite-student
    // Add existing or invite new student
    // ----------------------------------------------------
    if (req.method === "POST") {
      const {
        email,
        name,
        class_id,
        learning_style,
        strengths,
        weaknesses,
        performance_tier,
        current_score,
        current_grade,
        general_feedback,
        behavioral_notes,
      } = await req.json();

      if (!email || !class_id) {
        return jsonResponse({ error: "Missing email or class_id" }, 400);
      }

      // Check if authenticated caller owns the class using their own JWT via RLS
      const { data: classData, error: classError } = await authClient
        .from("classes")
        .select("id")
        .eq("id", class_id)
        .maybeSingle();

      if (classError || !classData) {
        return jsonResponse({ error: "Forbidden: You do not own this class." }, 403);
      }

      // 1) Check if user already exists (students mirror table for speed)
      const { data: existingStudent, error: existingError } = await adminSupabase
        .from("students")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingError) throw existingError;

      const studentId = existingStudent?.id as string | undefined;

      let finalStudentId = studentId;

      // 2) If they do NOT exist, invite them
      if (!finalStudentId) {
        const { data: inviteData, error: inviteError } =
          await adminSupabase.auth.admin.inviteUserByEmail(email, {
            data: {
              role: "student",
              full_name: name || "Student",
            },
          });

        if (inviteError) throw inviteError;
        finalStudentId = inviteData.user.id;
      }

      // 3) Link them to the class via RPC (updates if they already exist)
      const { error: rpcError } = await adminSupabase.rpc("add_student_to_class", {
        p_class_id: class_id,
        p_student_id: finalStudentId,
        p_learning_style: learning_style ?? null,
        p_strengths: strengths ?? null,
        p_weaknesses: weaknesses ?? null,
        p_performance_tier: performance_tier ?? null,
        p_current_score: current_score ?? null,
        p_current_grade: current_grade ?? null,
        p_general_feedback: general_feedback ?? null,
        p_behavioral_notes: behavioral_notes ?? null,
      });

      if (rpcError) throw rpcError;

      return jsonResponse({ success: true, student_id: finalStudentId });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error: any) {
    console.error("Invite Student Error:", error);
    return jsonResponse({ error: error.message || "Internal Server Error" }, 500);
  }
});
