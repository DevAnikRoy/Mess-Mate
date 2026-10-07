-- Mess data lives here. Every table is scoped by mess_id and guarded by RLS.
-- Helpers sit in the private schema so the API cannot call them directly.

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.dhaka_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (pg_catalog.now() at time zone 'Asia/Dhaka')::date
$$;

-- A month stays editable until the 20th of the next month (Dhaka).
create or replace function private.month_open(d date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.dhaka_today()
    <= (pg_catalog.date_trunc('month', d::timestamp) + interval '1 month 19 days')::date
$$;

-- Messes ---------------------------------------------------------------------

alter table public.messes drop constraint if exists messes_owner_id_fkey;
alter table public.messes alter column owner_id drop not null;
alter table public.messes
  add constraint messes_owner_id_fkey
  foreign key (owner_id) references public.profiles (id) on delete set null;

alter table public.messes
  add column if not exists breakfast boolean not null default true,
  add column if not exists lunch boolean not null default true,
  add column if not exists dinner boolean not null default true,
  add column if not exists invite_code text not null
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

alter table public.messes add constraint messes_one_slot check (breakfast or lunch or dinner);
alter table public.messes add constraint messes_name_length check (char_length(btrim(name)) between 1 and 60);
create unique index if not exists messes_invite_code_key on public.messes (invite_code);

-- Memberships ----------------------------------------------------------------

alter table public.memberships
  add column if not exists joined_on date not null default private.dhaka_today(),
  add column if not exists left_on date;

create unique index if not exists memberships_one_active
  on public.memberships (user_id) where left_on is null;
create index if not exists memberships_user_idx on public.memberships (user_id);

create or replace function private.is_member(m uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships
    where mess_id = m and user_id = (select auth.uid()) and left_on is null
  )
$$;

create or replace function private.is_manager(m uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships
    where mess_id = m and user_id = (select auth.uid()) and left_on is null and role = 'manager'
  )
$$;

-- Past members stay in old months, so this ignores left_on.
create or replace function private.belongs(m uuid, u uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.memberships where mess_id = m and user_id = u)
$$;

create or replace function private.shares_mess(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.mess_id = mine.mess_id
    where mine.user_id = (select auth.uid())
      and mine.left_on is null
      and theirs.user_id = other
  )
$$;

-- Own row on the same Dhaka day, or the manager inside the edit window.
create or replace function private.can_log(m uuid, u uuid, d date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.belongs(m, u)
    and d <= private.dhaka_today()
    and (
      (u = (select auth.uid()) and d = private.dhaka_today() and private.is_member(m))
      or (private.is_manager(m) and private.month_open(d))
    )
$$;

create or replace function private.can_fix(m uuid, d date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_manager(m) and private.month_open(d) and d <= private.dhaka_today()
$$;

-- Profiles: co-members see name and picture, never email -------------------

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_shared"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id or private.shares_mess(id));

revoke select on public.profiles from anon, authenticated;
grant select (id, full_name, avatar_url, updated_at) on public.profiles to authenticated;

drop policy if exists "mess_select_member" on public.messes;
drop policy if exists "mess_insert_owner" on public.messes;
drop policy if exists "membership_select_own" on public.memberships;

create policy "messes_select_member"
  on public.messes for select to authenticated
  using (private.is_member(id));

create policy "messes_update_manager"
  on public.messes for update to authenticated
  using (private.is_manager(id))
  with check (private.is_manager(id));

create policy "memberships_select_mess"
  on public.memberships for select to authenticated
  using (private.is_member(mess_id));

-- Activity tables ------------------------------------------------------------

create table if not exists public.meals (
  mess_id uuid not null references public.messes (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  day date not null,
  breakfast boolean not null default false,
  lunch boolean not null default false,
  dinner boolean not null default false,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  primary key (mess_id, user_id, day)
);
create index if not exists meals_mess_day on public.meals (mess_id, day);

create table if not exists public.kitchen_closed (
  mess_id uuid not null references public.messes (id) on delete cascade,
  day date not null,
  closed_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (mess_id, day)
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes (id) on delete cascade,
  host_id uuid not null references public.profiles (id),
  day date not null,
  slot text not null check (slot in ('b', 'l', 'd')),
  count integer not null check (count between 1 and 20),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists guests_mess_day on public.guests (mess_id, day);

create table if not exists public.bazaar (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  day date not null,
  note text not null default '' check (char_length(note) <= 2000),
  amount numeric(12, 2) not null check (amount > 0 and amount < 10000000),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bazaar_mess_day on public.bazaar (mess_id, day);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  day date not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  amount numeric(12, 2) not null check (amount > 0 and amount < 10000000),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists expenses_mess_day on public.expenses (mess_id, day);

create table if not exists public.duties (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  day date not null,
  user_id uuid not null references public.profiles (id),
  kind text not null default 'custom' check (kind in ('bathroom', 'custom')),
  done_at timestamptz,
  done_by uuid,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists duties_mess_day on public.duties (mess_id, day);

create table if not exists public.month_approvals (
  mess_id uuid not null references public.messes (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  approved_by uuid,
  approved_at timestamptz not null default now(),
  primary key (mess_id, month)
);

alter table public.meals enable row level security;
alter table public.kitchen_closed enable row level security;
alter table public.guests enable row level security;
alter table public.bazaar enable row level security;
alter table public.expenses enable row level security;
alter table public.duties enable row level security;
alter table public.month_approvals enable row level security;

-- Meals
create policy "meals_select" on public.meals for select to authenticated
  using (private.is_member(mess_id));
create policy "meals_insert" on public.meals for insert to authenticated
  with check (private.can_log(mess_id, user_id, day));
create policy "meals_update" on public.meals for update to authenticated
  using (private.can_log(mess_id, user_id, day))
  with check (private.can_log(mess_id, user_id, day));
create policy "meals_delete" on public.meals for delete to authenticated
  using (private.can_log(mess_id, user_id, day));

-- Kitchen closed: anyone today, manager afterwards
create policy "kitchen_select" on public.kitchen_closed for select to authenticated
  using (private.is_member(mess_id));
create policy "kitchen_insert" on public.kitchen_closed for insert to authenticated
  with check (private.is_member(mess_id) and (day = private.dhaka_today() or private.can_fix(mess_id, day)));
create policy "kitchen_delete" on public.kitchen_closed for delete to authenticated
  using (private.is_member(mess_id) and (day = private.dhaka_today() or private.can_fix(mess_id, day)));

-- Guests count on the host
create policy "guests_select" on public.guests for select to authenticated
  using (private.is_member(mess_id));
create policy "guests_insert" on public.guests for insert to authenticated
  with check (created_by = (select auth.uid()) and private.can_log(mess_id, host_id, day));
create policy "guests_delete" on public.guests for delete to authenticated
  using (private.can_log(mess_id, host_id, day));

-- Bazaar and household expenses share the same rules
create policy "bazaar_select" on public.bazaar for select to authenticated
  using (private.is_member(mess_id));
create policy "bazaar_insert" on public.bazaar for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.is_member(mess_id)
    and private.belongs(mess_id, user_id)
    and ((user_id = (select auth.uid()) and day = private.dhaka_today()) or private.can_fix(mess_id, day))
  );
create policy "bazaar_update" on public.bazaar for update to authenticated
  using (
    private.can_fix(mess_id, day)
    or (created_by = (select auth.uid()) and day = private.dhaka_today() and private.is_member(mess_id))
  )
  with check (
    private.belongs(mess_id, user_id)
    and (
      private.can_fix(mess_id, day)
      or (created_by = (select auth.uid()) and user_id = (select auth.uid()) and day = private.dhaka_today() and private.is_member(mess_id))
    )
  );
create policy "bazaar_delete" on public.bazaar for delete to authenticated
  using (
    private.can_fix(mess_id, day)
    or (created_by = (select auth.uid()) and day = private.dhaka_today() and private.is_member(mess_id))
  );

create policy "expenses_select" on public.expenses for select to authenticated
  using (private.is_member(mess_id));
create policy "expenses_insert" on public.expenses for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.is_member(mess_id)
    and private.belongs(mess_id, user_id)
    and ((user_id = (select auth.uid()) and day = private.dhaka_today()) or private.can_fix(mess_id, day))
  );
create policy "expenses_update" on public.expenses for update to authenticated
  using (
    private.can_fix(mess_id, day)
    or (created_by = (select auth.uid()) and day = private.dhaka_today() and private.is_member(mess_id))
  )
  with check (
    private.belongs(mess_id, user_id)
    and (
      private.can_fix(mess_id, day)
      or (created_by = (select auth.uid()) and user_id = (select auth.uid()) and day = private.dhaka_today() and private.is_member(mess_id))
    )
  );
create policy "expenses_delete" on public.expenses for delete to authenticated
  using (
    private.can_fix(mess_id, day)
    or (created_by = (select auth.uid()) and day = private.dhaka_today() and private.is_member(mess_id))
  );

-- Duties: manager plans, the assignee marks done through toggle_duty
create policy "duties_select" on public.duties for select to authenticated
  using (private.is_member(mess_id));
create policy "duties_insert" on public.duties for insert to authenticated
  with check (private.is_manager(mess_id) and created_by = (select auth.uid()) and private.belongs(mess_id, user_id));
create policy "duties_update" on public.duties for update to authenticated
  using (private.is_manager(mess_id))
  with check (private.is_manager(mess_id) and private.belongs(mess_id, user_id));
create policy "duties_delete" on public.duties for delete to authenticated
  using (private.is_manager(mess_id));

create policy "approvals_select" on public.month_approvals for select to authenticated
  using (private.is_member(mess_id));

-- Triggers -------------------------------------------------------------------

create or replace function private.stamp_meal()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by := (select auth.uid());
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create or replace function private.keep_entry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.mess_id := old.mess_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create or replace function private.keep_duty()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.mess_id := old.mess_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;

-- Any change to a month's numbers reopens that month's approval.
create or replace function private.clear_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op <> 'INSERT' then
    delete from public.month_approvals
    where mess_id = old.mess_id
      and month = pg_catalog.date_trunc('month', old.day::timestamp)::date;
  end if;
  if tg_op <> 'DELETE' then
    delete from public.month_approvals
    where mess_id = new.mess_id
      and month = pg_catalog.date_trunc('month', new.day::timestamp)::date;
  end if;
  return null;
end;
$$;

create trigger meals_stamp before insert or update on public.meals
  for each row execute function private.stamp_meal();
create trigger bazaar_keep before update on public.bazaar
  for each row execute function private.keep_entry();
create trigger expenses_keep before update on public.expenses
  for each row execute function private.keep_entry();
create trigger duties_keep before update on public.duties
  for each row execute function private.keep_duty();

create trigger meals_clear_approval after insert or update or delete on public.meals
  for each row execute function private.clear_approval();
create trigger kitchen_clear_approval after insert or update or delete on public.kitchen_closed
  for each row execute function private.clear_approval();
create trigger guests_clear_approval after insert or update or delete on public.guests
  for each row execute function private.clear_approval();
create trigger bazaar_clear_approval after insert or update or delete on public.bazaar
  for each row execute function private.clear_approval();
create trigger expenses_clear_approval after insert or update or delete on public.expenses
  for each row execute function private.clear_approval();

-- Signup keeps Google's picture, or a Gravatar that falls back to a letter.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      'https://www.gravatar.com/avatar/' || md5(lower(btrim(coalesce(new.email, '')))) || '?d=404&s=256'
    ),
    new.email
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

-- RPCs -----------------------------------------------------------------------

create or replace function public.create_mess(
  p_name text,
  p_breakfast boolean default true,
  p_lunch boolean default true,
  p_dinner boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  mid uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if exists (select 1 from public.memberships where user_id = uid and left_on is null) then
    raise exception 'already_in_mess';
  end if;
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  insert into public.messes (name, owner_id, breakfast, lunch, dinner)
  values (btrim(p_name), uid, coalesce(p_breakfast, true), coalesce(p_lunch, true), coalesce(p_dinner, true))
  returning id into mid;
  insert into public.memberships (mess_id, user_id, role) values (mid, uid, 'manager');
  return mid;
end;
$$;

create or replace function public.invite_preview(p_code text)
returns table (name text, members integer)
language sql
stable
security definer
set search_path = ''
as $$
  select m.name,
    (select count(*)::integer from public.memberships x where x.mess_id = m.id and x.left_on is null)
  from public.messes m
  where m.invite_code = upper(btrim(p_code))
    and (select auth.uid()) is not null
$$;

create or replace function public.join_mess(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  mid uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select id into mid from public.messes where invite_code = upper(btrim(p_code));
  if mid is null then
    raise exception 'invalid_code';
  end if;
  if exists (select 1 from public.memberships where user_id = uid and left_on is null) then
    raise exception 'already_in_mess';
  end if;
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  insert into public.memberships (mess_id, user_id, role)
  values (mid, uid, 'member')
  on conflict (mess_id, user_id) do update
    set left_on = null, role = 'member';
  return mid;
end;
$$;

create or replace function public.regenerate_invite(p_mess uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  code text;
begin
  if not private.is_manager(p_mess) then
    raise exception 'not_manager';
  end if;
  update public.messes
  set invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  where id = p_mess
  returning invite_code into code;
  return code;
end;
$$;

create or replace function public.remove_member(p_mess uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_manager(p_mess) then
    raise exception 'not_manager';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'cannot_remove_self';
  end if;
  update public.memberships
  set left_on = private.dhaka_today()
  where mess_id = p_mess and user_id = p_user and left_on is null;
  delete from public.duties
  where mess_id = p_mess and user_id = p_user and day > private.dhaka_today() and done_at is null;
end;
$$;

create or replace function public.leave_mess(p_mess uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if not private.is_member(p_mess) then
    raise exception 'not_member';
  end if;
  if private.is_manager(p_mess) then
    raise exception 'manager_cannot_leave';
  end if;
  update public.memberships
  set left_on = private.dhaka_today()
  where mess_id = p_mess and user_id = uid and left_on is null;
  delete from public.duties
  where mess_id = p_mess and user_id = uid and day > private.dhaka_today() and done_at is null;
end;
$$;

create or replace function public.transfer_manager(p_mess uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if not private.is_manager(p_mess) then
    raise exception 'not_manager';
  end if;
  if p_user = uid or not exists (
    select 1 from public.memberships where mess_id = p_mess and user_id = p_user and left_on is null
  ) then
    raise exception 'not_member';
  end if;
  update public.memberships set role = 'member' where mess_id = p_mess and user_id = uid;
  update public.memberships set role = 'manager' where mess_id = p_mess and user_id = p_user;
end;
$$;

create or replace function public.approve_month(p_mess uuid, p_month date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_day date := pg_catalog.date_trunc('month', p_month::timestamp)::date;
begin
  if not private.is_manager(p_mess) then
    raise exception 'not_manager';
  end if;
  if first_day >= pg_catalog.date_trunc('month', private.dhaka_today()::timestamp)::date then
    raise exception 'month_not_finished';
  end if;
  insert into public.month_approvals (mess_id, month, approved_by)
  values (p_mess, first_day, (select auth.uid()))
  on conflict (mess_id, month) do update
    set approved_by = excluded.approved_by, approved_at = pg_catalog.now();
end;
$$;

create or replace function public.toggle_duty(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  row public.duties%rowtype;
  uid uuid := (select auth.uid());
  done boolean;
begin
  select * into row from public.duties where id = p_id;
  if not found or not private.is_member(row.mess_id) then
    raise exception 'not_found';
  end if;
  if row.user_id <> uid and not private.is_manager(row.mess_id) then
    raise exception 'not_allowed';
  end if;
  update public.duties
  set done_at = case when row.done_at is null then pg_catalog.now() else null end,
      done_by = case when row.done_at is null then uid else null end
  where id = p_id
  returning done_at is not null into done;
  return done;
end;
$$;

-- Execute rights --------------------------------------------------------------

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

revoke execute on function public.create_mess(text, boolean, boolean, boolean) from public, anon;
revoke execute on function public.invite_preview(text) from public, anon;
revoke execute on function public.join_mess(text) from public, anon;
revoke execute on function public.regenerate_invite(uuid) from public, anon;
revoke execute on function public.remove_member(uuid, uuid) from public, anon;
revoke execute on function public.leave_mess(uuid) from public, anon;
revoke execute on function public.transfer_manager(uuid, uuid) from public, anon;
revoke execute on function public.approve_month(uuid, date) from public, anon;
revoke execute on function public.toggle_duty(uuid) from public, anon;

grant execute on function public.create_mess(text, boolean, boolean, boolean) to authenticated;
grant execute on function public.invite_preview(text) to authenticated;
grant execute on function public.join_mess(text) to authenticated;
grant execute on function public.regenerate_invite(uuid) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
grant execute on function public.leave_mess(uuid) to authenticated;
grant execute on function public.transfer_manager(uuid, uuid) to authenticated;
grant execute on function public.approve_month(uuid, date) to authenticated;
grant execute on function public.toggle_duty(uuid) to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;
