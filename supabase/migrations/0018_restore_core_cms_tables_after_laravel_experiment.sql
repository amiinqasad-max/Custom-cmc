-- ============================================================================
-- Restores the 6 core CMS tables that were dropped when a separate Laravel
-- experiment was run directly against this database (profiles,
-- role_permissions, post_video_progress, post_ad_placements,
-- adsense_reports, not_found_logs). Nothing Laravel-related is touched or
-- dropped by this migration — it is purely additive, reconstructing exactly
-- what 0002_profiles_and_rbac.sql / 0007_seo_menus_redirects.sql /
-- 0009_tracking.sql / 0010_ads.sql / 0012_rls_policies.sql /
-- 0014_security_hardening.sql / 0015_performance_hardening.sql originally
-- defined (those files were never edited — this is a byte-for-byte replay
-- of their DDL for just these 6 tables, not a guess).
--
-- Data note: this restores structure and known, version-controlled
-- configuration (the permission catalog + default role matrix from
-- supabase/seed.sql, which has exactly one canonical value). It cannot
-- restore actual row data that only ever lived in the dropped tables
-- (individual profiles beyond auth.users' own records, historical video
-- progress, ad-placement overrides, AdSense report cache, 404 hit counts)
-- — that data is genuinely gone. See the accompanying report for exactly
-- what that means and what's backfilled below vs. what needs a manual step.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  role text not null default 'author'
    check (role in ('super_admin', 'admin', 'editor', 'author')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'One row per auth.users row; carries display info + RBAC role.';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create index if not exists profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- role_permissions (permissions catalog table itself was not dropped)
-- ---------------------------------------------------------------------------
create table if not exists public.role_permissions (
  role text not null check (role in ('super_admin', 'admin', 'editor', 'author')),
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role, permission_key)
);
comment on table public.role_permissions is
  'Configurable role -> permission matrix, editable from Admin -> Users -> Roles.';

-- ---------------------------------------------------------------------------
-- RBAC helper functions + auth triggers (idempotent: safe whether or not
-- they survived the Laravel experiment). search_path pinned per the
-- security-hardening pass (0014) from the start, not patched on afterward.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;
comment on function public.get_my_role() is 'Current user''s RBAC role, or NULL if signed out / no profile.';

create or replace function public.role_rank(r text)
returns int
language sql
immutable
set search_path = public
as $$
  select case r
    when 'super_admin' then 4
    when 'admin' then 3
    when 'editor' then 2
    when 'author' then 1
    else 0
  end;
$$;

create or replace function public.has_role_at_least(min_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.role_rank(public.get_my_role()) >= public.role_rank(min_role);
$$;
comment on function public.has_role_at_least(text) is
  'True if the signed-in user''s role tier is >= min_role. Used by nearly every RLS policy.';

create or replace function public.has_permission(perm_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.get_my_role() = 'super_admin'
    or exists (
      select 1 from public.role_permissions rp
      where rp.role = public.get_my_role() and rp.permission_key = perm_key
    );
$$;
comment on function public.has_permission(text) is
  'Fine-grained permission check, used by server actions for anything RLS can''t express well.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := 'author';
begin
  if not exists (select 1 from public.profiles) then
    v_role := 'super_admin';
  end if;

  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    v_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if new.role = 'super_admin' and public.get_my_role() <> 'super_admin' then
      raise exception 'Only a super_admin can grant the super_admin role';
    end if;
    if public.role_rank(public.get_my_role()) < public.role_rank('admin') then
      raise exception 'Insufficient privileges to change roles';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role_changes on public.profiles;
create trigger profiles_protect_role_changes
  before update on public.profiles
  for each row execute function public.protect_profile_role_changes();

-- Trigger-only functions don't need to be directly RPC-callable (see
-- 0014_security_hardening.sql for why this is safe: TRIGGER privilege on
-- the table gates actual firing, not EXECUTE on the function).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_role_changes() from public, anon, authenticated;

-- Backfill a profiles row for every auth.users row that predates this
-- restore (the trigger above only fires on *new* signups, not
-- retroactively). Original per-user role assignments were lost with the
-- table — this cannot fabricate who was an editor vs admin vs author, so:
-- if you're the only account, you become super_admin again (so you aren't
-- locked out of your own site, mirroring the original bootstrap rule);
-- with more than one account, every backfilled user defaults to 'author'
-- and needs manually re-promoting (see the accompanying report for the
-- exact statement to run).
insert into public.profiles (id, email, display_name, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1)),
  case when (select count(*) from auth.users) = 1 then 'super_admin' else 'author' end
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Restore the default permission catalog + role matrix (supabase/seed.sql —
-- known, version-controlled configuration with exactly one correct value,
-- not user data). Any admin who had since customized the matrix away from
-- defaults would have that customization unrecoverable, same caveat as
-- profile roles above.
insert into public.permissions (key, description) values
  ('posts.view', 'View posts in the admin'),
  ('posts.create', 'Create new posts'),
  ('posts.edit_own', 'Edit posts you authored'),
  ('posts.edit_any', 'Edit any post regardless of author'),
  ('posts.publish', 'Publish, unpublish, or schedule posts'),
  ('posts.delete', 'Delete posts'),
  ('pages.manage', 'Create, edit, delete pages'),
  ('media.upload', 'Upload media'),
  ('media.manage', 'Edit or delete any media item'),
  ('categories.manage', 'Manage categories'),
  ('tags.manage', 'Manage tags'),
  ('menus.manage', 'Manage navigation menus'),
  ('seo.manage', 'Manage global SEO settings and per-entity SEO'),
  ('redirects.manage', 'Manage redirects and view 404 logs'),
  ('ads.manage', 'Manage ad slots, placements, and safety rules'),
  ('analytics.view', 'View analytics dashboards'),
  ('users.manage', 'Manage user accounts and roles'),
  ('comments.moderate', 'Approve, reject, or delete comments'),
  ('settings.manage', 'Manage site settings'),
  ('system.view', 'View system/activity log')
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_key) values
  ('author', 'posts.view'),
  ('author', 'posts.create'),
  ('author', 'posts.edit_own'),
  ('author', 'media.upload'),

  ('editor', 'posts.view'), ('editor', 'posts.create'), ('editor', 'posts.edit_own'),
  ('editor', 'posts.edit_any'), ('editor', 'posts.publish'), ('editor', 'posts.delete'),
  ('editor', 'pages.manage'), ('editor', 'media.upload'), ('editor', 'media.manage'),
  ('editor', 'categories.manage'), ('editor', 'tags.manage'), ('editor', 'comments.moderate'),
  ('editor', 'analytics.view'),

  ('admin', 'posts.view'), ('admin', 'posts.create'), ('admin', 'posts.edit_own'),
  ('admin', 'posts.edit_any'), ('admin', 'posts.publish'), ('admin', 'posts.delete'),
  ('admin', 'pages.manage'), ('admin', 'media.upload'), ('admin', 'media.manage'),
  ('admin', 'categories.manage'), ('admin', 'tags.manage'), ('admin', 'comments.moderate'),
  ('admin', 'analytics.view'), ('admin', 'menus.manage'), ('admin', 'seo.manage'),
  ('admin', 'redirects.manage'), ('admin', 'ads.manage'), ('admin', 'users.manage'),
  ('admin', 'settings.manage'), ('admin', 'system.view'),

  ('super_admin', 'posts.view'), ('super_admin', 'posts.create'), ('super_admin', 'posts.edit_own'),
  ('super_admin', 'posts.edit_any'), ('super_admin', 'posts.publish'), ('super_admin', 'posts.delete'),
  ('super_admin', 'pages.manage'), ('super_admin', 'media.upload'), ('super_admin', 'media.manage'),
  ('super_admin', 'categories.manage'), ('super_admin', 'tags.manage'), ('super_admin', 'comments.moderate'),
  ('super_admin', 'analytics.view'), ('super_admin', 'menus.manage'), ('super_admin', 'seo.manage'),
  ('super_admin', 'redirects.manage'), ('super_admin', 'ads.manage'), ('super_admin', 'users.manage'),
  ('super_admin', 'settings.manage'), ('super_admin', 'system.view')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- post_video_progress
-- ---------------------------------------------------------------------------
create table if not exists public.post_video_progress (
  id uuid primary key default gen_random_uuid(),
  article_session_id uuid not null references public.article_sessions (id) on delete cascade,
  post_video_id uuid not null references public.post_videos (id) on delete cascade,

  watched_seconds numeric(10, 3) not null default 0 check (watched_seconds >= 0),
  max_watched_seconds numeric(10, 3) not null default 0 check (max_watched_seconds >= 0),
  watch_percentage numeric(5, 2) not null default 0 check (watch_percentage between 0 and 100),
  play_count int not null default 0 check (play_count >= 0),

  completed boolean not null default false,
  started_at timestamptz not null default now(),
  last_watched_at timestamptz not null default now(),
  completed_at timestamptz,

  unique (article_session_id, post_video_id)
);
comment on table public.post_video_progress is
  'Per-(session, video) watch progress. completed is computed server-side from max_watched_seconds / video duration, never trusted from the client directly.';

create index if not exists post_video_progress_video_id_idx on public.post_video_progress (post_video_id);
create index if not exists post_video_progress_started_at_idx on public.post_video_progress (started_at);
create index if not exists post_video_progress_completed_at_idx on public.post_video_progress (completed_at) where completed_at is not null;

-- ---------------------------------------------------------------------------
-- post_ad_placements
-- ---------------------------------------------------------------------------
create table if not exists public.post_ad_placements (
  post_id uuid not null references public.posts (id) on delete cascade,
  ad_placement_id uuid not null references public.ad_placements (id) on delete cascade,
  is_enabled boolean not null default false,
  primary key (post_id, ad_placement_id)
);

-- Re-add the FK from engagement_events to ad_placements if it didn't
-- survive (engagement_events itself was never dropped).
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'engagement_events_ad_placement_fk'
      and table_name = 'engagement_events'
  ) then
    alter table public.engagement_events
      add constraint engagement_events_ad_placement_fk
      foreign key (ad_placement_id) references public.ad_placements (id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- adsense_reports
-- ---------------------------------------------------------------------------
create table if not exists public.adsense_reports (
  id bigint generated always as identity primary key,
  report_date date not null,
  post_id uuid references public.posts (id) on delete set null,
  impressions bigint,
  clicks bigint,
  ctr numeric(6, 4),
  estimated_earnings numeric(12, 4),
  page_rpm numeric(12, 4),
  currency text default 'USD',
  synced_at timestamptz not null default now(),

  unique (report_date, post_id)
);
comment on table public.adsense_reports is
  'Cache of official AdSense Reporting API results (impressions/clicks/CTR/estimated earnings), populated by a server-side sync job you configure with your own Google OAuth client. Kept strictly separate from ad_events (internal rendering analytics).';

-- ---------------------------------------------------------------------------
-- not_found_logs
-- ---------------------------------------------------------------------------
create table if not exists public.not_found_logs (
  id bigint generated always as identity primary key,
  path text not null,
  referrer text,
  hit_count bigint not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  unique (path)
);
comment on table public.not_found_logs is 'Aggregated 404 hits, one row per distinct path, incremented on repeat hits.';

-- ---------------------------------------------------------------------------
-- RLS — enable + recreate policies for all 6 tables (hardened auth.uid()
-- form from 0015 baked in directly for profiles, not patched on after).
-- drop-then-create makes this safe to re-run.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists profiles_select_staff on public.profiles;
create policy profiles_select_staff on public.profiles
  for select to authenticated
  using (public.has_role_at_least('admin'));

drop policy if exists profiles_update_own_or_staff on public.profiles;
create policy profiles_update_own_or_staff on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.has_role_at_least('admin'))
  with check (id = (select auth.uid()) or public.has_role_at_least('admin'));

drop policy if exists profiles_delete_staff on public.profiles;
create policy profiles_delete_staff on public.profiles
  for delete to authenticated
  using (public.has_role_at_least('admin') and role <> 'super_admin' and id <> (select auth.uid()));

alter table public.role_permissions enable row level security;

drop policy if exists role_permissions_read_staff on public.role_permissions;
create policy role_permissions_read_staff on public.role_permissions
  for select to authenticated using (public.has_role_at_least('editor'));

drop policy if exists role_permissions_write_admin on public.role_permissions;
create policy role_permissions_write_admin on public.role_permissions
  for all to authenticated
  using (public.has_role_at_least('admin')) with check (public.has_role_at_least('admin'));

alter table public.post_video_progress enable row level security;

drop policy if exists post_video_progress_select_staff on public.post_video_progress;
create policy post_video_progress_select_staff on public.post_video_progress
  for select to authenticated using (public.has_role_at_least('editor'));

alter table public.post_ad_placements enable row level security;

drop policy if exists post_ad_placements_select_public on public.post_ad_placements;
create policy post_ad_placements_select_public on public.post_ad_placements
  for select to anon, authenticated using (true);

drop policy if exists post_ad_placements_write_admin on public.post_ad_placements;
create policy post_ad_placements_write_admin on public.post_ad_placements
  for all to authenticated
  using (public.has_role_at_least('admin')) with check (public.has_role_at_least('admin'));

alter table public.adsense_reports enable row level security;

drop policy if exists adsense_reports_select_staff on public.adsense_reports;
create policy adsense_reports_select_staff on public.adsense_reports
  for select to authenticated using (public.has_role_at_least('admin'));

alter table public.not_found_logs enable row level security;

drop policy if exists not_found_logs_select_admin on public.not_found_logs;
create policy not_found_logs_select_admin on public.not_found_logs
  for select to authenticated using (public.has_role_at_least('admin'));
