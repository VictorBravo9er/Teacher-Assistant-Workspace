import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminSupabase } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const type = payload?.type; // e.g. "email.delivered", "email.bounced"
    const emailData = payload?.data;
    const resendEmailId = emailData?.email_id || emailData?.id;

    if (!resendEmailId) {
      return jsonResponse({ message: "No resend email ID found in webhook payload" }, 200);
    }

    if (type === "email.delivered") {
      await adminSupabase
        .from("notification_logs")
        .update({
          status: "delivered",
          updated_at: new Date().toISOString(),
        })
        .eq("resend_email_id", resendEmailId);
    } else if (type === "email.bounced" || type === "email.failed") {
      const errorMsg = emailData?.bounce?.message || "Delivery bounced or rejected by MTA";

      // 1. Update log status
      const { data: updatedLogs } = await adminSupabase
        .from("notification_logs")
        .update({
          status: "bounced",
          error_message: errorMsg,
          updated_at: new Date().toISOString(),
        })
        .eq("resend_email_id", resendEmailId)
        .select("id, class_id, recipient_email, recipient_name, recipient_type, classes(name, user_id)");

      const log = updatedLogs && updatedLogs[0];
      if (log) {
        const classItem = (log as any).classes;
        if (classItem?.user_id) {
          const { data: teacherUser } = await adminSupabase.auth.admin.getUserById(classItem.user_id);
          const teacherEmail = teacherUser?.user?.email;
          const resendApiKey = Deno.env.get("RESEND_API_KEY");
          const senderEmail = Deno.env.get("RESEND_FROM_EMAIL") || "alerts@teachandlearn.edu";

          // 2. Dispatch automated alert email to teacher's inbox
          if (resendApiKey && teacherEmail) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: senderEmail,
                to: [teacherEmail],
                subject: `[Delivery Failure] Notification undelivered to ${log.recipient_name || log.recipient_email} (${classItem.name})`,
                html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #fee2e2; border-radius: 8px;">
                  <h3 style="color: #dc2626;">Email Notification Undelivered</h3>
                  <p>An automated notification for class <strong>${classItem.name}</strong> could not be delivered to:</p>
                  <ul>
                    <li><strong>Recipient:</strong> ${log.recipient_name || "Unknown"} (${log.recipient_type})</li>
                    <li><strong>Email:</strong> ${log.recipient_email}</li>
                    <li><strong>Reason:</strong> ${errorMsg}</li>
                  </ul>
                  <p>Please update this student's contact details in your class roster.</p>
                </div>`,
              }),
            });
          }
        }
      }
    }

    return jsonResponse({ received: true });
  } catch (error: any) {
    console.error("Error in resend-webhook:", error);
    return jsonResponse({ error: error.message || "Webhook processing failed" }, 500);
  }
});
