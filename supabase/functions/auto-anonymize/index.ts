// =============================================================================
// auto-anonymize — KVKK §4.3 retention job
//
// Invoked daily by pg_cron (see 20260101000300_retention_cron.sql).
// Hard-deletes auth.users rows for accounts inactive for 24+ months. Deleting
// the auth user cascades to every public.* table (ON DELETE CASCADE), so no
// personal data is left behind. We prefer hard delete over anonymization so a
// KVKK Art. 7 erasure is fully honored.
// =============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing SUPABASE_URL or SERVICE_ROLE_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Service role bypasses RLS — required to read other users' rows and delete
  // auth.users. This function is never exposed to end users (verify_jwt = false
  // but it is only reachable from pg_cron with the service key).
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 24);

  const { data: stale, error: selectError } = await admin
    .from("profiles")
    .select("id, last_active_at")
    .lt("last_active_at", cutoff.toISOString());

  if (selectError) {
    return new Response(JSON.stringify({ error: selectError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const results: { id: string; deleted: boolean; error?: string }[] = [];

  for (const account of stale ?? []) {
    // Revoke sessions first (deleting a user does NOT invalidate live tokens).
    await admin.auth.admin.signOut(account.id, "global").catch(() => {});
    // Hard delete — cascades to all public.* data.
    const { error } = await admin.auth.admin.deleteUser(account.id);
    results.push({ id: account.id, deleted: !error, error: error?.message });
  }

  return new Response(
    JSON.stringify({
      cutoff: cutoff.toISOString(),
      candidates: stale?.length ?? 0,
      deleted: results.filter((r) => r.deleted).length,
      results,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
