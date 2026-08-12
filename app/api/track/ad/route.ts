import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { adTrackSchema } from "@/schemas/adTrack";
import { ANON_ID_COOKIE } from "@/lib/constants";
import { checkRateLimit } from "@/lib/tracking/rateLimit";

export const runtime = "nodejs";

/**
 * Internal, best-effort ad *rendering* analytics only (§20/§21) — never
 * official AdSense impression/click/revenue data. That distinction is
 * surfaced explicitly in the admin Advertisements analytics screen.
 */
export async function POST(request: NextRequest) {
  const parsed = adTrackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const anonId = request.cookies.get(ANON_ID_COOKIE)?.value ?? null;
  if (!(await checkRateLimit(`ad:${anonId ?? "anon"}`, 300))) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const admin = createAdminClient();
  await admin.from("ad_events").insert({
    ad_placement_id: parsed.data.placementId,
    post_id: parsed.data.postId ?? null,
    session_token: parsed.data.sessionToken ?? null,
    event_type: parsed.data.eventType,
  });

  return NextResponse.json({ ok: true });
}
