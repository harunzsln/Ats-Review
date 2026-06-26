-- =============================================================================
-- ATS Review — Security hardening (addresses Supabase advisor warnings)
-- =============================================================================

-- Pin search_path on the status-touch trigger function.
create or replace function public.touch_application_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.status_updated_at := now();
  end if;
  return new;
end;
$$;

-- handle_new_user is only meant to run from the auth.users trigger, not as a
-- public RPC. Revoke EXECUTE from API roles (triggers bypass EXECUTE checks).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
