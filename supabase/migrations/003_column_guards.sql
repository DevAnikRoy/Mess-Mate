-- Clients may only rename themselves; avatar and email come from the auth provider.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, updated_at) on public.profiles to authenticated;
drop policy if exists "profiles_insert_own" on public.profiles;

alter table public.profiles drop constraint if exists profiles_full_name_len;
alter table public.profiles
  add constraint profiles_full_name_len check (full_name is null or char_length(full_name) <= 120) not valid;

-- Managers edit the name and meal slots; ownership and invite codes go through RPCs.
revoke insert, update, delete on public.messes from anon, authenticated;
grant update (name, breakfast, lunch, dinner) on public.messes to authenticated;

revoke insert, update, delete on public.memberships from anon, authenticated;
revoke insert, update, delete on public.month_approvals from anon, authenticated;
