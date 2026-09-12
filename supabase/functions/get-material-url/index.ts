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

    const body = await req.json();
    const { material_id, class_id } = body;
    const targetContentId = body.content_item_id || body.content_id;

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
      // Check if they are an enrolled student via RLS on class_students
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

    // 3. Verify material is attached to the requested class & fetch custom_content
    const { data: classMaterialLink } = await adminSupabase
      .from("class_materials")
      .select("material_id, custom_content")
      .eq("class_id", class_id)
      .eq("material_id", material_id)
      .maybeSingle();

    if (!classMaterialLink) {
      return jsonResponse(
        { error: "Material is not attached to the specified class" },
        404,
      );
    }

    // 4. Fetch canonical material content JSONB array
    const { data: material, error: materialError } = await adminSupabase
      .from("materials")
      .select("id, name, category, content")
      .eq("id", material_id)
      .maybeSingle();

    if (materialError || !material) {
      return jsonResponse({ error: "Material not found" }, 404);
    }

    const canonicalContent = Array.isArray(material.content) ? material.content : [];
    const customContent = Array.isArray(classMaterialLink.custom_content) ? classMaterialLink.custom_content : [];
    const contentArray = [...canonicalContent, ...customContent];

    if (contentArray.length === 0) {
      return jsonResponse(
        { error: "No content items found for this material" },
        404,
      );
    }

    // 5. Locate target content item in TypeScript
    const item = targetContentId
      ? contentArray.find((c: any) => c.id === targetContentId)
      : contentArray.find((c: any) => c.type === "File") || contentArray[0];

    if (!item) {
      return jsonResponse(
        { error: `Content item '${targetContentId}' not found in material` },
        404,
      );
    }

    // If external URL, return direct link
    if (
      item.type === "URL" ||
      item.path?.startsWith("http://") ||
      item.path?.startsWith("https://")
    ) {
      return jsonResponse({
        signedUrl: item.path,
        materialId: material_id,
        contentItemId: item.id,
        path: item.path,
        name: item.name,
        type: item.type,
        items: [
          {
            id: item.id,
            name: item.name,
            signedUrl: item.path,
            path: item.path,
          },
        ],
      });
    }

    if (!item.path) {
      return jsonResponse(
        { error: "Material content item path is missing" },
        404,
      );
    }

    // 6. Generate signed URL from 'class-materials' bucket (1 hour / 3600s expiry)
    const { data: signedData, error: signedError } = await adminSupabase.storage
      .from("class-materials")
      .createSignedUrl(item.path, 3600);

    if (signedError || !signedData?.signedUrl) {
      throw signedError || new Error("Failed to generate signed URL");
    }

    return jsonResponse({
      signedUrl: signedData.signedUrl,
      materialId: material_id,
      contentItemId: item.id,
      path: item.path,
      name: item.name,
      type: item.type,
      items: [
        {
          id: item.id,
          name: item.name,
          signedUrl: signedData.signedUrl,
          path: item.path,
        },
      ],
    });
  } catch (error: any) {
    console.error("Get Material URL Error:", error);
    return jsonResponse({ error: error.message || "Internal Server Error" }, 500);
  }
});
