"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Eye, PlayCircle, CheckCircle2, Percent, TrendingUp } from "lucide-react";

import { StatCard } from "@/components/admin/stat-card";
import type { LiveDashboardStats } from "@/services/analytics.service";

// 15s: frequent enough to feel live, far from "every few seconds" — and the
// route it hits is a single indexed Postgres aggregate (see
// supabase/migrations/0016_live_dashboard_stats.sql), not a per-post scan,
// so the cost of polling stays flat regardless of how much traffic the site
// gets.
const POLL_INTERVAL_MS = 15_000;

async function fetchLiveStats(): Promise<LiveDashboardStats> {
  const res = await fetch("/api/admin/live-stats", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load live stats");
  return res.json();
}

/**
 * The 6 numbers that need to update without a manual refresh: live
 * visitors, page views, video views, video completion count, video
 * completion %, and overall video completion %. Seeded with the server-
 * rendered `initialData` so there's no loading flash on first paint, then
 * polls itself — no websocket/realtime infrastructure needed for a handful
 * of numbers on a ~15s cadence.
 */
export function LiveStatsBar({ initialData }: { initialData: LiveDashboardStats }) {
  const { data } = useQuery({
    queryKey: ["admin", "live-stats"],
    queryFn: fetchLiveStats,
    initialData,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  const stats = data ?? initialData;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-success" />
        </span>
        <p className="text-xs font-medium text-muted-foreground">
          Live — updates every {POLL_INTERVAL_MS / 1000}s
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Live visitors" value={stats.liveVisitors.toLocaleString()} icon={Users} />
        <StatCard label="Page views today" value={stats.pageviewsToday.toLocaleString()} icon={Eye} />
        <StatCard label="Video views today" value={stats.videoViewsToday.toLocaleString()} icon={PlayCircle} />
        <StatCard label="Video completions today" value={stats.videoCompletionsToday.toLocaleString()} icon={CheckCircle2} />
        <StatCard label="Video completion % (today)" value={`${stats.videoCompletionRateToday}%`} icon={Percent} />
        <StatCard label="Overall video completion %" value={`${stats.overallVideoCompletionRate}%`} icon={TrendingUp} />
      </div>
    </div>
  );
}
