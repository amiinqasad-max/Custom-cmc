-- ============================================================================
-- Real-time admin dashboard stats.
--
-- Rather than have the polling client re-run the same JS-side aggregation
-- services/analytics.service.ts already does for the 30-day overview (which
-- pulls full row sets into Node and reduces them — fine for one SSR render,
-- much too expensive to repeat every few seconds), this does the counting
-- inside Postgres in a single round trip. SECURITY INVOKER (the default) —
-- it runs under the calling user's own RLS, so it naturally returns real
-- numbers only for staff (article_sessions/post_video_progress SELECT is
-- staff-only per 0012_rls_policies.sql) and zeros for anyone else, with no
-- separate permission model to keep in sync.
--
-- Indexes: article_sessions/post_video_progress already had FK/composite
-- indexes, but nothing to filter "everything since a timestamp, across all
-- posts" cheaply — every existing index on these tables is post-scoped.
-- ============================================================================

create index if not exists article_sessions_last_activity_idx on public.article_sessions (last_activity_at);
create index if not exists article_sessions_started_at_idx on public.article_sessions (started_at);
create index if not exists post_video_progress_started_at_idx on public.post_video_progress (started_at);
create index if not exists post_video_progress_completed_at_idx on public.post_video_progress (completed_at) where completed_at is not null;

create or replace function public.get_live_dashboard_stats(live_window_minutes int default 5)
returns table (
  live_visitors bigint,
  pageviews_today bigint,
  video_views_today bigint,
  video_completions_today bigint,
  video_completion_rate_today numeric,
  overall_video_views bigint,
  overall_video_completions bigint,
  overall_video_completion_rate numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with sessions_agg as (
    select
      -- Distinct visitors (signed-in user, else anon cookie, else the
      -- session token itself) active in the last N minutes.
      count(distinct coalesce(user_id::text, anon_session_id, session_token::text))
        filter (where last_activity_at >= now() - make_interval(mins => live_window_minutes)) as live_visitors,
      count(*) filter (where started_at >= date_trunc('day', now())) as pageviews_today
    from public.article_sessions
  ),
  video_agg as (
    select
      count(*) filter (where started_at >= date_trunc('day', now())) as video_views_today,
      count(*) filter (where completed and completed_at >= date_trunc('day', now())) as video_completions_today,
      count(*) as overall_video_views,
      count(*) filter (where completed) as overall_video_completions
    from public.post_video_progress
  )
  select
    s.live_visitors,
    s.pageviews_today,
    v.video_views_today,
    v.video_completions_today,
    case when v.video_views_today = 0 then 0
      else round(100.0 * v.video_completions_today / v.video_views_today, 1) end as video_completion_rate_today,
    v.overall_video_views,
    v.overall_video_completions,
    case when v.overall_video_views = 0 then 0
      else round(100.0 * v.overall_video_completions / v.overall_video_views, 1) end as overall_video_completion_rate
  from sessions_agg s cross join video_agg v;
$$;

comment on function public.get_live_dashboard_stats(int) is
  'Single-round-trip aggregate for the admin dashboard''s live-updating stat row (live visitors, pageviews today, video views/completions today and all-time). SECURITY INVOKER — respects the caller''s own RLS, so only staff get real numbers.';
