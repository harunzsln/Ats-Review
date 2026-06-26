-- =============================================================================
-- ATS Review — Data retention (KVKK §4.3)
-- Auto-delete accounts inactive for 24+ months. We use pg_cron to call an
-- Edge Function (auto-anonymize) via pg_net. The Edge Function uses the service
-- role to delete the auth.users rows, which cascades to all public.* data.
--
-- Deleting via the Edge Function (rather than a plain SQL delete on auth.users)
-- lets us also revoke sessions and write an audit log in one place.
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Helper view: which accounts are past the 24-month inactivity threshold.
-- security_invoker so it never silently bypasses RLS if exposed.
create or replace view public.inactive_accounts
with (security_invoker = true)
as
  select id, last_active_at
  from public.profiles
  where last_active_at < (now() - interval '24 months');

revoke all on public.inactive_accounts from anon, authenticated;

-- Schedule: run daily at 03:00 UTC. The service_role key + function URL are read
-- from Vault so secrets are not hard-coded in migration history.
--   select vault.create_secret('https://<ref>.functions.supabase.co/auto-anonymize', 'edge_auto_anonymize_url');
--   select vault.create_secret('<service_role_key>', 'edge_service_role_key');
select cron.schedule(
  'auto-anonymize-inactive-accounts',
  '0 3 * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'edge_auto_anonymize_url'),
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_service_role_key')
               ),
    body    := '{}'::jsonb
  );
  $$
);
