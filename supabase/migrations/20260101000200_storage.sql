-- =============================================================================
-- ATS Review — Storage (KVKK §4.5)
-- CV PDFs live in a PRIVATE bucket. Files are only ever reachable through
-- short-lived signed URLs minted by the backend. No public URLs.
--
-- Files are stored under a per-user prefix: "<user_id>/<cv_base_id>.pdf".
-- The first path segment must equal the caller's auth.uid().
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cv-files', 'cv-files', false, 10485760, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Upsert needs INSERT + SELECT + UPDATE (Supabase storage gotcha).
create policy "cv_files_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cv-files'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "cv_files_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'cv-files'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "cv_files_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'cv-files'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'cv-files'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "cv_files_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'cv-files'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
