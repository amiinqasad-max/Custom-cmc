import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  path: z.string().trim().min(1).max(2048),
  referrer: z.string().trim().max(2048).optional().nullable(),
});

/**
 * Best-effort 404 monitoring (§15). Fired once client-side from app/not-found.tsx.
 * Upserts an aggregate row per distinct path rather than logging every hit
 * as its own row, keeping this cheap even under a broken-link storm.
 */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const admin = createAdminClient();
  const { path, referrer } = parsed.data;

  const { data: existing } = await admin.from("not_found_logs").select("id, hit_count").eq("path", path).maybeSingle();

  if (existing) {
    await admin
      .from("not_found_logs")
      .update({ hit_count: existing.hit_count + 1, last_seen_at: new Date().toISOString(), referrer: referrer ?? null })
      .eq("id", existing.id);
  } else {
    await admin.from("not_found_logs").insert({ path, referrer: referrer ?? null });
  }

  return NextResponse.json({ ok: true });
}
