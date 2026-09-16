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

    const { material_id, class_id, event_type = "published", notify_parents } = await req.json();
    if (!material_id || !class_id) {
      return jsonResponse({ error: "Missing material_id or class_id" }, 400);
    }

    // 1. Fetch material and class details
    const { data: material, error: matError } = await adminSupabase
      .from("materials")
      .select("id, name, category, due_at, max_score")
      .eq("id", material_id)
      .single();

    const { data: classItem, error: classError } = await adminSupabase
      .from("classes")
      .select("id, name, teacher_name")
      .eq("id", class_id)
      .single();

    if (matError || classError || !material || !classItem) {
      return jsonResponse({ error: "Material or Class not found" }, 404);
    }

    // 2. Fetch enrolled students
    const { data: enrollments, error: enrollError } = await adminSupabase
      .from("class_students")
      .select("student_id, parent_contact, parent_name, students(id, name, email)")
      .eq("class_id", class_id);

    if (enrollError) {
      return jsonResponse({ error: "Failed to fetch enrolled students" }, 500);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const senderEmail = Deno.env.get("RESEND_FROM_EMAIL") || "updates@teachandlearn.edu";
    const recipients: any[] = [];
    const logEntries: any[] = [];
    const eventVerb = event_type === "updated" ? "Updated" : "New";

    (enrollments || []).forEach((en: any) => {
      const student = en.students;
      if (student?.email) {
        recipients.push({
          from: senderEmail,
          to: [student.email],
          subject: `[${classItem.name}] ${eventVerb} ${material.category}: ${material.name}`,
          html: `<div style="font-family: sans-serif; padding: 20px;">
            <h3>${classItem.name}</h3>
            <h2>${eventVerb} ${material.category}: ${material.name}</h2>
            ${material.due_at ? `<p><strong>Due Date:</strong> ${new Date(material.due_at).toLocaleDateString()}</p>` : ""}
            ${material.max_score ? `<p><strong>Max Points:</strong> ${material.max_score}</p>` : ""}
            <p>Please log in to your Teach&Learn Student Portal to review the coursework details and submit your work.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
            <p style="font-size: 12px; color: #6b7280;">Instructor: ${classItem.teacher_name || "Instructor"}</p>
          </div>`,
        });

        logEntries.push({
          class_id,
          material_id,
          notification_type: event_type === "updated" ? "material_updated" : "material_published",
          recipient_email: student.email,
          recipient_name: student.name,
          recipient_type: "student",
          student_id: student.id,
          status: "queued",
        });
      }
    });

    // 3. Dispatch to Resend Batch if key configured
    if (resendApiKey && recipients.length > 0) {
      try {
        const resendRes = await fetch("https://api.resend.com/emails/batch", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(recipients.slice(0, 100)),
        });

        if (resendRes.ok) {
          const resendData = await resendRes.json();
          if (Array.isArray(resendData.data)) {
            resendData.data.forEach((item: any, idx: number) => {
              if (logEntries[idx] && item.id) {
                logEntries[idx].resend_email_id = item.id;
              }
            });
          }
        }
      } catch (e) {
        console.error("Resend material batch dispatch failed:", e);
      }
    }

    // 4. Record audit logs
    if (logEntries.length > 0) {
      await adminSupabase.from("notification_logs").insert(logEntries);
    }

    return jsonResponse({
      success: true,
      message: `Material notifications processed. ${recipients.length} emails queued.`,
      count: recipients.length,
    });
  } catch (error: any) {
    console.error("Error in notify-material:", error);
    return jsonResponse({ error: error.message || "Internal server error" }, 500);
  }
});
