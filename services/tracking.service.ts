import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import { isArticleComplete } from "@/lib/tracking/completion";
import { resolveNextArticle, type PostSummary } from "@/lib/tracking/nextArticle";
import { getSetting } from "@/services/settings.service";

type AdminClient = SupabaseClient<Database>;

export async function getOrCreateArticleSession(
  admin: AdminClient,
  params: { postId: string; sessionToken: string; userId: string | null; anonSessionId: string | null; referrer?: string | null; userAgent?: string | null }
) {
  const { data: existing } = await admin
    .from("article_sessions")
    .select("*")
    .eq("session_token", params.sessionToken)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await admin
    .from("article_sessions")
    .insert({
      post_id: params.postId,
      session_token: params.sessionToken,
      user_id: params.userId,
      anon_session_id: params.anonSessionId,
      referrer: params.referrer ?? null,
      user_agent: params.userAgent ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create article session: ${error.message}`);
  return created;
}

/**
 * Recomputes article completion from the current state of the DB (never
 * from anything the client asserts) and persists it if changed. Called
 * after every article-progress AND every video-progress write, since
 * either one can be the thing that finally satisfies §7's AND condition.
 */
export async function evaluateAndPersistCompletion(admin: AdminClient, articleSessionId: string) {
  const { data: session, error } = await admin.from("article_sessions").select("*").eq("id", articleSessionId).single();
  if (error || !session) throw new Error("Article session not found");
  if (session.completed) {
    return { session, justCompleted: false, nextArticle: await resolveNextArticleForPost(admin, session.post_id) };
  }

  const [{ data: requiredVideos }, readingSettings, { data: post }] = await Promise.all([
    admin.from("post_videos").select("id, required, completion_threshold_percent").eq("post_id", session.post_id),
    getSetting("reading"),
    admin.from("posts").select("completion_threshold_percent").eq("id", session.post_id).single(),
  ]);

  const videoIds = (requiredVideos ?? []).map((v) => v.id);
  const { data: progressRows } = videoIds.length
    ? await admin.from("post_video_progress").select("post_video_id, completed").eq("article_session_id", articleSessionId).in("post_video_id", videoIds)
    : { data: [] as Array<{ post_video_id: string; completed: boolean }> };
  const completedByVideoId = new Map((progressRows ?? []).map((r) => [r.post_video_id, r.completed]));

  const threshold = post?.completion_threshold_percent ?? readingSettings.completion_threshold_percent;

  const completed = isArticleComplete({
    progressPercent: session.progress_percent,
    threshold,
    videos: (requiredVideos ?? []).map((v) => ({
      postVideoId: v.id,
      required: v.required,
      completed: completedByVideoId.get(v.id) ?? false,
    })),
  });

  if (!completed) return { session, justCompleted: false, nextArticle: null };

  const { data: updated } = await admin
    .from("article_sessions")
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq("id", articleSessionId)
    .select()
    .single();

  return {
    session: updated ?? session,
    justCompleted: true,
    nextArticle: await resolveNextArticleForPost(admin, session.post_id),
  };
}

export async function resolveNextArticleForPost(admin: AdminClient, postId: string) {
  const { data: post } = await admin
    .from("posts")
    .select("id, slug, title, status, category_id, published_at, next_article_id")
    .eq("id", postId)
    .single();
  if (!post) return null;

  const current: PostSummary = {
    id: post.id,
    slug: post.slug,
    title: post.title,
    status: post.status,
    categoryId: post.category_id,
    publishedAt: post.published_at,
  };

  const [manualNextRow, readingSettings, sameCategoryRows] = await Promise.all([
    post.next_article_id
      ? admin.from("posts").select("id, slug, title, status, category_id, published_at").eq("id", post.next_article_id).single()
      : Promise.resolve({ data: null }),
    getSetting("reading"),
    post.category_id
      ? admin
          .from("posts")
          .select("id, slug, title, status, category_id, published_at")
          .eq("category_id", post.category_id)
          .eq("status", "published")
          .neq("id", postId)
      : Promise.resolve({ data: [] as Array<{ id: string; slug: string; title: string; status: string; category_id: string | null; published_at: string | null }> }),
  ]);

  const toSummary = (r: { id: string; slug: string; title: string; status: string; category_id: string | null; published_at: string | null }): PostSummary => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    status: r.status,
    categoryId: r.category_id,
    publishedAt: r.published_at,
  });

  let algorithmicCandidates: PostSummary[] | undefined;
  if (readingSettings.next_article_strategy === "algorithmic") {
    const { data: recent } = await admin
      .from("posts")
      .select("id, slug, title, status, category_id, published_at")
      .eq("status", "published")
      .neq("id", postId)
      .order("published_at", { ascending: false })
      .limit(5);
    algorithmicCandidates = (recent ?? []).map(toSummary);
  }

  let randomCandidates: PostSummary[] | undefined;
  if (readingSettings.next_article_strategy === "random") {
    // Capped, not the whole table — cheap indexed scan (posts_status_published_idx)
    // rather than transferring an unbounded number of rows just to pick one.
    // Previously-read articles are deliberately not excluded (the reading
    // loop is meant to be able to resurface them).
    const { data: pool } = await admin
      .from("posts")
      .select("id, slug, title, status, category_id, published_at")
      .eq("status", "published")
      .neq("id", postId)
      .limit(500);
    // Never dead-end the loop: if this is the only published article on the
    // whole site, hand it back to itself rather than returning null.
    randomCandidates = pool?.length ? pool.map(toSummary) : current.status === "published" ? [current] : [];
  }

  return resolveNextArticle({
    current,
    manualNext: manualNextRow.data ? toSummary(manualNextRow.data) : null,
    strategy: readingSettings.next_article_strategy,
    sameCategoryCandidates: (sameCategoryRows.data ?? []).map(toSummary),
    algorithmicCandidates,
    randomCandidates,
  });
}
