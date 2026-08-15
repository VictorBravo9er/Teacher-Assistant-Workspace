import { createClient } from "npm:@supabase/supabase-js@2";
import { supabaseSecretKey, supabaseUrl } from "./env.ts";

export const adminSupabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
