-- Run this in Supabase SQL Editor

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  age int not null default 18,
  is_first_time_buyer boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_houses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null,
  image text not null,
  price numeric not null,
  beds int not null,
  baths numeric not null,
  sqft int not null,
  location text not null,
  prediction numeric not null,
  investment_score numeric,
  created_at timestamptz not null default now(),
  unique(user_id, property_id)
);

create table if not exists public.saved_user_info (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  category text not null default 'general',
  created_at timestamptz not null default now()
);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.saved_houses enable row level security;
alter table public.saved_user_info enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "saved_houses_select_own" on public.saved_houses;
create policy "saved_houses_select_own" on public.saved_houses
for select
using (auth.uid() = user_id);

drop policy if exists "saved_houses_insert_own" on public.saved_houses;
create policy "saved_houses_insert_own" on public.saved_houses
for insert
with check (auth.uid() = user_id);

drop policy if exists "saved_houses_update_own" on public.saved_houses;
create policy "saved_houses_update_own" on public.saved_houses
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "saved_houses_delete_own" on public.saved_houses;
create policy "saved_houses_delete_own" on public.saved_houses
for delete
using (auth.uid() = user_id);

drop policy if exists "saved_user_info_select_own" on public.saved_user_info;
create policy "saved_user_info_select_own" on public.saved_user_info
for select
using (auth.uid() = user_id);

drop policy if exists "saved_user_info_insert_own" on public.saved_user_info;
create policy "saved_user_info_insert_own" on public.saved_user_info
for insert
with check (auth.uid() = user_id);

drop policy if exists "saved_user_info_delete_own" on public.saved_user_info;
create policy "saved_user_info_delete_own" on public.saved_user_info
for delete
using (auth.uid() = user_id);

drop policy if exists "chat_sessions_select_own" on public.chat_sessions;
create policy "chat_sessions_select_own" on public.chat_sessions
for select
using (auth.uid() = user_id);

drop policy if exists "chat_sessions_insert_own" on public.chat_sessions;
create policy "chat_sessions_insert_own" on public.chat_sessions
for insert
with check (auth.uid() = user_id);

drop policy if exists "chat_sessions_update_own" on public.chat_sessions;
create policy "chat_sessions_update_own" on public.chat_sessions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "chat_sessions_delete_own" on public.chat_sessions;
create policy "chat_sessions_delete_own" on public.chat_sessions
for delete
using (auth.uid() = user_id);

drop policy if exists "chat_messages_select_own" on public.chat_messages;
create policy "chat_messages_select_own" on public.chat_messages
for select
using (auth.uid() = user_id);

drop policy if exists "chat_messages_insert_own" on public.chat_messages;
create policy "chat_messages_insert_own" on public.chat_messages
for insert
with check (auth.uid() = user_id);

drop policy if exists "chat_messages_delete_own" on public.chat_messages;
create policy "chat_messages_delete_own" on public.chat_messages
for delete
using (auth.uid() = user_id);
