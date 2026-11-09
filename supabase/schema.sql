-- Global Freelancing: initial PostgreSQL schema for Supabase.
-- Run this file in the Supabase SQL Editor for a new project.
-- RLS is enabled on every user-facing table. No payment data is stored here.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'New member' check (char_length(display_name) between 1 and 80),
  username text unique check (username is null or username ~ '^[a-zA-Z0-9_]{3,24}$'),
  account_type text not null default 'both' check (account_type in ('client', 'freelancer', 'both')),
  bio text not null default '' check (char_length(bio) <= 1000),
  country_code char(2),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 120),
  description text not null check (char_length(description) between 20 and 5000),
  category text not null check (char_length(category) between 2 and 50),
  price_amount numeric(12,2) not null check (price_amount >= 0),
  price_currency char(3) not null default 'USD',
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 140),
  description text not null check (char_length(description) between 20 and 6000),
  category text not null check (char_length(category) between 2 and 50),
  budget_min numeric(12,2) check (budget_min is null or budget_min >= 0),
  budget_max numeric(12,2) check (budget_max is null or budget_max >= 0),
  budget_currency char(3) not null default 'USD',
  status text not null default 'open' check (status in ('draft', 'open', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (budget_min is null or budget_max is null or budget_max >= budget_min)
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  freelancer_id uuid not null references public.profiles(id) on delete cascade,
  cover_letter text not null check (char_length(cover_letter) between 20 and 3000),
  proposed_amount numeric(12,2) not null check (proposed_amount >= 0),
  currency char(3) not null default 'USD',
  estimated_days integer check (estimated_days is null or estimated_days between 1 and 3650),
  status text not null default 'submitted' check (status in ('submitted', 'shortlisted', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, freelancer_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, member_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  constraint messages_sender_member_fk foreign key (conversation_id, sender_id)
    references public.conversation_members(conversation_id, member_id) on delete cascade
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_profile_id uuid references public.profiles(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  reason text not null check (char_length(reason) between 5 and 100),
  details text not null default '' check (char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists services_owner_idx on public.services(owner_id);
create index if not exists services_active_created_idx on public.services(status, created_at desc);
create index if not exists projects_client_idx on public.projects(client_id);
create index if not exists projects_open_created_idx on public.projects(status, created_at desc);
create index if not exists proposals_project_idx on public.proposals(project_id);
create index if not exists proposals_freelancer_idx on public.proposals(freelancer_id);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);
create index if not exists reports_status_created_idx on public.reports(status, created_at desc);

-- Automatically create a profile after a successful Supabase Auth signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 80), ''),
      nullif(left(split_part(coalesce(new.email, ''), '@', 1), 80), ''),
      'New member'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep updated_at current on editable records.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at before update on public.services
for each row execute procedure public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects
for each row execute procedure public.set_updated_at();

drop trigger if exists proposals_set_updated_at on public.proposals;
create trigger proposals_set_updated_at before update on public.proposals
for each row execute procedure public.set_updated_at();

-- Row Level Security: access is denied unless a policy below allows it.
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.projects enable row level security;
alter table public.proposals enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;

-- Profiles: public profile fields are readable; only the owner can change their profile.
drop policy if exists "Public profiles are readable" on public.profiles;
create policy "Public profiles are readable" on public.profiles for select using (true);
drop policy if exists "Members create their own profile" on public.profiles;
create policy "Members create their own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Members update their own profile" on public.profiles;
create policy "Members update their own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Services: active listings are public; owners manage only their own listings.
drop policy if exists "Active services are public" on public.services;
create policy "Active services are public" on public.services for select using (status = 'active' or owner_id = auth.uid());
drop policy if exists "Owners create services" on public.services;
create policy "Owners create services" on public.services for insert with check (owner_id = auth.uid());
drop policy if exists "Owners update services" on public.services;
create policy "Owners update services" on public.services for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "Owners delete services" on public.services;
create policy "Owners delete services" on public.services for delete using (owner_id = auth.uid());

-- Projects: open projects are discoverable; clients manage their own projects.
drop policy if exists "Open projects are public" on public.projects;
create policy "Open projects are public" on public.projects for select using (status = 'open' or client_id = auth.uid());
drop policy if exists "Clients create projects" on public.projects;
create policy "Clients create projects" on public.projects for insert with check (client_id = auth.uid());
drop policy if exists "Clients update projects" on public.projects;
create policy "Clients update projects" on public.projects for update using (client_id = auth.uid()) with check (client_id = auth.uid());
drop policy if exists "Clients delete projects" on public.projects;
create policy "Clients delete projects" on public.projects for delete using (client_id = auth.uid());

-- Proposals: the freelancer and the project owner can read; only freelancer submits/withdraws.
drop policy if exists "Proposal participants can read" on public.proposals;
create policy "Proposal participants can read" on public.proposals for select using (
  freelancer_id = auth.uid() or exists (
    select 1 from public.projects p where p.id = project_id and p.client_id = auth.uid()
  )
);
drop policy if exists "Freelancers submit proposals" on public.proposals;
create policy "Freelancers submit proposals" on public.proposals for insert with check (
  freelancer_id = auth.uid() and exists (
    select 1 from public.projects p where p.id = project_id and p.status = 'open' and p.client_id <> auth.uid()
  )
);
drop policy if exists "Freelancers update own proposals" on public.proposals;
create policy "Freelancers update own proposals" on public.proposals for update using (freelancer_id = auth.uid())
with check (freelancer_id = auth.uid());

-- Security-definer helper avoids recursive RLS when checking conversation membership.
create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation_id and cm.member_id = auth.uid()
  );
$$;

-- Start a private two-person conversation. Membership rows are never client-insertable.
create or replace function public.start_conversation(p_other_member uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_conversation_id uuid;
begin
  if auth.uid() is null or p_other_member is null or p_other_member = auth.uid() then
    raise exception 'A valid signed-in participant is required';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_other_member) then
    raise exception 'Participant not found';
  end if;

  insert into public.conversations default values returning id into new_conversation_id;
  insert into public.conversation_members (conversation_id, member_id)
  values (new_conversation_id, auth.uid()), (new_conversation_id, p_other_member);
  return new_conversation_id;
end;
$$;

revoke all on function public.is_conversation_member(uuid) from public;
grant execute on function public.is_conversation_member(uuid) to authenticated;
revoke all on function public.start_conversation(uuid) from public;
grant execute on function public.start_conversation(uuid) to authenticated;

-- Conversation rows and messages are visible only to conversation members.
drop policy if exists "Members read conversations" on public.conversations;
create policy "Members read conversations" on public.conversations for select using (
  public.is_conversation_member(id)
);
drop policy if exists "Members read membership" on public.conversation_members;
create policy "Members read membership" on public.conversation_members for select using (
  public.is_conversation_member(conversation_id)
);
drop policy if exists "Members read messages" on public.messages;
create policy "Members read messages" on public.messages for select using (
  public.is_conversation_member(conversation_id)
);
drop policy if exists "Members send messages" on public.messages;
create policy "Members send messages" on public.messages for insert with check (
  sender_id = auth.uid() and public.is_conversation_member(conversation_id)
);

-- Reports are private to the reporter. A future moderator role/workflow will review them.
drop policy if exists "Members submit reports" on public.reports;
create policy "Members submit reports" on public.reports for insert with check (reporter_id = auth.uid());
drop policy if exists "Reporters read their own reports" on public.reports;
create policy "Reporters read their own reports" on public.reports for select using (reporter_id = auth.uid());

-- Important: do not expose Supabase service-role keys in frontend code.
-- Before public launch, add moderator-only policies, rate limits, abuse review,
-- storage policies, and independent security testing.
