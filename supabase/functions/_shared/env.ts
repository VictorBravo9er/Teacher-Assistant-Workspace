export const supabasePublishableKey = JSON.parse(
  Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")!,
)["default"];

export const supabaseSecretKey = JSON.parse(
  Deno.env.get("SUPABASE_SECRET_KEYS")!,
)["default"];
export const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
