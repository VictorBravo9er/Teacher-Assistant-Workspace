import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminSupabase } from "../_shared/supabaseAdmin.ts";
import { getAuthClient } from "../_shared/supabaseClient.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SENDER_EMAIL =
  Deno.env.get("STUDENT_INVITE_FROM_EMAIL") || "signup@teach.glipse.tech";
const NO_REPLY_EMAIL =
  Deno.env.get("STUDENT_INVITE_REPLY_TO") || "no-reply@teach.glipse.tech";
const DEFAULT_APP_URL = "https://teach.glipse.tech";

/**
 * Checks if a given URL string points to a local/loopback environment.
 */
function isLocalhostUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "0.0.0.0" ||
      parsed.hostname.endsWith(".local")
    );
  } catch {
    return (
      urlStr.includes("localhost") ||
      urlStr.includes("127.0.0.1") ||
      urlStr.includes("0.0.0.0")
    );
  }
}

/**
 * Resolves the public application URL for student invitation redirects.
 * Ensures that invite links sent to external recipients never point to localhost/127.0.0.1.
 */
function resolveAppUrl(req: Request): string {
  // 1. Check explicit environment configuration
  const envAppUrl = Deno.env.get("APP_URL") || Deno.env.get("SITE_URL");
  if (envAppUrl && !isLocalhostUrl(envAppUrl)) {
    return envAppUrl.replace(/\/+$/, "");
  }

  // 2. Check incoming request Origin header if it's a valid public domain
  const origin = req.headers.get("origin");
  if (origin && !isLocalhostUrl(origin)) {
    return origin.replace(/\/+$/, "");
  }

  // 3. Fallback to production Teach&Learn domain
  return DEFAULT_APP_URL;
}

/**
 * Sanitizes the generated action_link to ensure redirect_to parameters and
 * verification endpoints never leak internal localhost addresses to students.
 */
function sanitizeActionLink(actionLink: string, targetAppUrl: string): string {
  try {
    const parsed = new URL(actionLink);
    const currentRedirect = parsed.searchParams.get("redirect_to");
    if (!currentRedirect || isLocalhostUrl(currentRedirect)) {
      parsed.searchParams.set("redirect_to", targetAppUrl);
    }

    const publicSupabaseUrl = Deno.env.get("PUBLIC_SUPABASE_URL");
    if (isLocalhostUrl(parsed.origin) && publicSupabaseUrl && !isLocalhostUrl(publicSupabaseUrl)) {
      const publicBase = new URL(publicSupabaseUrl);
      parsed.protocol = publicBase.protocol;
      parsed.host = publicBase.host;
      parsed.port = publicBase.port;
    }

    return parsed.toString();
  } catch {
    return actionLink;
  }
}

/**
 * Dispatches a student onboarding invitation email via Resend
 * with explicitly non-repliable headers and sender address.
 */
async function sendStudentInviteEmail(params: {
  toEmail: string;
  studentName: string;
  className: string;
  teacherName?: string;
  actionLink: string;
}): Promise<string | undefined> {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set; skipping custom invite email dispatch.");
    return undefined;
  }

  const { toEmail, studentName, className, teacherName, actionLink } = params;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: SENDER_EMAIL,
      to: [toEmail],
      reply_to: NO_REPLY_EMAIL,
      headers: {
        "Reply-To": NO_REPLY_EMAIL,
        "Auto-Submitted": "auto-generated",
        "X-Auto-Response-Suppress": "All",
      },
      subject: `Invitation: Join ${className} on Teach&Learn`,
      html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="margin-bottom: 24px;">
          <span style="display: inline-block; padding: 4px 12px; background-color: #eef2ff; color: #4338ca; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Class Invitation</span>
        </div>
        <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0;">You're invited to join ${className}</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">Hello ${studentName || "Student"},</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
          ${teacherName ? `<strong>${teacherName}</strong> has` : "You have been"} invited to join <strong>${className}</strong> on Teach&amp;Learn. Click the button below to accept your invitation and set up your student account.
        </p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="${actionLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">Accept Invitation &amp; Get Started</a>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0 0 24px 0;">
          If the button above does not work, copy and paste this link into your browser:<br/>
          <a href="${actionLink}" style="color: #4f46e5; word-break: break-all;">${actionLink}</a>
        </p>
        <hr style="margin: 32px 0 20px 0; border: none; border-top: 1px solid #e2e8f0;" />
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">
          <strong>Non-repliable notification:</strong> This email was sent from an unmonitored notification account (<code>${SENDER_EMAIL}</code>). Replies to this address will not be received or reviewed. Please do not reply directly to this email.
        </p>
      </div>`,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Resend student invite error response:", errText);
    return undefined;
  }

  const resData = await res.json();
  return resData.id;
}

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

    // ----------------------------------------------------
    // PATCH /invite-student
    // Update Email of Unconfirmed Student
    // ----------------------------------------------------
    if (req.method === "PATCH") {
      const { student_id, new_email, class_id } = await req.json();

      if (!student_id || !new_email || !class_id) {
        return jsonResponse(
          { error: "Missing required fields (student_id, new_email, class_id)" },
          400,
        );
      }

      // Check if authenticated caller owns the class using their own JWT via RLS
      const { data: classData, error: classError } = await authClient
        .from("classes")
        .select("id, name, teacher_name")
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
      const appUrl = resolveAppUrl(req);
      let emailDispatched = false;

      if (RESEND_API_KEY) {
        try {
          const { data: linkData, error: linkError } =
            await adminSupabase.auth.admin.generateLink({
              type: "invite",
              email: new_email,
              options: {
                redirectTo: appUrl,
              },
            });

          if (!linkError && linkData.properties?.action_link) {
            const safeActionLink = sanitizeActionLink(linkData.properties.action_link, appUrl);
            await sendStudentInviteEmail({
              toEmail: new_email,
              studentName: "Student",
              className: classData.name || "your class",
              teacherName: classData.teacher_name,
              actionLink: safeActionLink,
            });
            emailDispatched = true;
          }
        } catch (resendCustomErr) {
          console.warn("Custom invite resend failed, attempting fallback:", resendCustomErr);
        }
      }

      if (!emailDispatched) {
        const { error: resendError } = await adminSupabase.auth.resend({
          type: "invite",
          email: new_email,
          options: {
            emailRedirectTo: appUrl,
          },
        });

        if (resendError) {
          console.warn(
            "Failed to resend invite, attempting signup confirmation resend instead",
            resendError,
          );
          const { error: signupResendError } = await adminSupabase.auth.resend({
            type: "signup",
            email: new_email,
            options: {
              emailRedirectTo: appUrl,
            },
          });
          if (signupResendError) throw signupResendError;
        }
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
        .select("id, name, teacher_name")
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
      let inviteUrl: string | undefined;

      // 2) If they do NOT exist, invite them
      if (!finalStudentId) {
        const appUrl = resolveAppUrl(req);

        if (RESEND_API_KEY) {
          try {
            const { data: linkData, error: linkError } =
              await adminSupabase.auth.admin.generateLink({
                type: "invite",
                email,
                options: {
                  data: {
                    role: "student",
                    full_name: name || "Student",
                  },
                  redirectTo: appUrl,
                },
              });

            if (linkError) throw linkError;

            finalStudentId = linkData.user.id;
            if (linkData.properties?.action_link) {
              inviteUrl = sanitizeActionLink(linkData.properties.action_link, appUrl);
              await sendStudentInviteEmail({
                toEmail: email,
                studentName: name || "Student",
                className: classData.name || "your class",
                teacherName: classData.teacher_name,
                actionLink: inviteUrl,
              });
            }
          } catch (genErr) {
            console.warn(
              "generateLink / Resend invite flow failed, falling back to inviteUserByEmail:",
              genErr,
            );
            const { data: inviteData, error: inviteError } =
              await adminSupabase.auth.admin.inviteUserByEmail(email, {
                data: {
                  role: "student",
                  full_name: name || "Student",
                },
                redirectTo: appUrl,
              });

            if (inviteError) throw inviteError;
            finalStudentId = inviteData.user.id;
          }
        } else {
          // No Resend API key configured; fallback to Supabase standard invite
          const { data: inviteData, error: inviteError } =
            await adminSupabase.auth.admin.inviteUserByEmail(email, {
              data: {
                role: "student",
                full_name: name || "Student",
              },
              redirectTo: appUrl,
            });

          if (inviteError) throw inviteError;
          finalStudentId = inviteData.user.id;
        }
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

      return jsonResponse({
        success: true,
        student_id: finalStudentId,
        ...(inviteUrl ? { invite_url: inviteUrl } : {}),
      });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error: any) {
    console.error("Invite Student Error:", error);
    return jsonResponse({ error: error.message || "Internal Server Error" }, 500);
  }
});
