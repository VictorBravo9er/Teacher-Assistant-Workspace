function parseKey(envVarName: string, fallbackVarName: string): string {
  const val = Deno.env.get(envVarName);
  if (val) {
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed === "object" && parsed !== null && parsed["default"]) {
        return parsed["default"];
      }
      return val;
    } catch {
      return val;
    }
  }
  return Deno.env.get(fallbackVarName) || "";
}

export const supabasePublishableKey = parseKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
export const supabaseSecretKey = parseKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
export const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";

