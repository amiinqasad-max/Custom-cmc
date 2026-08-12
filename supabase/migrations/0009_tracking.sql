-- ============================================================================
-- Engagement tracking. High write volume, server-write-only (see RLS in
-- 0012_rls_policies.sql — no anon/authenticated INSERT/UPDATE grants; all
-- writes go through /api/track/* using the service-role client after
-- validation + anti-fraud checks in lib/tracking/*).
-- ============================================================================

create table public.article_sessions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  anon_session_id text, -- cms_anon_id cookie value, for signed-out readers
  session_token uuid not null unique, -- generated client-side, cached in sessionStorage per article view

  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),

  progress_percent int not null default 0 check (progress_percent between 0 and 100),
  reached_25 boolean not null default false,
  reached_50 boolean not null default false,
  reached_75 boolean not null default false,
  reached_90 boolean not null default false,
  bottom_reached boolean not null default false,

  time_spent_seconds int not null default 0 check (time_spent_seconds >= 0),

  completed boolean not null default false,
  completed_at timestamptz,

  referrer text,
  user_agent text,

  constraint article_sessions_user_or_anon check (user_id is not null or anon_session_id is not null)
);
comment on table public.article_sessions is
  'One row per article "visit" (a session_token generated client-side and cached in sessionStorage, so a page refresh resumes rather than duplicating). Reading progress + time-on-page are batched here, not written every second.';

create index article_sessions_post_id_idx on public.article_sessions (post_id, started_at desc);
create index article_sessions_user_id_idx on public.article_sessions (user_id);
create index article_sessions_anon_id_idx on public.article_sessions (anon_session_id);
create index article_sessions_completed_idx on public.article_sessions (post_id) where completed;

create table public.post_video_progress (
  id uuid primary key default gen_random_uuid(),
  article_session_id uuid not null references public.article_sessions (id) on delete cascade,
  post_video_id uuid not null references public.post_videos (id) on delete cascade,

  watched_seconds numeric(10, 3) not null default 0 check (watched_seconds >= 0),
  max_watched_seconds numeric(10, 3) not null default 0 check (max_watched_seconds >= 0), -- monotonic high-water mark, immune to seeking backward
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

create index post_video_progress_video_id_idx on public.post_video_progress (post_video_id);

-- ----------------------------------------------------------------------------
-- Append-only raw event log — powers analytics aggregation and audit trail.
-- Indexed for "events for this post in this window" queries; a candidate for
-- monthly partitioning (`created_at`) once volume warrants it.
-- ----------------------------------------------------------------------------
create table public.engagement_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  post_id uuid references public.posts (id) on delete cascade,
  post_video_id uuid references public.post_videos (id) on delete set null,
  ad_placement_id uuid, -- FK added in 0010_ads.sql after ad_placements exists
  session_token uuid,
  user_id uuid references public.profiles (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
comment on table public.engagement_events is
  'Append-only raw event stream (article_open, article_25/50/75/90, video_play, video_complete, next_article_opened, ad_render, ...).';

create index engagement_events_post_id_created_idx on public.engagement_events (post_id, created_at desc);
create index engagement_events_type_created_idx on public.engagement_events (event_type, created_at desc);
