import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/guards";
import { roleAtLeast } from "@/lib/auth/permissions";
import { getLiveDashboardStats } from "@/services/analytics.service";

export const runtime = "nodejs";

/**
 * Polled by components/admin/analytics/live-stats-bar.tsx to drive the
 * dashboard's live-updating stat row. Cookie-authenticated (not a public
 * endpoint). Route Handlers can't use lib/auth/guards.ts#requireRole — it
 * calls next/navigation's redirect(), which only works inside Server
 * Components/Server Actions — so this checks manually and returns a plain
 * 401/403 instead. The underlying RPC is itself RLS-scoped to staff, so
 * there's no path to real numbers without being signed in as editor+ even
 * if this check were somehow bypassed.
 */
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!roleAtLeast(profile.role, "editor")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const stats = await getLiveDashboardStats();
  return NextResponse.json(stats);
}
