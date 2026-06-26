-- =============================================================================
-- ATS Review — Row Level Security policies
-- Rule: a user can only read/write rows where auth.uid() = user_id (KVKK §4.5).
-- profiles uses auth.uid() = id (its PK is the user id).
-- Separate policies per command so UPDATE has the required USING + WITH CHECK,
-- and the auth.uid() call is wrapped in a subselect so the planner evaluates it
-- once per query (Supabase RLS performance best practice).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- inserts happen via the security-definer signup trigger; no client INSERT policy.
-- deletes happen via auth.users cascade; no client DELETE policy.

-- ---------------------------------------------------------------------------
-- cv_base
-- ---------------------------------------------------------------------------
create policy "cv_base_select_own" on public.cv_base
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "cv_base_insert_own" on public.cv_base
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "cv_base_update_own" on public.cv_base
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "cv_base_delete_own" on public.cv_base
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- job_postings
-- ---------------------------------------------------------------------------
create policy "job_postings_select_own" on public.job_postings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "job_postings_insert_own" on public.job_postings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "job_postings_update_own" on public.job_postings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "job_postings_delete_own" on public.job_postings
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
create policy "applications_select_own" on public.applications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "applications_insert_own" on public.applications
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "applications_update_own" on public.applications
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "applications_delete_own" on public.applications
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- cv_versions
-- ---------------------------------------------------------------------------
create policy "cv_versions_select_own" on public.cv_versions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "cv_versions_insert_own" on public.cv_versions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "cv_versions_update_own" on public.cv_versions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "cv_versions_delete_own" on public.cv_versions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- interview_simulations
-- ---------------------------------------------------------------------------
create policy "interview_simulations_select_own" on public.interview_simulations
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "interview_simulations_insert_own" on public.interview_simulations
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "interview_simulations_update_own" on public.interview_simulations
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "interview_simulations_delete_own" on public.interview_simulations
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- cold_messages
-- ---------------------------------------------------------------------------
create policy "cold_messages_select_own" on public.cold_messages
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "cold_messages_insert_own" on public.cold_messages
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "cold_messages_update_own" on public.cold_messages
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "cold_messages_delete_own" on public.cold_messages
  for delete to authenticated using ((select auth.uid()) = user_id);
