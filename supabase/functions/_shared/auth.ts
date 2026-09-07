import { adminSupabase } from "./supabaseAdmin.ts";
import { getAuthClient } from "./supabaseClient.ts";
import { supabaseSecretKey } from "./env.ts";

export interface CallerAuthContext {
  isServiceRole: boolean;
  userId?: string;
  isAuthorized: boolean;
  errorMessage?: string;
}

/**
 * Universal authorization helper for Edge Functions.
 * Handles both:
 * 1. FastAPI backend server calls (Bearer SUPABASE_SERVICE_ROLE_KEY)
 * 2. Authenticated frontend user calls (Bearer JWT)
 *
 * If classId is provided, checks if user owns the class or is enrolled in it.
 */
export async function verifyCallerAuth(
  req: Request,
  classId?: string,
): Promise<CallerAuthContext> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return {
      isServiceRole: false,
      isAuthorized: false,
      errorMessage: "Missing Authorization header",
    };
  }

  const token = authHeader.replace("Bearer ", "").trim();

  // 1. Check if caller is using Service Role Key (Backend Server / Admin)
  if (supabaseSecretKey && token === supabaseSecretKey) {
    return {
      isServiceRole: true,
      isAuthorized: true,
    };
  }

  // 2. Otherwise verify user JWT token via request-scoped auth client
  const authClient = getAuthClient(authHeader);
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return {
      isServiceRole: false,
      isAuthorized: false,
      errorMessage: `Unauthorized: ${userError?.message || "Invalid token"}`,
    };
  }

  // 3. If classId is specified, check access permission on the class
  if (classId) {
    // Check if user is the teacher owner
    const { data: ownedClass } = await authClient
      .from("classes")
      .select("id")
      .eq("id", classId)
      .maybeSingle();

    if (ownedClass) {
      return {
        isServiceRole: false,
        userId: user.id,
        isAuthorized: true,
      };
    }

    // Check if user is an enrolled student
    const { data: enrolledStudent } = await authClient
      .from("class_students")
      .select("class_id")
      .eq("class_id", classId)
      .maybeSingle();

    if (enrolledStudent) {
      return {
        isServiceRole: false,
        userId: user.id,
        isAuthorized: true,
      };
    }

    return {
      isServiceRole: false,
      userId: user.id,
      isAuthorized: false,
      errorMessage: "Forbidden: You do not have permission for this class.",
    };
  }

  return {
    isServiceRole: false,
    userId: user.id,
    isAuthorized: true,
  };
}
