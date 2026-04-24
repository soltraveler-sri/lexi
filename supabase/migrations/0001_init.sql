create extension if not exists pgcrypto;

create type document_type as enum (
  'blog_post',
  'work_doc',
  'fiction',
  'communication',
  'brain_dump',
  'other'
);

create type voice_context as enum (
  'blog_post',
  'work_doc',
  'fiction',
  'communication',
  'universal'
);

create type style_event_type as enum (
  'rewrite',
  'ai_suggestion_accepted',
  'ai_suggestion_edited',
  'ai_suggestion_rejected',
  'annotation'
);

create type credential_ownership as enum ('user', 'app');
create type renderer_mode as enum ('inline_strip', 'side_panel', 'overlay_modal');
create type call_tier as enum ('light', 'heavy');

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  title text not null default 'Untitled',
  content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  type document_type not null default 'blog_post',
  voice_context voice_context not null default 'universal',
  include_in_style_profile boolean not null default true,
  tags text[] not null default '{}',
  source_document_id uuid references documents(id) on delete set null,
  word_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table document_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  document_id uuid references documents(id) on delete cascade not null,
  content jsonb not null,
  word_count int not null default 0,
  captured_at timestamptz not null default now()
);

create table style_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  document_id uuid references documents(id) on delete set null,
  event_type style_event_type not null,
  before_text text not null,
  after_text text not null,
  surrounding_before text not null default '',
  surrounding_after text not null default '',
  document_type text not null,
  voice_context text not null,
  edit_tags text[] not null default '{}',
  note text,
  ai_prompt text,
  ai_provider text,
  time_spent_ms int not null default 0,
  created_at timestamptz not null default now()
);

create table exemplars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  document_id uuid references documents(id) on delete cascade not null,
  from_pos int not null,
  to_pos int not null,
  text_snapshot text not null,
  tags text[] not null default '{}',
  note text,
  created_at timestamptz not null default now()
);

create table style_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  content text not null default '',
  updated_at timestamptz not null default now()
);

create table voice_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  scope voice_context not null,
  compiled_system_prompt text not null,
  included_exemplar_ids uuid[] not null default '{}',
  included_event_ids uuid[] not null default '{}',
  compiled_at timestamptz not null default now(),
  unique (user_id, scope)
);

create table user_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,
  ownership credential_ownership not null default 'user',
  api_key text not null,
  label text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, label)
);

create table user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  renderer_mode renderer_mode not null default 'inline_strip',
  spotlight_intensity int not null default 75,
  always_send_full_voice_profile boolean not null default false,
  edit_tag_toast_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,
  model text not null,
  call_tier call_tier not null,
  input_tokens int not null default 0,
  cached_input_tokens int not null default 0,
  output_tokens int not null default 0,
  estimated_cost_usd numeric(10,6) not null default 0,
  document_id uuid references documents(id) on delete set null,
  transform_id text,
  created_at timestamptz not null default now()
);

create index projects_user_id_idx on projects(user_id);
create index projects_user_sort_idx on projects(user_id, sort_order);
create index documents_user_id_idx on documents(user_id);
create index documents_project_id_idx on documents(project_id);
create index documents_source_document_id_idx on documents(source_document_id);
create index documents_user_updated_idx on documents(user_id, updated_at desc);
create index document_snapshots_user_id_idx on document_snapshots(user_id);
create index document_snapshots_document_captured_idx on document_snapshots(document_id, captured_at desc);
create index style_events_user_id_idx on style_events(user_id);
create index style_events_document_id_idx on style_events(document_id);
create index style_events_user_created_idx on style_events(user_id, created_at desc);
create index exemplars_user_id_idx on exemplars(user_id);
create index exemplars_document_id_idx on exemplars(document_id);
create index voice_profiles_user_id_idx on voice_profiles(user_id);
create index user_credentials_user_id_idx on user_credentials(user_id);
create index usage_events_user_id_idx on usage_events(user_id);
create index usage_events_user_created_idx on usage_events(user_id, created_at desc);
create index usage_events_user_provider_created_idx on usage_events(user_id, provider, created_at desc);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
before update on projects
for each row execute function set_updated_at();

create trigger documents_set_updated_at
before update on documents
for each row execute function set_updated_at();

create trigger user_credentials_set_updated_at
before update on user_credentials
for each row execute function set_updated_at();

create trigger user_settings_set_updated_at
before update on user_settings
for each row execute function set_updated_at();

create or replace function public.handle_new_user_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings(user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.style_preferences(user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created_lexi_defaults
after insert on auth.users
for each row execute function public.handle_new_user_defaults();

alter table projects enable row level security;
alter table documents enable row level security;
alter table document_snapshots enable row level security;
alter table style_events enable row level security;
alter table exemplars enable row level security;
alter table style_preferences enable row level security;
alter table voice_profiles enable row level security;
alter table user_credentials enable row level security;
alter table user_settings enable row level security;
alter table usage_events enable row level security;

create policy projects_select_own on projects for select using (auth.uid() = user_id);
create policy projects_insert_own on projects for insert with check (auth.uid() = user_id);
create policy projects_update_own on projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy projects_delete_own on projects for delete using (auth.uid() = user_id);

create policy documents_select_own on documents for select using (auth.uid() = user_id);
create policy documents_insert_own on documents for insert with check (auth.uid() = user_id);
create policy documents_update_own on documents for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy documents_delete_own on documents for delete using (auth.uid() = user_id);

create policy document_snapshots_select_own on document_snapshots for select using (auth.uid() = user_id);
create policy document_snapshots_insert_own on document_snapshots for insert with check (auth.uid() = user_id);
create policy document_snapshots_update_own on document_snapshots for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy document_snapshots_delete_own on document_snapshots for delete using (auth.uid() = user_id);

create policy style_events_select_own on style_events for select using (auth.uid() = user_id);
create policy style_events_insert_own on style_events for insert with check (auth.uid() = user_id);
create policy style_events_update_own on style_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy style_events_delete_own on style_events for delete using (auth.uid() = user_id);

create policy exemplars_select_own on exemplars for select using (auth.uid() = user_id);
create policy exemplars_insert_own on exemplars for insert with check (auth.uid() = user_id);
create policy exemplars_update_own on exemplars for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy exemplars_delete_own on exemplars for delete using (auth.uid() = user_id);

create policy style_preferences_select_own on style_preferences for select using (auth.uid() = user_id);
create policy style_preferences_insert_own on style_preferences for insert with check (auth.uid() = user_id);
create policy style_preferences_update_own on style_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy style_preferences_delete_own on style_preferences for delete using (auth.uid() = user_id);

create policy voice_profiles_select_own on voice_profiles for select using (auth.uid() = user_id);
create policy voice_profiles_insert_own on voice_profiles for insert with check (auth.uid() = user_id);
create policy voice_profiles_update_own on voice_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy voice_profiles_delete_own on voice_profiles for delete using (auth.uid() = user_id);

create policy user_credentials_select_own on user_credentials for select using (auth.uid() = user_id);
create policy user_credentials_insert_own on user_credentials for insert with check (auth.uid() = user_id);
create policy user_credentials_update_own on user_credentials for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy user_credentials_delete_own on user_credentials for delete using (auth.uid() = user_id);

create policy user_settings_select_own on user_settings for select using (auth.uid() = user_id);
create policy user_settings_insert_own on user_settings for insert with check (auth.uid() = user_id);
create policy user_settings_update_own on user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy user_settings_delete_own on user_settings for delete using (auth.uid() = user_id);

create policy usage_events_select_own on usage_events for select using (auth.uid() = user_id);
create policy usage_events_insert_own on usage_events for insert with check (auth.uid() = user_id);
create policy usage_events_update_own on usage_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy usage_events_delete_own on usage_events for delete using (auth.uid() = user_id);

