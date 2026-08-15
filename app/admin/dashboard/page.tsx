import Link from "next/link";
import {
  Eye,
  FileText,
  FileCheck2,
  FilePen,
  BarChart3,
  PlayCircle,
  Megaphone,
  Timer,
} from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/guards";
import { getDashboardOverview } from "@/services/dashboard.service";
import { getLiveDashboardStats } from "@/services/analytics.service";
import { LiveStatsBar } from "@/components/admin/analytics/live-stats-bar";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata = { title: "Dashboard" };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  published: "default",
  draft: "secondary",
  scheduled: "outline",
  archived: "outline",
};

export default async function DashboardPage() {
  const [profile, overview, liveStats] = await Promise.all([
    getCurrentProfile(),
    getDashboardOverview(),
    getLiveDashboardStats(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back{profile?.displayName ? `, ${profile.displayName}` : ""}</h1>
          <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your site.</p>
        </div>
        <Button asChild>
          <Link href="/admin/posts/new">New article</Link>
        </Button>
      </div>

      <LiveStatsBar initialData={liveStats} />

      {overview.totalVisitors === 0 && (
        <Alert>
          <AlertTitle>No traffic data yet</AlertTitle>
          <AlertDescription>
            Visitor, video, and ad metrics populate automatically once your site is published and
            readers start visiting articles — no setup needed beyond publishing your first post.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total visitors" value={overview.totalVisitors.toLocaleString()} icon={Eye} />
        <StatCard label="Pageviews" value={overview.totalPageviews.toLocaleString()} icon={BarChart3} />
        <StatCard label="Total articles" value={overview.totalPosts} icon={FileText} />
        <StatCard label="Published" value={overview.publishedPosts} icon={FileCheck2} />
        <StatCard label="Drafts" value={overview.draftPosts} icon={FilePen} />
        <StatCard
          label="Article completion rate"
          value={overview.articleCompletionRate !== null ? `${overview.articleCompletionRate}%` : "—"}
          icon={Timer}
        />
        <StatCard
          label="Video completion rate"
          value={overview.videoCompletionRate !== null ? `${overview.videoCompletionRate}%` : "—"}
          icon={PlayCircle}
        />
        <StatCard
          label="Ad render rate"
          value={overview.adRenderRate !== null ? `${overview.adRenderRate}%` : "—"}
          icon={Megaphone}
          hint={`${overview.adImpressions.toLocaleString()} rendered`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent articles</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.recentPosts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No articles yet.{" "}
                <Link href="/admin/posts/new" className="underline underline-offset-4">
                  Write your first one
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y">
                {overview.recentPosts.map((post) => (
                  <li key={post.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/admin/posts/${post.id}`} className="truncate font-medium hover:underline">
                        {post.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {post.author_name ?? "Unknown"} · {new Date(post.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[post.status] ?? "outline"} className="capitalize">
                      {post.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top articles</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.topArticles.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Top-performing articles show up here once readers start visiting.
              </p>
            ) : (
              <ul className="space-y-3">
                {overview.topArticles.map((a) => (
                  <li key={a.post_id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{a.title}</span>
                    <span className="text-muted-foreground">{a.views.toLocaleString()}</span>
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
