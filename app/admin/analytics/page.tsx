import Link from "next/link";
import { Eye, BarChart3, Timer, CheckCircle2, PlayCircle, Users } from "lucide-react";

import { requireRole } from "@/lib/auth/guards";
import { getOverviewAnalytics, getTopArticles, getTopVideos } from "@/services/analytics.service";
import { StatCard } from "@/components/admin/stat-card";
import { PageviewsChart } from "@/components/admin/analytics/pageviews-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  await requireRole("editor");
  const [overview, topArticles, topVideos] = await Promise.all([
    getOverviewAnalytics(30),
    getTopArticles(8),
    getTopVideos(8),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Last 30 days · first-party, batched event tracking.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Visitors" value={overview.visitors.toLocaleString()} icon={Users} />
        <StatCard label="Pageviews" value={overview.pageviews.toLocaleString()} icon={Eye} />
        <StatCard label="Avg. session duration" value={`${overview.avgSessionDurationSeconds}s`} icon={Timer} />
        <StatCard label="Avg. reading time" value={`${overview.avgReadingTimeMinutes} min`} icon={BarChart3} />
        <StatCard label="Article completion rate" value={`${overview.articleCompletionRate}%`} icon={CheckCircle2} />
        <StatCard label="Video completion rate" value={`${overview.videoCompletionRate}%`} icon={PlayCircle} />
      </div>

      <Card>
        <CardHeader><CardTitle>Traffic</CardTitle></CardHeader>
        <CardContent><PageviewsChart data={overview.dailySeries} /></CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top articles</CardTitle></CardHeader>
          <CardContent>
            {topArticles.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ul className="divide-y">
                {topArticles.map((a) => (
                  <li key={a.postId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <Link href={`/admin/analytics/${a.postId}`} className="min-w-0 truncate hover:underline">{a.title}</Link>
                    <span className="shrink-0 text-muted-foreground">{a.views.toLocaleString()} views · {a.completionRate}%</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top performing videos</CardTitle></CardHeader>
          <CardContent>
            {topVideos.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ul className="divide-y">
                {topVideos.map((v) => (
                  <li key={v.postVideoId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0 truncate">{v.postTitle} — Video {v.slotIndex}</span>
                    <span className="shrink-0 text-muted-foreground">{v.plays} plays · {v.completionRate}%</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
