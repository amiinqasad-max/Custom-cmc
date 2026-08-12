-- ============================================================================
-- Row Level Security
--
-- Pattern used throughout:
--   * Public (anon + authenticated) gets narrow, read-only access to published
--     content only.
--   * Staff tiers get broader access via has_role_at_least('editor'|'admin').
--   * "Own resource" tables (posts, media) let an `author` manage rows they
--     created even without a blanket role grant.
--   * High-volume tracking tables (article_sessions, post_video_progress,
--     engagement_events, ad_events) get RLS enabled with NO policies for
--     anon/authenticated at all — the only way in is the service-role client
--     from /api/track/*, which bypasses RLS by design and does its own
--     validation. Staff get SELECT for analytics dashboards.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_select_staff on public.profiles
  for select to authenticated
  using (public.has_role_at_least('admin'));

create policy profiles_update_own_or_staff on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.has_role_at_least('admin'))
  with check (id = auth.uid() or public.has_role_at_least('admin'));

create policy profiles_delete_staff on public.profiles
  for delete to authenticated
  using (public.has_role_at_least('admin') and role <> 'super_admin' and id <> auth.uid());

-- ---------------------------------------------------------------------------
-- permissions / role_permissions — admin+ manage, staff can read to render
-- the Users -> Roles matrix UI.
-- ---------------------------------------------------------------------------
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

create policy permissions_read_staff on public.permissions
  for select to authenticated using (public.has_role_at_least('editor'));
create policy permissions_write_admin on public.permissions
  for all to authenticated
  using (public.has_role_at_least('admin')) with check (public.has_role_at_least('admin'));

create policy role_permissions_read_staff on public.role_permissions
  for select to authenticated using (public.has_role_at_least('editor'));
create policy role_permissions_write_admin on public.role_permissions
  for all to authenticated
  using (public.has_role_at_least('admin')) with check (public.has_role_at_least('admin'));

-- ---------------------------------------------------------------------------
-- media
-- ---------------------------------------------------------------------------
alter table public.media enable row level security;

create policy media_select_public on public.media
  for select to anon, authenticated using (true);

create policy media_insert_staff on public.media
  for insert to authenticated
  with check (public.has_role_at_least('author') and uploaded_by = auth.uid());

create policy media_modify_own_or_editor on public.media
  for update to authenticated
  using (uploaded_by = auth.uid() or public.has_role_at_least('editor'))
  with check (uploaded_by = auth.uid() or public.has_role_at_least('editor'));

create policy media_delete_own_or_editor on public.media
  for delete to authenticated
  using (uploaded_by = auth.uid() or public.has_role_at_least('editor'));

-- ---------------------------------------------------------------------------
-- categories / tags — public read, editor+ write
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.tags enable row level security;

create policy categories_select_public on public.categories
  for select to anon, authenticated using (true);
create policy categories_write_editor on public.categories
  for all to authenticated
  using (public.has_role_at_least('editor')) with check (public.has_role_at_least('editor'));

create policy tags_select_public on public.tags
  for select to anon, authenticated using (true);
create policy tags_write_editor on public.tags
  for all to authenticated
  using (public.has_role_at_least('editor')) with check (public.has_role_at_least('editor'));

-- ---------------------------------------------------------------------------
-- posts — public reads published only; author manages own; editor+ manages all
-- ---------------------------------------------------------------------------
alter table public.posts enable row level security;

create policy posts_select_published on public.posts
  for select to anon, authenticated
  using (status = 'published' and published_at is not null and published_at <= now());

create policy posts_select_own_or_staff on public.posts
  for select to authenticated
  using (author_id = auth.uid() or public.has_role_at_least('editor'));

create policy posts_insert_author on public.posts
  for insert to authenticated
  with check (
    public.has_role_at_least('author')
    and (author_id = auth.uid() or public.has_role_at_least('editor'))
  );

create policy posts_update_own_or_editor on public.posts
  for update to authenticated
  using (
    (author_id = auth.uid() and public.has_role_at_least('author'))
    or public.has_role_at_least('editor')
  )
  with check (
    (author_id = auth.uid() and public.has_role_at_least('author'))
    or public.has_role_at_least('editor')
  );

create policy posts_delete_own_or_editor on public.posts
  for delete to authenticated
  using (
    (author_id = auth.uid() and public.has_role_at_least('author'))
    or public.has_role_at_least('editor')
  );

alter table public.post_tags enable row level security;
create policy post_tags_select_public on public.post_tags
  for select to anon, authenticated using (true);
create policy post_tags_write_staff on public.post_tags
  for all to authenticated
  using (
    exists (
      select 1 from public.posts p where p.id = post_id
      and (p.author_id = auth.uid() or public.has_role_at_least('editor'))
    )
  )
  with check (
    exists (
      select 1 from public.posts p where p.id = post_id
      and (p.author_id = auth.uid() or public.has_role_at_least('editor'))
    )
  );

alter table public.post_videos enable row level security;
create policy post_videos_select_public on public.post_videos
  for select to anon, authenticated using (true);
create policy post_videos_write_staff on public.post_videos
  for all to authenticated
  using (
    exists (
      select 1 from public.posts p where p.id = post_id
      and (p.author_id = auth.uid() or public.has_role_at_least('editor'))
    )
  )
  with check (
    exists (
      select 1 from public.posts p where p.id = post_id
      and (p.author_id = auth.uid() or public.has_role_at_least('editor'))
    )
  );

-- ---------------------------------------------------------------------------
-- pages — public reads published only; editor+ manage
-- ---------------------------------------------------------------------------
alter table public.pages enable row level security;

create policy pages_select_published on public.pages
  for select to anon, authenticated using (status = 'published');
create policy pages_select_staff on public.pages
  for select to authenticated using (public.has_role_at_least('editor'));
create policy pages_write_editor on public.pages
  for all to authenticated
  using (public.has_role_at_least('editor')) with check (public.has_role_at_least('editor'));

-- ---------------------------------------------------------------------------
-- seo_metadata — not sensitive; public read, editor+ write
-- ---------------------------------------------------------------------------
alter table public.seo_metadata enable row level security;
create policy seo_metadata_select_public on public.seo_metadata
  for select to anon, authenticated using (true);
create policy seo_metadata_write_editor on public.seo_metadata
  for all to authenticated
  using (public.has_role_at_least('editor')) with check (public.has_role_at_least('editor'));

-- ---------------------------------------------------------------------------
-- menus / menu_items — public read (needed to render header/footer), admin+ write
-- ---------------------------------------------------------------------------
alter table public.menus enable row level security;
alter table public.menu_items enable row level security;

create policy menus_select_public on public.menus for select to anon, authenticated using (true);
create policy menus_write_admin on public.menus
  for all to authenticated
  using (public.has_role_at_least('admin')) with check (public.has_role_at_least('admin'));

create policy menu_items_select_public on public.menu_items for select to anon, authenticated using (true);
create policy menu_items_write_admin on public.menu_items
  for all to authenticated
  using (public.has_role_at_least('admin')) with check (public.has_role_at_least('admin'));

-- ---------------------------------------------------------------------------
-- redirects — public read (middleware uses the anon key to resolve them),
-- admin+ write. not_found_logs: no public access at all (service role only).
-- ---------------------------------------------------------------------------
alter table public.redirects enable row level security;
create policy redirects_select_public on public.redirects
  for select to anon, authenticated using (is_active);
create policy redirects_select_staff on public.redirects
  for select to authenticated using (public.has_role_at_least('admin'));
create policy redirects_write_admin on public.redirects
  for all to authenticated
  using (public.has_role_at_least('admin')) with check (public.has_role_at_least('admin'));

alter table public.not_found_logs enable row level security;
create policy not_found_logs_select_admin on public.not_found_logs
  for select to authenticated using (public.has_role_at_least('admin'));

-- ---------------------------------------------------------------------------
-- settings — public read (some groups drive public-page behavior, e.g.
-- reading.auto_next_delay_ms), admin+ write. No secrets are ever stored here.
-- ---------------------------------------------------------------------------
alter table public.settings enable row level security;
create policy settings_select_public on public.settings
  for select to anon, authenticated using (true);
create policy settings_write_admin on public.settings
  for all to authenticated
  using (public.has_role_at_least('admin')) with check (public.has_role_at_least('admin'));

-- ---------------------------------------------------------------------------
-- Tracking tables — no anon/authenticated policies at all = default deny.
-- Only /api/track/* (service role) and staff SELECT for analytics.
-- ---------------------------------------------------------------------------
alter table public.article_sessions enable row level security;
create policy article_sessions_select_staff on public.article_sessions
  for select to authenticated using (public.has_role_at_least('editor'));

alter table public.post_video_progress enable row level security;
create policy post_video_progress_select_staff on public.post_video_progress
  for select to authenticated using (public.has_role_at_least('editor'));

alter table public.engagement_events enable row level security;
create policy engagement_events_select_staff on public.engagement_events
  for select to authenticated using (public.has_role_at_least('editor'));

-- ---------------------------------------------------------------------------
-- Ads
-- ---------------------------------------------------------------------------
alter table public.ad_slots enable row level security;
create policy ad_slots_select_public on public.ad_slots
  for select to anon, authenticated using (status = 'active');
create policy ad_slots_select_staff on public.ad_slots
  for select to authenticated using (public.has_role_at_least('admin'));
create policy ad_slots_write_admin on public.ad_slots
  for all to authenticated
  using (public.has_role_at_least('admin')) with check (public.has_role_at_least('admin'));

alter table public.ad_placements enable row level security;
create policy ad_placements_select_public on public.ad_placements
  for select to anon, authenticated using (is_enabled);
create policy ad_placements_select_staff on public.ad_placements
  for select to authenticated using (public.has_role_at_least('admin'));
create policy ad_placements_write_admin on public.ad_placements
  for all to authenticated
  using (public.has_role_at_least('admin')) with check (public.has_role_at_least('admin'));

alter table public.post_ad_placements enable row level security;
create policy post_ad_placements_select_public on public.post_ad_placements
  for select to anon, authenticated using (true);
create policy post_ad_placements_write_admin on public.post_ad_placements
  for all to authenticated
  using (public.has_role_at_least('admin')) with check (public.has_role_at_least('admin'));

alter table public.ad_events enable row level security;
create policy ad_events_select_staff on public.ad_events
  for select to authenticated using (public.has_role_at_least('admin'));

alter table public.adsense_reports enable row level security;
create policy adsense_reports_select_staff on public.adsense_reports
  for select to authenticated using (public.has_role_at_least('admin'));

-- ---------------------------------------------------------------------------
-- comments — public reads approved only; anyone may submit (forced to
-- pending by trigger); editor+ moderate.
-- ---------------------------------------------------------------------------
alter table public.comments enable row level security;

create policy comments_select_approved on public.comments
  for select to anon, authenticated using (status = 'approved');
create policy comments_select_staff on public.comments
  for select to authenticated using (public.has_role_at_least('editor'));

create policy comments_insert_public on public.comments
  for insert to anon, authenticated with check (true); -- status is forced server-side by trigger

create policy comments_moderate_staff on public.comments
  for update to authenticated
  using (public.has_role_at_least('editor')) with check (public.has_role_at_least('editor'));
create policy comments_delete_staff on public.comments
  for delete to authenticated using (public.has_role_at_least('editor'));

-- ---------------------------------------------------------------------------
-- activity_logs — any signed-in staff member may log their own action;
-- only admin+ can read the audit trail.
-- ---------------------------------------------------------------------------
alter table public.activity_logs enable row level security;

create policy activity_logs_insert_self on public.activity_logs
  for insert to authenticated with check (user_id = auth.uid());
create policy activity_logs_select_admin on public.activity_logs
  for select to authenticated using (public.has_role_at_least('admin'));
