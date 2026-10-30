create table if not exists public.auth_handoffs (
  id text primary key,
  code text not null,
  created_at timestamptz not null default now()
);

alter table public.auth_handoffs enable row level security;

revoke all on table public.auth_handoffs from anon, authenticated, public;

create or replace function public.put_auth_handoff(p_id text, p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_id is null or p_code is null then
    return;
  end if;
  if p_id !~ '^[A-Za-z0-9-]{8,80}$' then
    return;
  end if;
  delete from public.auth_handoffs where created_at < now() - interval '10 minutes';
  insert into public.auth_handoffs (id, code)
  values (p_id, p_code)
  on conflict (id) do update set code = excluded.code, created_at = now();
end;
$$;

create or replace function public.take_auth_handoff(p_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if p_id is null or p_id !~ '^[A-Za-z0-9-]{8,80}$' then
    return null;
  end if;
  delete from public.auth_handoffs
  where id = p_id
    and created_at > now() - interval '10 minutes'
  returning code into v_code;
  return v_code;
end;
$$;

revoke all on function public.put_auth_handoff(text, text) from public;
revoke all on function public.take_auth_handoff(text) from public;
grant execute on function public.put_auth_handoff(text, text) to anon, authenticated;
grant execute on function public.take_auth_handoff(text) to anon, authenticated;
