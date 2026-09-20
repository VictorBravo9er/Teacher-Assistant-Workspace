import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminSupabase } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const { submission_id, class_id } = await req.json();
    if (!submission_id || !class_id) {
      return jsonResponse({ error: "Missing submission_id or class_id" }, 400);
    }

    // 1. Fetch submission details
    const { data: submission, error: subError } = await adminSupabase
      .from("student_submissions")
      .select("id, student_id, material_id, submitted_at, materials(name)")
      .eq("id", submission_id)
      .single();

    if (subError || !submission) {
      return jsonResponse({ error: "Submission not found" }, 404);
    }

    // 2. Fetch class and teacher details
    const { data: classItem, error: classError } = await adminSupabase
      .from("classes")
      .select("id, name, user_id")
      .eq("id", class_id)
      .single();

    if (classError || !classItem) {
      return jsonResponse({ error: "Class not found" }, 404);
    }

    // 3. Fetch student profile
    const { data: student } = await adminSupabase
      .from("students")
      .select("name, email")
      .eq("id", submission.student_id)
      .single();

    // 4. Fetch teacher email from auth.users
    const { data: teacherUser } = await adminSupabase.auth.admin.getUserById(classItem.user_id);
    const teacherEmail = teacherUser?.user?.email;

    const studentName = student?.name || "A student";
    const materialName = (submission as any).materials?.name || "an assignment";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const senderEmail = Deno.env.get("RESEND_FROM_EMAIL") || "updates@teachandlearn.edu";
    let resendEmailId: string | undefined;

    if (resendApiKey && teacherEmail) {
      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: senderEmail,
            to: [teacherEmail],
            ...(student?.email ? { reply_to: student.email } : {}),
            subject: `[Turn-In] ${studentName} submitted ${materialName} (${classItem.name})`,
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h3 style="color: #4F46E5; margin-top: 0;">${classItem.name}</h3>
              <h2>Assignment Submission Received</h2>
              <p><strong>${studentName}</strong> has turned in work for <strong>${materialName}</strong>.</p>
              <p style="font-size: 13px; color: #6B7280;">Submitted on: ${new Date().toLocaleString()}</p>
              <div style="margin-top: 24px;">
                <p>Log in to Teach&Learn LMS to review and score this submission in your grading queue.</p>
              </div>
            </div>`,
          }),
        });

        if (resendRes.ok) {
          const resendData = await resendRes.json();
          resendEmailId = resendData.id;
        }
      } catch (e) {
        console.error("Resend submission notify failed:", e);
      }
    }

    // 5. Audit log in public.notification_logs
    if (teacherEmail) {
      await adminSupabase.from("notification_logs").insert({
        class_id,
        material_id: submission.material_id,
        submission_id,
        notification_type: "submission_turned_in",
        recipient_email: teacherEmail,
        recipient_name: "Instructor",
        recipient_type: "teacher",
        student_id: submission.student_id,
        resend_email_id: resendEmailId,
        status: "queued",
      });
    }

    return jsonResponse({
      success: true,
      message: "Teacher notified of submission turn-in.",
    });
  } catch (error: any) {
    console.error("Error in notify-submission:", error);
    return jsonResponse({ error: error.message || "Internal server error" }, 500);
  }
});
