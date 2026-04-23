-- Seed data for local development.
-- Replace this id with a real Supabase auth user id after signing in locally:
-- select id, email from auth.users;

do $$
declare
  seed_user uuid := '00000000-0000-0000-0000-000000000001';
  seed_project uuid := '00000000-0000-0000-0000-000000000101';
  seed_doc uuid := '00000000-0000-0000-0000-000000000201';
begin
  if not exists (select 1 from auth.users where id = seed_user) then
    raise notice 'Skipping Forge seed rows because seed_user % is not present in auth.users. Replace seed_user with a real local user id and rerun.', seed_user;
    return;
  end if;

  insert into public.user_settings(user_id)
  values (seed_user)
  on conflict (user_id) do nothing;

  insert into public.style_preferences(user_id, content)
  values (
    seed_user,
    'Prefer clean, direct sentences with a warm but unsentimental voice. Keep rhythm varied and remove filler.'
  )
  on conflict (user_id) do update set content = excluded.content;

  insert into public.projects(id, user_id, name, description, sort_order)
  values (
    seed_project,
    seed_user,
    'Drafts',
    'Seed project for Forge/Lexi local development.',
    0
  )
  on conflict (id) do nothing;

  insert into public.documents(id, user_id, project_id, title, content, type, voice_context, word_count)
  values (
    seed_doc,
    seed_user,
    seed_project,
    'Welcome to Lexi',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Select a sentence and press Mod+R to open the Rewrite Strip."}]}]}'::jsonb,
    'blog_post',
    'blog_post',
    13
  )
  on conflict (id) do nothing;
end $$;
