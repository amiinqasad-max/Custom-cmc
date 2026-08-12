import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { videoTrackSchema } from "@/schemas/tracking";
import { clampWatchedSeconds, monotonicMax } from "@/lib/tracking/antiFraud";
import { isVideoComplete, watchPercentage } from "@/lib/tracking/completion";
import { getOrCreateArticleSession, evaluateAndPersistCompletion } from "@/services/tracking.service";
import { ANON_ID_COOKIE } from "@/lib/constants";
import { checkRateLimit } from "@/lib/tracking/rateLimit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const parsed = videoTrackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const input = parsed.data;

  const anonId = request.cookies.get(ANON_ID_COOKIE)?.value ?? null;
  if (!(await checkRateLimit(`video:${anonId ?? "anon"}`))) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  const { data: postVideo } = await admin
    .from("post_videos")
    .select("*")
    .eq("post_id", input.postId)
    .eq("slot_index", input.slotIndex)
    .maybeSingle();
  if (!postVideo) return NextResponse.json({ error: "Video not configured for this article" }, { status: 404 });

  const session = await getOrCreateArticleSession(admin, {
    postId: input.postId,
    sessionToken: input.sessionToken,
    userId: user?.id ?? null,
    anonSessionId: anonId,
  });

  const { data: existingProgress } = await admin
    .from("post_video_progress")
    .select("*")
    .eq("article_session_id", session.id)
    .eq("post_video_id", postVideo.id)
    .maybeSingle();

  // Authoritative duration is whatever was detected at upload time and
  // stored on post_videos; the client's own reading is only a fallback for
  // the very first event before that has synced.
  const durationSeconds = postVideo.duration_seconds ?? input.clientDurationSeconds ?? null;

  const clampedCurrent = clampWatchedSeconds(input.currentTimeSeconds, durationSeconds);
  const maxWatched = monotonicMax(existingProgress?.max_watched_seconds ?? 0, clampedCurrent);
  const completed =
    existingProgress?.completed ||
    isVideoComplete({
      maxWatchedSeconds: maxWatched,
      durationSeconds,
      thresholdPercent: postVideo.completion_threshold_percent,
      nativeEndedFired: input.event === "ended",
    });

  const patch = {
    article_session_id: session.id,
    post_video_id: postVideo.id,
    watched_seconds: clampedCurrent,
    max_watched_seconds: maxWatched,
    watch_percentage: watchPercentage(maxWatched, durationSeconds),
    play_count: (existingProgress?.play_count ?? 0) + (input.event === "play" ? 1 : 0),
    completed,
    last_watched_at: new Date().toISOString(),
    completed_at: completed && !existingProgress?.completed ? new Date().toISOString() : (existingProgress?.completed_at ?? null),
  };

  await admin.from("post_video_progress").upsert(patch, { onConflict: "article_session_id,post_video_id" });

  const justCompletedVideo = completed && !existingProgress?.completed;
  if (justCompletedVideo) {
    await admin.from("engagement_events").insert({
      event_type: "video_complete",
      post_id: input.postId,
      post_video_id: postVideo.id,
      session_token: input.sessionToken,
      user_id: user?.id ?? null,
      payload: { slot_index: input.slotIndex },
    });
  }
  if (input.event === "play") {
    await admin.from("engagement_events").insert({
      event_type: "video_play",
      post_id: input.postId,
      post_video_id: postVideo.id,
      session_token: input.sessionToken,
      user_id: user?.id ?? null,
      payload: { slot_index: input.slotIndex },
    });
  }

  const { justCompleted: articleJustCompleted, nextArticle } = await evaluateAndPersistCompletion(admin, session.id);
  if (articleJustCompleted) {
    await admin.from("engagement_events").insert({
      event_type: "article_complete",
      post_id: input.postId,
      session_token: input.sessionToken,
      user_id: user?.id ?? null,
      payload: {},
    });
  }

  return NextResponse.json({
    videoCompleted: completed,
    watchPercentage: patch.watch_percentage,
    articleCompleted: articleJustCompleted || session.completed,
    nextArticle: nextArticle ? { id: nextArticle.id, slug: nextArticle.slug, title: nextArticle.title } : null,
  });
}
