-- Distinguish app-owned (env-fallback) vs user-owned (BYOK) AI calls so we can
-- rate-limit only app-owned usage and report cost separately.
alter table usage_events
  add column if not exists ownership credential_ownership not null default 'user';

create index if not exists usage_events_user_ownership_created_idx
  on usage_events(user_id, ownership, created_at desc);
