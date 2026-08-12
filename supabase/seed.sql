-- ============================================================================
-- Development seed data. Safe to run repeatedly (idempotent upserts).
-- Run with: supabase db execute -f supabase/seed.sql   (or paste into the
-- Supabase SQL editor after the migrations above have been applied).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Permission catalog + default role -> permission matrix.
-- super_admin implicitly has every permission (see has_permission()), rows
-- below are still inserted so the Users -> Roles admin screen has something
-- to render and toggle.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Default settings groups.
-- ----------------------------------------------------------------------------
insert into public.settings (key, value) values
  ('general', jsonb_build_object(
    'site_name', 'My Content Site',
    'site_description', 'A modern, fast content site.',
    'logo_url', null,
    'favicon_url', null,
    'timezone', 'UTC',
    'language', 'en'
  )),
  ('reading', jsonb_build_object(
    'completion_threshold_percent', 90,
    'video_completion_threshold_percent', 90,
    'auto_next_enabled', true,
    'auto_next_delay_ms', 1500,
    'next_article_strategy', 'same_category' -- 'same_category' | 'algorithmic'
  )),
  ('ads', jsonb_build_object(
    'max_ads_per_article', 5,
    'min_paragraphs_between_ads', 4,
    'min_content_length_before_ads', 150,
    'disable_on_pages', true,
    'disable_on_short_articles', true,
    'short_article_word_count', 300,
    'excluded_category_ids', '[]'::jsonb,
    'excluded_post_ids', '[]'::jsonb
  )),
  ('seo_defaults', jsonb_build_object(
    'default_seo_title_suffix', ' | My Content Site',
    'default_meta_description', 'A modern, fast content site.',
    'default_og_image_url', null,
    'twitter_handle', null,
    'organization_name', 'My Content Site',
    'organization_logo_url', null
  )),
  ('social', jsonb_build_object(
    'facebook_url', null, 'twitter_url', null, 'instagram_url', null, 'youtube_url', null, 'linkedin_url', null
  )),
  ('analytics', jsonb_build_object(
    'anonymous_tracking_enabled', true,
    'heartbeat_interval_seconds', 15
  )),
  ('security', jsonb_build_object(
    'track_api_rate_limit_per_minute', 120
  )),
  ('content', jsonb_build_object(
    'default_post_status', 'draft',
    'comments_enabled', true
  )),
  ('performance', jsonb_build_object(
    'public_page_revalidate_seconds', 60
  )),
  ('email', jsonb_build_object(
    'from_name', 'My Content Site',
    'from_email', null,
    'reply_to', null
  ))
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- Starter taxonomy + pages (all drafts — publish from the admin once reviewed).
-- ----------------------------------------------------------------------------
insert into public.categories (name, slug, description) values
  ('Technology', 'technology', 'Tech news and how-tos'),
  ('Finance', 'finance', 'Money, budgeting, and investing'),
  ('Business', 'business', 'Business strategy and growth'),
  ('Education', 'education', 'Learning and career development')
on conflict (slug) do nothing;

insert into public.pages (title, slug, status, content) values
  ('About', 'about', 'draft', '{"type":"doc","content":[]}'::jsonb),
  ('Contact', 'contact', 'draft', '{"type":"doc","content":[]}'::jsonb),
  ('Privacy Policy', 'privacy-policy', 'draft', '{"type":"doc","content":[]}'::jsonb),
  ('Terms of Service', 'terms', 'draft', '{"type":"doc","content":[]}'::jsonb),
  ('Disclaimer', 'disclaimer', 'draft', '{"type":"doc","content":[]}'::jsonb),
  ('Cookie Policy', 'cookie-policy', 'draft', '{"type":"doc","content":[]}'::jsonb)
on conflict (slug) do nothing;

insert into public.menus (name, slug, location) values
  ('Header Menu', 'header', 'header'),
  ('Footer Menu', 'footer', 'footer')
on conflict (slug) do nothing;
