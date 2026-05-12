-- Backfill guard for environments created from an older schema snapshot where
-- usage_events.ownership and supporting index may be missing.
do $$
begin
  create type credential_ownership as enum ('user', 'app');
exception
  when duplicate_object then null;
end $$;

alter table usage_events
  add column if not exists ownership credential_ownership not null default 'user';

create index if not exists usage_events_user_ownership_created_idx
  on usage_events(user_id, ownership, created_at);
