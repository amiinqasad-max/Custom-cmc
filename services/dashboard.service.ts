import "server-only";

import { createClient } from "@/lib/supabase/server";

export type DashboardOverview = {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  scheduledPosts: number;
  totalVisitors: number;
  totalPageviews: number;
  articleCompletionRate: number | null;
  avgReadingTimeSeconds: number | null;
  videoCompletionRate: number | null;
  adImpressions: number;
  adRenderRate: number | null;
  recentPosts: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    updated_at: string;
    author_name: string | null;
  }>;
  topArticles: Array<{ post_id: string; title: string; slug: string; views: number }>;
};

/**
 * Aggregates the Dashboard -> Overview KPIs. Counts run under the signed-in
 * user's RLS (an `author` only sees their own posts, matching what they're
 * allowed to manage). Engagement/ad metrics read 0 / null gracefully until
 * there is real traffic — they light up automatically once Phase 6/7
 * tracking starts writing rows, no code changes needed here.
 */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  const supabase = await createClient();

  const [{ count: totalPosts }, { count: publishedPosts }, { count: draftPosts }, { count: scheduledPosts }] =
    await Promise.all([
      supabase.from("posts").select("*", { count: "exact", head: true }),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "scheduled"),
    ]);

  const { count: totalSessions } = await supabase
    .from("article_sessions")
    .select("*", { count: "exact", head: true });

  const { count: completedSessions } = await supabase
    .from("article_sessions")
    .select("*", { count: "exact", head: true })
    .eq("completed", true);

  const { count: adRenderCount } = await supabase
    .from("ad_events")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "render");

  const { count: adRequestCount } = await supabase
    .from("ad_events")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "request");

  const { data: recentPostsRaw } = await supabase
    .from("posts")
    .select("id, title, slug, status, updated_at, author_id")
    .order("updated_at", { ascending: false })
    .limit(6);

  const authorIds = [...new Set((recentPostsRaw ?? []).map((p) => p.author_id).filter(Boolean))] as string[];
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", authorIds)
    : { data: [] as Array<{ id: string; display_name: string | null }> };
  const authorNameById = new Map((authors ?? []).map((a) => [a.id, a.display_name]));

  const recentPosts = (recentPostsRaw ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    status: p.status,
    updated_at: p.updated_at,
    author_name: p.author_id ? (authorNameById.get(p.author_id) ?? null) : null,
  }));

  return {
    totalPosts: totalPosts ?? 0,
    publishedPosts: publishedPosts ?? 0,
    draftPosts: draftPosts ?? 0,
    scheduledPosts: scheduledPosts ?? 0,
    totalVisitors: totalSessions ?? 0,
    totalPageviews: totalSessions ?? 0,
    articleCompletionRate:
      totalSessions && totalSessions > 0 ? Math.round(((completedSessions ?? 0) / totalSessions) * 1000) / 10 : null,
    avgReadingTimeSeconds: null,
    videoCompletionRate: null,
    adImpressions: adRenderCount ?? 0,
    adRenderRate: adRequestCount && adRequestCount > 0 ? Math.round(((adRenderCount ?? 0) / adRequestCount) * 1000) / 10 : null,
    recentPosts,
    topArticles: [],
  };
}
