import { createClient } from "npm:@supabase/supabase-js@2";
import { supabasePublishableKey, supabaseUrl } from "./env.ts";

export function getAuthClient(authHeader: string) {
  // Ultimate fallback to user token as API key
  const supabaseAnonKey =
    supabasePublishableKey || authHeader.replace("Bearer ", "");

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}
