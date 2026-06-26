import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Fallbacks allow `next build` to succeed without .env.local; real values are
// required at runtime in the browser.
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key";

export const supabase: SupabaseClient = createClient(url, anonKey);
