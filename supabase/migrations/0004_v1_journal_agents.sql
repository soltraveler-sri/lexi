-- v1 Journal + Agents schema (issues #23, #21).
--
-- Adds:
--  * `notes` (single per-user markdown canvas for Journal → Notes)
--  * `agents` (per-user persona prompts for Agents Level 1)
--  * nullable `agent_id` columns on `style_events` and `usage_events` so
--    we can attribute events to the agent that produced them.
--
-- Idempotent: every statement uses `if not exists` / `if exists` guards.

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  content text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on notes(user_id);

alter table notes enable row level security;

drop policy if exists notes_select_own on notes;
create policy notes_select_own on notes for select using (auth.uid() = user_id);
drop policy if exists notes_insert_own on notes;
create policy notes_insert_own on notes for insert with check (auth.uid() = user_id);
drop policy if exists notes_update_own on notes;
create policy notes_update_own on notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists notes_delete_own on notes;
create policy notes_delete_own on notes for delete using (auth.uid() = user_id);

drop trigger if exists notes_set_updated_at on notes;
create trigger notes_set_updated_at
before update on notes
for each row execute function set_updated_at();

create type agent_output_kind as enum ('rewrite', 'response');

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  role text not null default 'editor',
  description text,
  persona_prompt text not null,
  uses_voice_profile boolean not null default true,
  voice_profile_scope voice_context,
  output_kind agent_output_kind not null default 'rewrite',
  default_model text,
  default_temperature numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agents_user_id_idx on agents(user_id);

alter table agents enable row level security;

drop policy if exists agents_select_own on agents;
create policy agents_select_own on agents for select using (auth.uid() = user_id);
drop policy if exists agents_insert_own on agents;
create policy agents_insert_own on agents for insert with check (auth.uid() = user_id);
drop policy if exists agents_update_own on agents;
create policy agents_update_own on agents for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists agents_delete_own on agents;
create policy agents_delete_own on agents for delete using (auth.uid() = user_id);

drop trigger if exists agents_set_updated_at on agents;
create trigger agents_set_updated_at
before update on agents
for each row execute function set_updated_at();

alter table style_events
  add column if not exists agent_id uuid references agents(id) on delete set null;

alter table usage_events
  add column if not exists agent_id uuid references agents(id) on delete set null;

create index if not exists style_events_agent_id_idx on style_events(agent_id);
create index if not exists usage_events_agent_id_idx on usage_events(agent_id);
