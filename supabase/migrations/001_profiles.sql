-- Profiles follow the auth user. Mess and membership rows are the later
-- boundary for one subscription per mess. The demo ledger is still in the app.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  email text,
  updated_at timestamptz not null default now()
);

create table if not exists public.messes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles (id),
  plan text not null default 'free' check (plan in ('free', 'mess')),
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  mess_id uuid not null references public.messes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('manager', 'member')),
  created_at timestamptz not null default now(),
  primary key (mess_id, user_id)
);

alter table public.profiles enable row level security;
alter table public.messes enable row level security;
alter table public.memberships enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "mess_select_member"
  on public.messes for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.memberships
      where memberships.mess_id = messes.id
        and memberships.user_id = auth.uid()
    )
  );

create policy "mess_insert_owner"
  on public.messes for insert
  with check (owner_id = auth.uid());

create policy "membership_select_own"
  on public.memberships for select
  using (user_id = auth.uid());

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
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
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

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
