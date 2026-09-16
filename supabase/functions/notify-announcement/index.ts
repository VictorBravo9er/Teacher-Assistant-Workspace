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

    const { announcement_id, class_id, notify_parents } = await req.json();
    if (!announcement_id || !class_id) {
      return jsonResponse({ error: "Missing announcement_id or class_id" }, 400);
    }

    // 1. Fetch announcement and class details
    const { data: announcement, error: annError } = await adminSupabase
      .from("announcements")
      .select("id, title, content, is_pinned, classes(id, name, teacher_name, user_id)")
      .eq("id", announcement_id)
      .single();

    if (annError || !announcement) {
      return jsonResponse({ error: "Announcement not found" }, 404);
    }

    const classItem = (announcement as any).classes;

    // 2. Fetch enrolled students and parent contact
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

    (enrollments || []).forEach((en: any) => {
      const student = en.students;
      if (student?.email) {
        recipients.push({
          from: senderEmail,
          to: [student.email],
          subject: `[${classItem.name}] Announcement: ${announcement.title}`,
          html: `<div style="font-family: sans-serif; padding: 20px;">
            <h3>${classItem.name} — Class Announcement</h3>
            <h2>${announcement.title}</h2>
            <p>${announcement.content}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
            <p style="font-size: 12px; color: #6b7280;">Posted by ${classItem.teacher_name || "Instructor"}</p>
          </div>`,
        });

        logEntries.push({
          class_id,
          announcement_id,
          notification_type: "announcement",
          recipient_email: student.email,
          recipient_name: student.name,
          recipient_type: "student",
          student_id: student.id,
          status: "queued",
        });
      }

      if (notify_parents && en.parent_contact && en.parent_contact.includes("@")) {
        recipients.push({
          from: senderEmail,
          to: [en.parent_contact],
          subject: `[${classItem.name}] Announcement for Parents: ${announcement.title}`,
          html: `<div style="font-family: sans-serif; padding: 20px;">
            <h3>${classItem.name} — Announcement for Parents</h3>
            <h2>${announcement.title}</h2>
            <p>${announcement.content}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
            <p style="font-size: 12px; color: #6b7280;">Student: ${student?.name || "Your child"} • Instructor: ${classItem.teacher_name || "Instructor"}</p>
          </div>`,
        });

        logEntries.push({
          class_id,
          announcement_id,
          notification_type: "announcement",
          recipient_email: en.parent_contact,
          recipient_name: en.parent_name || "Parent/Guardian",
          recipient_type: "parent",
          student_id: student?.id,
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
          body: JSON.stringify(recipients.slice(0, 100)), // batch limit 100
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
        console.error("Resend batch dispatch failed:", e);
      }
    }

    // 4. Record audit logs in public.notification_logs
    if (logEntries.length > 0) {
      await adminSupabase.from("notification_logs").insert(logEntries);
    }

    return jsonResponse({
      success: true,
      message: `Announcement notifications processed. ${recipients.length} emails queued.`,
      count: recipients.length,
    });
  } catch (error: any) {
    console.error("Error in notify-announcement:", error);
    return jsonResponse({ error: error.message || "Internal server error" }, 500);
  }
});
