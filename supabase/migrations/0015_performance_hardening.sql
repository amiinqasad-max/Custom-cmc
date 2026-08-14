-- ============================================================================
-- Performance hardening (Supabase performance advisor)
--
--   1. auth_rls_initplan: RLS policies that called auth.uid() directly get it
--      re-evaluated once per row. Wrapping it as `(select auth.uid())` lets
--      Postgres evaluate it once per statement (a documented Supabase/Postgres
--      RLS optimization) with identical semantics. 13 policies affected across
--      profiles, media, posts, post_tags, post_videos, activity_logs.
--   2. unindexed_foreign_keys: covering indexes for FK columns the advisor
--      flagged as unindexed, so joins/deletes on the referenced side don't
--      force a sequential scan.
--
-- multiple_permissive_policies and unused_index advisories were reviewed and
-- deliberately left as-is: the former is inherent to the "public row OR staff
-- row" policy pattern used throughout (splitting further would add complexity
-- for no behavior change), the latter is expected noise on a fresh database
-- with no query history yet.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. auth_rls_initplan fixes — same logic, auth.uid() wrapped in a subselect.
-- ---------------------------------------------------------------------------

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists profiles_update_own_or_staff on public.profiles;
create policy profiles_update_own_or_staff on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.has_role_at_least('admin'))
  with check (id = (select auth.uid()) or public.has_role_at_least('admin'));

drop policy if exists profiles_delete_staff on public.profiles;
create policy profiles_delete_staff on public.profiles
  for delete to authenticated
  using (public.has_role_at_least('admin') and role <> 'super_admin' and id <> (select auth.uid()));

-- media
drop policy if exists media_insert_staff on public.media;
create policy media_insert_staff on public.media
  for insert to authenticated
  with check (public.has_role_at_least('author') and uploaded_by = (select auth.uid()));

drop policy if exists media_modify_own_or_editor on public.media;
create policy media_modify_own_or_editor on public.media
  for update to authenticated
  using (uploaded_by = (select auth.uid()) or public.has_role_at_least('editor'))
  with check (uploaded_by = (select auth.uid()) or public.has_role_at_least('editor'));

drop policy if exists media_delete_own_or_editor on public.media;
create policy media_delete_own_or_editor on public.media
  for delete to authenticated
  using (uploaded_by = (select auth.uid()) or public.has_role_at_least('editor'));

-- posts
drop policy if exists posts_select_own_or_staff on public.posts;
create policy posts_select_own_or_staff on public.posts
  for select to authenticated
  using (author_id = (select auth.uid()) or public.has_role_at_least('editor'));

drop policy if exists posts_insert_author on public.posts;
create policy posts_insert_author on public.posts
  for insert to authenticated
  with check (
    public.has_role_at_least('author')
    and (author_id = (select auth.uid()) or public.has_role_at_least('editor'))
  );

drop policy if exists posts_update_own_or_editor on public.posts;
create policy posts_update_own_or_editor on public.posts
  for update to authenticated
  using (
    (author_id = (select auth.uid()) and public.has_role_at_least('author'))
    or public.has_role_at_least('editor')
  )
  with check (
    (author_id = (select auth.uid()) and public.has_role_at_least('author'))
    or public.has_role_at_least('editor')
  );

drop policy if exists posts_delete_own_or_editor on public.posts;
create policy posts_delete_own_or_editor on public.posts
  for delete to authenticated
  using (
    (author_id = (select auth.uid()) and public.has_role_at_least('author'))
    or public.has_role_at_least('editor')
  );

-- post_tags
drop policy if exists post_tags_write_staff on public.post_tags;
create policy post_tags_write_staff on public.post_tags
  for all to authenticated
  using (
    exists (
      select 1 from public.posts p where p.id = post_id
      and (p.author_id = (select auth.uid()) or public.has_role_at_least('editor'))
    )
  )
  with check (
    exists (
      select 1 from public.posts p where p.id = post_id
      and (p.author_id = (select auth.uid()) or public.has_role_at_least('editor'))
    )
  );

-- post_videos
drop policy if exists post_videos_write_staff on public.post_videos;
create policy post_videos_write_staff on public.post_videos
  for all to authenticated
  using (
    exists (
      select 1 from public.posts p where p.id = post_id
      and (p.author_id = (select auth.uid()) or public.has_role_at_least('editor'))
    )
  )
  with check (
    exists (
      select 1 from public.posts p where p.id = post_id
      and (p.author_id = (select auth.uid()) or public.has_role_at_least('editor'))
    )
  );

-- activity_logs
drop policy if exists activity_logs_insert_self on public.activity_logs;
create policy activity_logs_insert_self on public.activity_logs
  for insert to authenticated with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. Covering indexes for unindexed foreign keys.
-- ---------------------------------------------------------------------------
create index if not exists ad_placements_ad_slot_id_idx on public.ad_placements (ad_slot_id);
create index if not exists adsense_reports_post_id_idx on public.adsense_reports (post_id);
create index if not exists categories_image_id_idx on public.categories (image_id);
create index if not exists comments_author_user_id_idx on public.comments (author_user_id);
create index if not exists comments_parent_id_idx on public.comments (parent_id);
create index if not exists engagement_events_ad_placement_id_idx on public.engagement_events (ad_placement_id);
create index if not exists engagement_events_post_video_id_idx on public.engagement_events (post_video_id);
create index if not exists engagement_events_user_id_idx on public.engagement_events (user_id);
create index if not exists pages_author_id_idx on public.pages (author_id);
create index if not exists pages_featured_image_id_idx on public.pages (featured_image_id);
create index if not exists post_ad_placements_ad_placement_id_idx on public.post_ad_placements (ad_placement_id);
create index if not exists post_videos_media_id_idx on public.post_videos (media_id);
create index if not exists posts_featured_image_id_idx on public.posts (featured_image_id);
create index if not exists posts_next_article_id_idx on public.posts (next_article_id);
create index if not exists role_permissions_permission_key_idx on public.role_permissions (permission_key);
create index if not exists seo_metadata_og_image_id_idx on public.seo_metadata (og_image_id);
create index if not exists settings_updated_by_idx on public.settings (updated_by);
