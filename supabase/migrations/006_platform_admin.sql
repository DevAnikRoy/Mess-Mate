-- Platform administration is intentionally separate from mess manager roles.
-- Only the product owner below can call these functions through an authenticated session.

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and lower(p.email) = 'softvenceanik@gmail.com'
  )
$$;

create or replace function private.require_platform_admin()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'not_platform_admin';
  end if;
end;
$$;

create table private.platform_admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  mess_id uuid references public.messes(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('suspend_member', 'restore_member', 'transfer_manager')),
  created_at timestamptz not null default now()
);
revoke all on private.platform_admin_audit from public, anon, authenticated;

create or replace function public.platform_admin_overview()
returns table (
  total_messes bigint,
  active_messes bigint,
  active_members bigint,
  managers bigint,
  new_messes_30d bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_platform_admin();
  return query select
    (select count(*) from public.messes),
    (select count(distinct mess_id) from public.memberships where left_on is null),
    (select count(*) from public.memberships where left_on is null),
    (select count(*) from public.memberships where left_on is null and role = 'manager'),
    (select count(*) from public.messes where created_at >= now() - interval '30 days');
end;
$$;

create or replace function public.platform_admin_messes(p_query text default '', p_limit integer default 50)
returns table (
  id uuid,
  name text,
  created_at timestamptz,
  manager_name text,
  active_members bigint,
  total_members bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_platform_admin();
  return query
  select m.id, m.name, m.created_at,
    coalesce((select p.full_name from public.memberships mm join public.profiles p on p.id = mm.user_id
      where mm.mess_id = m.id and mm.left_on is null and mm.role = 'manager'
      order by mm.created_at limit 1), 'ম্যানেজার নেই') as manager_name,
    (select count(*) from public.memberships mm where mm.mess_id = m.id and mm.left_on is null) as active_members,
    (select count(*) from public.memberships mm where mm.mess_id = m.id) as total_members
  from public.messes m
  where coalesce(btrim(p_query), '') = ''
     or m.name ilike '%' || btrim(p_query) || '%'
     or m.id::text = btrim(p_query)
  order by m.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
end;
$$;

create or replace function public.platform_admin_mess_members(p_mess uuid)
returns table (
  mess_id uuid,
  mess_name text,
  user_id uuid,
  full_name text,
  email text,
  role text,
  joined_on date,
  left_on date,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_platform_admin();
  return query
  select m.id, m.name, p.id, coalesce(nullif(btrim(p.full_name), ''), 'সদস্য'), p.email,
    ms.role, ms.joined_on, ms.left_on, ms.created_at
  from public.messes m
  join public.memberships ms on ms.mess_id = m.id
  join public.profiles p on p.id = ms.user_id
  where m.id = p_mess
  order by ms.left_on nulls first, case when ms.role = 'manager' then 0 else 1 end, ms.created_at;
end;
$$;

create or replace function public.platform_admin_manage_member(p_mess uuid, p_user uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_manager_count integer;
begin
  perform private.require_platform_admin();
  if p_action not in ('suspend', 'restore', 'transfer_manager') then
    raise exception 'invalid_admin_action';
  end if;
  if not exists (select 1 from public.memberships where mess_id = p_mess and user_id = p_user) then
    raise exception 'not_member';
  end if;

  if p_action = 'suspend' then
    select count(*) into active_manager_count from public.memberships
      where mess_id = p_mess and left_on is null and role = 'manager';
    if exists (select 1 from public.memberships where mess_id = p_mess and user_id = p_user and left_on is null and role = 'manager')
      and active_manager_count <= 1 then
      raise exception 'last_manager';
    end if;
    update public.memberships set left_on = private.dhaka_today()
      where mess_id = p_mess and user_id = p_user and left_on is null;
    delete from public.duties where mess_id = p_mess and user_id = p_user
      and day > private.dhaka_today() and done_at is null;
    insert into private.platform_admin_audit(actor_id, mess_id, user_id, action)
      values ((select auth.uid()), p_mess, p_user, 'suspend_member');
  elsif p_action = 'restore' then
    if exists (select 1 from public.memberships where user_id = p_user and left_on is null and mess_id <> p_mess) then
      raise exception 'already_in_mess';
    end if;
    update public.memberships set left_on = null, role = 'member', joined_on = private.dhaka_today()
      where mess_id = p_mess and user_id = p_user and left_on is not null;
    insert into private.platform_admin_audit(actor_id, mess_id, user_id, action)
      values ((select auth.uid()), p_mess, p_user, 'restore_member');
  else
    if not exists (select 1 from public.memberships where mess_id = p_mess and user_id = p_user and left_on is null) then
      raise exception 'not_member';
    end if;
    update public.memberships set role = 'member' where mess_id = p_mess and left_on is null and role = 'manager';
    update public.memberships set role = 'manager' where mess_id = p_mess and user_id = p_user;
    insert into private.platform_admin_audit(actor_id, mess_id, user_id, action)
      values ((select auth.uid()), p_mess, p_user, 'transfer_manager');
  end if;
end;
$$;

revoke all on function private.is_platform_admin(), private.require_platform_admin() from public, anon, authenticated;
revoke all on function public.platform_admin_overview(), public.platform_admin_messes(text, integer),
  public.platform_admin_mess_members(uuid), public.platform_admin_manage_member(uuid, uuid, text)
  from public, anon;
grant execute on function public.platform_admin_overview(), public.platform_admin_messes(text, integer),
  public.platform_admin_mess_members(uuid), public.platform_admin_manage_member(uuid, uuid, text)
  to authenticated;
