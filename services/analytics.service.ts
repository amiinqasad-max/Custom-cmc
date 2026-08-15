import "server-only";

import { createClient } from "@/lib/supabase/server";

export type OverviewAnalytics = {
  visitors: number;
  pageviews: number;
  sessions: number;
  avgSessionDurationSeconds: number;
  avgReadingTimeMinutes: number;
  articleCompletionRate: number;
  videoCompletionRate: number;
  dailySeries: Array<{ date: string; pageviews: number; completions: number }>;
};

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function getOverviewAnalytics(days = 30): Promise<OverviewAnalytics> {
  const supabase = await createClient();
  const since = daysAgoIso(days);

  const { data: sessions } = await supabase
    .from("article_sessions")
    .select("id, user_id, anon_session_id, time_spent_seconds, completed, started_at")
    .gte("started_at", since);

  const rows = sessions ?? [];
  const uniqueVisitors = new Set(rows.map((r) => r.user_id ?? r.anon_session_id ?? r.id)).size;
  const totalTime = rows.reduce((sum, r) => sum + r.time_spent_seconds, 0);
  const completedCount = rows.filter((r) => r.completed).length;

  const { data: videoProgress } = await supabase
    .from("post_video_progress")
    .select("completed, article_session_id")
    .in(
      "article_session_id",
      rows.map((r) => r.id).slice(0, 5000) // guard against pathological IN-list size
    );
  const videoRows = videoProgress ?? [];
  const videoCompletionRate = videoRows.length ? (videoRows.filter((v) => v.completed).length / videoRows.length) * 100 : 0;

  const { data: posts } = await supabase.from("posts").select("id, reading_time_minutes").eq("status", "published");
  const avgReadingTime = posts?.length ? posts.reduce((s, p) => s + p.reading_time_minutes, 0) / posts.length : 0;

  const byDay = new Map<string, { pageviews: number; completions: number }>();
  for (const r of rows) {
    const day = r.started_at.slice(0, 10);
    const entry = byDay.get(day) ?? { pageviews: 0, completions: 0 };
    entry.pageviews += 1;
    if (r.completed) entry.completions += 1;
    byDay.set(day, entry);
  }
  const dailySeries = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  return {
    visitors: uniqueVisitors,
    pageviews: rows.length,
    sessions: rows.length,
    avgSessionDurationSeconds: rows.length ? Math.round(totalTime / rows.length) : 0,
    avgReadingTimeMinutes: Math.round(avgReadingTime * 10) / 10,
    articleCompletionRate: rows.length ? Math.round((completedCount / rows.length) * 1000) / 10 : 0,
    videoCompletionRate: Math.round(videoCompletionRate * 10) / 10,
    dailySeries,
  };
}

export type TopArticleRow = { postId: string; title: string; slug: string; views: number; completionRate: number };

export async function getTopArticles(limit = 10): Promise<TopArticleRow[]> {
  const supabase = await createClient();
  const { data: sessions } = await supabase.from("article_sessions").select("post_id, completed");
  if (!sessions?.length) return [];

  const byPost = new Map<string, { views: number; completed: number }>();
  for (const s of sessions) {
    const entry = byPost.get(s.post_id) ?? { views: 0, completed: 0 };
    entry.views += 1;
    if (s.completed) entry.completed += 1;
    byPost.set(s.post_id, entry);
  }

  const sortedIds = [...byPost.entries()].sort((a, b) => b[1].views - a[1].views).slice(0, limit);
  const { data: posts } = await supabase.from("posts").select("id, title, slug").in("id", sortedIds.map(([id]) => id));
  const postById = new Map((posts ?? []).map((p) => [p.id, p]));

  return sortedIds
    .map(([postId, stats]) => {
      const post = postById.get(postId);
      if (!post) return null;
      return {
        postId,
        title: post.title,
        slug: post.slug,
        views: stats.views,
        completionRate: Math.round((stats.completed / stats.views) * 1000) / 10,
      };
    })
    .filter((r): r is TopArticleRow => r !== null);
}

export type TopVideoRow = { postVideoId: string; postTitle: string; slotIndex: number; plays: number; completionRate: number };

export async function getTopVideos(limit = 10): Promise<TopVideoRow[]> {
  const supabase = await createClient();
  const { data: progress } = await supabase.from("post_video_progress").select("post_video_id, completed, play_count");
  if (!progress?.length) return [];

  const byVideo = new Map<string, { plays: number; completed: number; sessions: number }>();
  for (const p of progress) {
    const entry = byVideo.get(p.post_video_id) ?? { plays: 0, completed: 0, sessions: 0 };
    entry.plays += p.play_count;
    entry.sessions += 1;
    if (p.completed) entry.completed += 1;
    byVideo.set(p.post_video_id, entry);
  }

  const sortedIds = [...byVideo.entries()].sort((a, b) => b[1].sessions - a[1].sessions).slice(0, limit);
  const { data: videos } = await supabase.from("post_videos").select("id, post_id, slot_index").in("id", sortedIds.map(([id]) => id));
  const postIds = [...new Set((videos ?? []).map((v) => v.post_id))];
  const { data: posts } = postIds.length ? await supabase.from("posts").select("id, title").in("id", postIds) : { data: [] };
  const postById = new Map((posts ?? []).map((p) => [p.id, p.title]));
  const videoById = new Map((videos ?? []).map((v) => [v.id, v]));

  return sortedIds
    .map(([postVideoId, stats]) => {
      const video = videoById.get(postVideoId);
      if (!video) return null;
      return {
        postVideoId,
        postTitle: postById.get(video.post_id) ?? "Untitled",
        slotIndex: video.slot_index,
        plays: stats.plays,
        completionRate: Math.round((stats.completed / stats.sessions) * 1000) / 10,
      };
    })
    .filter((r): r is TopVideoRow => r !== null);
}

export type VideoOverviewRow = {
  postVideoId: string;
  postId: string;
  postTitle: string;
  slotIndex: number;
  durationSeconds: number | null;
  required: boolean;
  played: number;
  completed: number;
  completionRate: number;
};

/** All configured videos site-wide with their engagement stats, for the dedicated Videos admin screen. */
export async function listAllVideosWithStats(): Promise<VideoOverviewRow[]> {
  const supabase = await createClient();
  const { data: videos } = await supabase.from("post_videos").select("id, post_id, slot_index, duration_seconds, required").order("created_at", { ascending: false });
  if (!videos?.length) return [];

  const { data: progress } = await supabase.from("post_video_progress").select("post_video_id, completed");
  const statsByVideo = new Map<string, { played: number; completed: number }>();
  for (const p of progress ?? []) {
    const entry = statsByVideo.get(p.post_video_id) ?? { played: 0, completed: 0 };
    entry.played += 1;
    if (p.completed) entry.completed += 1;
    statsByVideo.set(p.post_video_id, entry);
  }

  const postIds = [...new Set(videos.map((v) => v.post_id))];
  const { data: posts } = postIds.length ? await supabase.from("posts").select("id, title").in("id", postIds) : { data: [] };
  const postById = new Map((posts ?? []).map((p) => [p.id, p.title]));

  return videos.map((v) => {
    const stats = statsByVideo.get(v.id) ?? { played: 0, completed: 0 };
    return {
      postVideoId: v.id,
      postId: v.post_id,
      postTitle: postById.get(v.post_id) ?? "Untitled",
      slotIndex: v.slot_index,
      durationSeconds: v.duration_seconds,
      required: v.required,
      played: stats.played,
      completed: stats.completed,
      completionRate: stats.played ? Math.round((stats.completed / stats.played) * 1000) / 10 : 0,
    };
  });
}

export type LiveDashboardStats = {
  liveVisitors: number;
  pageviewsToday: number;
  videoViewsToday: number;
  videoCompletionsToday: number;
  videoCompletionRateToday: number;
  overallVideoCompletionRate: number;
};

const EMPTY_LIVE_STATS: LiveDashboardStats = {
  liveVisitors: 0,
  pageviewsToday: 0,
  videoViewsToday: 0,
  videoCompletionsToday: 0,
  videoCompletionRateToday: 0,
  overallVideoCompletionRate: 0,
};

/**
 * Backs the dashboard's live-updating stat row (components/admin/analytics/
 * live-stats-bar.tsx polls this every ~15s). A single RPC round trip —
 * see supabase/migrations/0016_live_dashboard_stats.sql for why this is a
 * SQL function instead of the row-fetch-then-reduce-in-JS pattern the rest
 * of this file uses: that pattern is fine for one SSR render, too expensive
 * to repeat on a timer.
 */
export async function getLiveDashboardStats(): Promise<LiveDashboardStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_live_dashboard_stats");
  if (error || !data?.[0]) return EMPTY_LIVE_STATS;

  const row = data[0];
  return {
    liveVisitors: row.live_visitors,
    pageviewsToday: row.pageviews_today,
    videoViewsToday: row.video_views_today,
    videoCompletionsToday: row.video_completions_today,
    videoCompletionRateToday: row.video_completion_rate_today,
    overallVideoCompletionRate: row.overall_video_completion_rate,
  };
}

export type ArticleAnalytics = {
  views: number;
  uniqueSessions: number;
  avgProgress: number;
  avgReadingTimeSeconds: number;
  completed: number;
  completionRate: number;
  bottomReached: number;
  videos: Array<{ slotIndex: number; played: number; completed: number; completionRate: number }>;
  fullVideoCompletionRate: number;
  nextArticleOpenRate: number;
};

export async function getArticleAnalytics(postId: string): Promise<ArticleAnalytics> {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("article_sessions")
    .select("id, progress_percent, time_spent_seconds, completed, bottom_reached")
    .eq("post_id", postId);
  const rows = sessions ?? [];

  const { data: postVideos } = await supabase.from("post_videos").select("id, slot_index").eq("post_id", postId).order("slot_index");
  const videoIds = (postVideos ?? []).map((v) => v.id);

  const { data: progress } = videoIds.length
    ? await supabase.from("post_video_progress").select("post_video_id, completed, article_session_id").in("post_video_id", videoIds)
    : { data: [] as Array<{ post_video_id: string; completed: boolean; article_session_id: string }> };

  const videos = (postVideos ?? []).map((v) => {
    const rowsForVideo = (progress ?? []).filter((p) => p.post_video_id === v.id);
    const completed = rowsForVideo.filter((p) => p.completed).length;
    return {
      slotIndex: v.slot_index,
      played: rowsForVideo.length,
      completed,
      completionRate: rowsForVideo.length ? Math.round((completed / rowsForVideo.length) * 1000) / 10 : 0,
    };
  });

  const sessionsWithAllVideosComplete = rows.filter((session) =>
    videoIds.every((vid) => (progress ?? []).some((p) => p.article_session_id === session.id && p.post_video_id === vid && p.completed))
  ).length;

  const { count: nextOpenedCount } = await supabase
    .from("engagement_events")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId)
    .eq("event_type", "next_article_opened");

  const completedCount = rows.filter((r) => r.completed).length;

  return {
    views: rows.length,
    uniqueSessions: rows.length,
    avgProgress: rows.length ? Math.round(rows.reduce((s, r) => s + r.progress_percent, 0) / rows.length) : 0,
    avgReadingTimeSeconds: rows.length ? Math.round(rows.reduce((s, r) => s + r.time_spent_seconds, 0) / rows.length) : 0,
    completed: completedCount,
    completionRate: rows.length ? Math.round((completedCount / rows.length) * 1000) / 10 : 0,
    bottomReached: rows.filter((r) => r.bottom_reached).length,
    videos,
    fullVideoCompletionRate: rows.length && videoIds.length ? Math.round((sessionsWithAllVideosComplete / rows.length) * 1000) / 10 : 0,
    nextArticleOpenRate: completedCount ? Math.round(((nextOpenedCount ?? 0) / completedCount) * 1000) / 10 : 0,
  };
}
