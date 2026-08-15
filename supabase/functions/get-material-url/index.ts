import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminSupabase } from "../_shared/supabaseAdmin.ts";
import { getAuthClient } from "../_shared/supabaseClient.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // 1. Verify caller via authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    // Client for checking caller auth via RLS (Request-scoped)
    const authClient = getAuthClient(authHeader);

    const { material_id, class_id } = await req.json();
    if (!material_id || !class_id) {
      return jsonResponse({ error: "Missing material_id or class_id" }, 400);
    }

    // 2. Check authorization: Is caller the teacher owner OR an enrolled student?
    // Using RLS, the authClient will only return a class if the user is the owner (via the select policy on classes)
    const { data: isTeacher } = await authClient
      .from("classes")
      .select("id")
      .eq("id", class_id)
      .maybeSingle();

    let isAuthorized = !!isTeacher;

    if (!isAuthorized) {
      // Check if they are a student via RLS on class_students (or just let RLS filter class_students)
      const { data: isEnrolledStudent } = await authClient
        .from("class_students")
        .select("class_id")
        .eq("class_id", class_id)
        .maybeSingle();

      if (isEnrolledStudent) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return jsonResponse(
        {
          error:
            "Forbidden: You are not enrolled in this class or the owner of this material.",
        },
        403,
      );
    }

    // 3. Fetch material info to get the path
    const { data: material, error: materialError } = await adminSupabase
      .from("materials")
      .select("path")
      .eq("id", material_id)
      .maybeSingle();

    if (materialError || !material || !material.path) {
      return jsonResponse(
        { error: "Material not found or path missing" },
        404,
      );
    }

    // 4. Generate signed URL
    const { data: signedData, error: signedError } = await adminSupabase
      .storage
      .from("class-materials")
      .createSignedUrl(material.path, 3600); // 1 hour expiry

    if (signedError || !signedData?.signedUrl) {
      throw signedError || new Error("Failed to generate signed URL");
    }

    return jsonResponse({
      signedUrl: signedData.signedUrl,
      materialId: material_id,
      path: material.path,
    });
  } catch (error: any) {
    console.error("Get Material URL Error:", error);
    return jsonResponse({ error: error.message || "Internal Server Error" }, 500);
  }
});
