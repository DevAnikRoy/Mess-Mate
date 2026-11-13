-- Optional notification-based WhatsApp feed. Existing mess data is untouched.
create table public.whatsapp_feeds (
  mess_id uuid primary key references public.messes(id) on delete cascade,
  group_name text not null check (char_length(btrim(group_name)) between 1 and 120),
  enabled boolean not null default true,
  capture_after timestamptz not null default now(),
  last_received_at timestamptz,
  updated_at timestamptz not null default now()
);

create table private.whatsapp_bridges (
  mess_id uuid primary key references public.whatsapp_feeds(mess_id) on delete cascade,
  id uuid not null unique default gen_random_uuid(),
  token_hash bytea not null unique,
  owner_id uuid not null references public.profiles(id),
  last_seen_at timestamptz,
  rate_started_at timestamptz not null default now(),
  rate_count integer not null default 0
);
revoke all on private.whatsapp_bridges from public, anon, authenticated;

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.whatsapp_feeds(mess_id) on delete cascade,
  event_key text not null check (event_key ~ '^[a-f0-9]{64}$'),
  sender text not null check (char_length(btrim(sender)) between 1 and 160),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  sent_at timestamptz not null,
  received_at timestamptz not null default now(),
  source text not null check (source in ('bridge', 'import')),
  unique (mess_id, event_key)
);
create index whatsapp_messages_page on public.whatsapp_messages(mess_id, sent_at desc, id desc);

alter table public.whatsapp_feeds enable row level security;
alter table public.whatsapp_messages enable row level security;
revoke all on public.whatsapp_feeds, public.whatsapp_messages from public, anon, authenticated;
grant select on public.whatsapp_feeds, public.whatsapp_messages to authenticated;
create policy whatsapp_feed_members on public.whatsapp_feeds for select to authenticated
  using (private.is_member(mess_id));
create policy whatsapp_message_members on public.whatsapp_messages for select to authenticated
  using (private.is_member(mess_id));

-- Serialize authorization with membership removal and manager handover.
create function private.lock_whatsapp_manager(p_mess uuid, p_user uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.memberships where mess_id = p_mess and user_id = p_user
    and role = 'manager' and left_on is null for share;
  return found;
end;
$$;
revoke all on function private.lock_whatsapp_manager(uuid, uuid) from public, anon, authenticated;

-- Caller locks the feed first, serializing ingestion, replacement and deletion.
create function private.store_whatsapp_messages(p_mess uuid, p_events jsonb, p_source text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  item jsonb;
  sent timestamptz;
  cutoff timestamptz;
  inserted integer := 0;
  changed integer;
begin
  if jsonb_typeof(p_events) is distinct from 'array'
     or jsonb_array_length(p_events) > 25 or octet_length(p_events::text) > 524288 then
    raise exception 'invalid_messages';
  end if;
  select capture_after into cutoff from public.whatsapp_feeds where mess_id = p_mess;
  for item in select value from jsonb_array_elements(p_events) loop
    if jsonb_typeof(item->'sender') is distinct from 'string'
       or jsonb_typeof(item->'body') is distinct from 'string'
       or coalesce(item->>'event_key', '') !~ '^[a-f0-9]{64}$'
       or char_length(btrim(item->>'sender')) not between 1 and 160
       or char_length(btrim(item->>'body')) not between 1 and 4000
       or jsonb_typeof(item->'sent_at') is distinct from 'string' then
      raise exception 'invalid_messages';
    end if;
    sent := (item->>'sent_at')::timestamptz;
    if not pg_catalog.isfinite(sent) or sent > now() + interval '5 minutes' then
      raise exception 'invalid_messages';
    end if;
    if p_source = 'bridge' and sent < cutoff then continue; end if;
    insert into public.whatsapp_messages(mess_id, event_key, sender, body, sent_at, source)
      values (p_mess, item->>'event_key', btrim(item->>'sender'), item->>'body', sent, p_source)
      on conflict (mess_id, event_key) do nothing;
    get diagnostics changed = row_count;
    inserted := inserted + changed;
  end loop;
  -- A bounded feed keeps storage and initial downloads small.
  delete from public.whatsapp_messages where mess_id = p_mess and id in (
    select id from public.whatsapp_messages where mess_id = p_mess
    order by sent_at desc, id desc offset 500
  );
  update public.whatsapp_feeds set
    last_received_at = case when inserted > 0 then now() else last_received_at end,
    updated_at = now()
  where mess_id = p_mess;
  return inserted;
end;
$$;
revoke all on function private.store_whatsapp_messages(uuid, jsonb, text) from public, anon, authenticated;

-- The clear-text credential is returned once, only to the authenticated manager.
create function public.connect_whatsapp_bridge(p_mess uuid, p_group_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  secret text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  device uuid := gen_random_uuid();
begin
  if not private.lock_whatsapp_manager(p_mess, (select auth.uid())) then raise exception 'not_manager'; end if;
  insert into public.whatsapp_feeds(mess_id, group_name) values (p_mess, btrim(p_group_name))
    on conflict (mess_id) do update set group_name = excluded.group_name,
      enabled = true, capture_after = now(), last_received_at = null, updated_at = now();
  -- Re-pairing explicitly replaces the source and its displayed history.
  delete from public.whatsapp_messages where mess_id = p_mess;
  insert into private.whatsapp_bridges(mess_id, id, token_hash, owner_id)
    values (p_mess, device, sha256(convert_to(secret, 'UTF8')), (select auth.uid()))
    on conflict (mess_id) do update set id = excluded.id, token_hash = excluded.token_hash,
      owner_id = excluded.owner_id, last_seen_at = null, rate_count = 0, rate_started_at = now();
  return jsonb_build_object('token', secret, 'device_id', device);
end;
$$;

create function public.manage_whatsapp_feed(p_mess uuid, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.lock_whatsapp_manager(p_mess, (select auth.uid())) then raise exception 'not_manager'; end if;
  perform 1 from public.whatsapp_feeds where mess_id = p_mess for update;
  if p_action = 'disconnect' then
    delete from private.whatsapp_bridges where mess_id = p_mess;
    update public.whatsapp_feeds set enabled = false, capture_after = now(), updated_at = now() where mess_id = p_mess;
  elsif p_action = 'clear' then
    delete from public.whatsapp_messages where mess_id = p_mess;
    update public.whatsapp_feeds set capture_after = now(), last_received_at = null, updated_at = now() where mess_id = p_mess;
  elsif p_action in ('pause', 'resume') then
    update public.whatsapp_feeds set enabled = (p_action = 'resume'),
      capture_after = now(), updated_at = now() where mess_id = p_mess;
  else
    raise exception 'invalid_action';
  end if;
end;
$$;

create function public.whatsapp_bridge_status(p_mess uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  result jsonb;
begin
  if not private.is_member(p_mess) then raise exception 'not_member'; end if;
  select jsonb_build_object('device_id', b.id, 'last_seen_at', b.last_seen_at,
    'manager_valid', exists (select 1 from public.memberships m where m.mess_id = p_mess
      and m.user_id = b.owner_id and m.left_on is null and m.role = 'manager'))
    into result from private.whatsapp_bridges b where b.mess_id = p_mess;
  return result;
end;
$$;

-- Failed native activation can revoke only the credential that attempt created.
create function public.disconnect_whatsapp_bridge(p_mess uuid, p_device uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.lock_whatsapp_manager(p_mess, (select auth.uid())) then raise exception 'not_manager'; end if;
  perform 1 from public.whatsapp_feeds where mess_id = p_mess for update;
  delete from private.whatsapp_bridges where mess_id = p_mess and id = p_device;
  if found then
    update public.whatsapp_feeds set enabled = false, updated_at = now() where mess_id = p_mess;
  end if;
end;
$$;

create function public.ingest_whatsapp_messages(p_token text, p_events jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  mid uuid;
  device private.whatsapp_bridges%rowtype;
  active boolean;
  amount integer;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'bridge_revoked'; end if;
  select * into device from private.whatsapp_bridges
    where token_hash = sha256(convert_to(p_token, 'UTF8'));
  if not found then raise exception 'bridge_revoked'; end if;
  mid := device.mess_id;
  if not private.lock_whatsapp_manager(mid, device.owner_id) then raise exception 'bridge_revoked'; end if;
  select enabled into active from public.whatsapp_feeds where mess_id = mid for update;
  select * into device from private.whatsapp_bridges
    where mess_id = mid and token_hash = sha256(convert_to(p_token, 'UTF8'));
  if not found or not exists (select 1 from public.memberships m
    where m.mess_id = mid and m.user_id = device.owner_id and m.role = 'manager' and m.left_on is null) then
    raise exception 'bridge_revoked';
  end if;
  if not active then raise exception 'feed_paused'; end if;
  if jsonb_typeof(p_events) is distinct from 'array' then raise exception 'invalid_messages'; end if;
  amount := greatest(jsonb_array_length(p_events), 1);
  if device.rate_started_at > now() - interval '1 minute' and device.rate_count + amount > 300 then
    raise exception 'bridge_rate_limit';
  end if;
  update private.whatsapp_bridges set last_seen_at = now(),
    rate_count = case when rate_started_at <= now() - interval '1 minute' then amount else rate_count + amount end,
    rate_started_at = case when rate_started_at <= now() - interval '1 minute' then now() else rate_started_at end
    where mess_id = mid;
  return private.store_whatsapp_messages(mid, p_events, 'bridge');
end;
$$;

create function public.import_whatsapp_messages(p_mess uuid, p_group_name text, p_events jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
begin
  if not private.lock_whatsapp_manager(p_mess, (select auth.uid())) then raise exception 'not_manager'; end if;
  insert into public.whatsapp_feeds(mess_id, group_name) values (p_mess, btrim(p_group_name))
    on conflict (mess_id) do nothing;
  perform 1 from public.whatsapp_feeds where mess_id = p_mess for update;
  return private.store_whatsapp_messages(p_mess, p_events, 'import');
end;
$$;

revoke all on function public.connect_whatsapp_bridge(uuid, text),
  public.manage_whatsapp_feed(uuid, text), public.whatsapp_bridge_status(uuid),
  public.disconnect_whatsapp_bridge(uuid, uuid),
  public.import_whatsapp_messages(uuid, text, jsonb), public.ingest_whatsapp_messages(text, jsonb)
  from public, anon, authenticated;
grant execute on function public.connect_whatsapp_bridge(uuid, text),
  public.manage_whatsapp_feed(uuid, text), public.whatsapp_bridge_status(uuid),
  public.disconnect_whatsapp_bridge(uuid, uuid),
  public.import_whatsapp_messages(uuid, text, jsonb) to authenticated;
grant execute on function public.ingest_whatsapp_messages(text, jsonb) to anon, authenticated;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime' and not puballtables) then
    alter publication supabase_realtime add table public.whatsapp_feeds, public.whatsapp_messages;
  end if;
end $$;
