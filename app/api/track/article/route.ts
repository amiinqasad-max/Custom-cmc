import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { articleTrackSchema } from "@/schemas/tracking";
import { clampPercent, clampTimeSpent } from "@/lib/tracking/antiFraud";
import { getOrCreateArticleSession, evaluateAndPersistCompletion } from "@/services/tracking.service";
import { ANON_ID_COOKIE } from "@/lib/constants";
import { checkRateLimit } from "@/lib/tracking/rateLimit";
import type { TablesUpdate } from "@/types/database.types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const parsed = articleTrackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const input = parsed.data;

  const anonId = request.cookies.get(ANON_ID_COOKIE)?.value ?? null;
  if (!(await checkRateLimit(`article:${anonId ?? "anon"}`))) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const session = await getOrCreateArticleSession(admin, {
    postId: input.postId,
    sessionToken: input.sessionToken,
    userId: user?.id ?? null,
    anonSessionId: anonId,
    referrer: input.referrer,
    userAgent: request.headers.get("user-agent"),
  });

  if (input.event === "next_opened") {
    await admin.from("engagement_events").insert({
      event_type: "next_article_opened",
      post_id: input.postId,
      session_token: input.sessionToken,
      user_id: user?.id ?? null,
      payload: { next_post_id: input.nextPostId ?? null },
    });
    return NextResponse.json({ ok: true });
  }

  const patch: TablesUpdate<"article_sessions"> = { last_activity_at: new Date().toISOString() };
  const newlyCrossed: string[] = [];

  if (input.progressPercent !== undefined) {
    const clamped = clampPercent(input.progressPercent);
    const nextProgress = Math.max(session.progress_percent, clamped);
    patch.progress_percent = nextProgress;
    for (const [threshold, field] of [
      [25, "reached_25"],
      [50, "reached_50"],
      [75, "reached_75"],
      [90, "reached_90"],
    ] as const) {
      const already = session[field];
      if (!already && nextProgress >= threshold) {
        patch[field] = true;
        newlyCrossed.push(`article_${threshold}`);
      }
    }
  }

  if (input.timeSpentSeconds !== undefined) {
    patch.time_spent_seconds = clampTimeSpent(session.time_spent_seconds, input.timeSpentSeconds);
  }

  if (input.event === "bottom" && !session.bottom_reached) {
    patch.bottom_reached = true;
    newlyCrossed.push("article_bottom");
  }

  await admin.from("article_sessions").update(patch).eq("id", session.id);

  if (input.event === "open") newlyCrossed.push("article_open");
  if (newlyCrossed.length) {
    await admin.from("engagement_events").insert(
      newlyCrossed.map((eventType) => ({
        event_type: eventType,
        post_id: input.postId,
        session_token: input.sessionToken,
        user_id: user?.id ?? null,
        payload: {},
      }))
    );
  }

  const { justCompleted, nextArticle } = await evaluateAndPersistCompletion(admin, session.id);
  if (justCompleted) {
    await admin.from("engagement_events").insert({
      event_type: "article_complete",
      post_id: input.postId,
      session_token: input.sessionToken,
      user_id: user?.id ?? null,
      payload: {},
    });
  }

  return NextResponse.json({
    completed: justCompleted || session.completed,
    nextArticle: nextArticle ? { id: nextArticle.id, slug: nextArticle.slug, title: nextArticle.title } : null,
  });
}
