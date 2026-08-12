import { notFound } from "next/navigation";
import Link from "next/link";

import { requireRole } from "@/lib/auth/guards";
import { getArticleAnalytics } from "@/services/analytics.service";
import { getPostForEdit } from "@/services/posts.service";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Article analytics" };

export default async function ArticleAnalyticsPage({ params }: PageProps<"/admin/analytics/[postId]">) {
  await requireRole("editor");
  const { postId } = await params;

  const [{ post }, analytics] = await Promise.all([
    getPostForEdit(postId).catch(() => ({ post: null })),
    getArticleAnalytics(postId),
  ]);
  if (!post) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{post.title}</h1>
          <p className="text-sm text-muted-foreground">Article analytics</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/admin/posts/${postId}`}>Edit article</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Views" value={analytics.views.toLocaleString()} />
        <StatCard label="Unique sessions" value={analytics.uniqueSessions.toLocaleString()} />
        <StatCard label="Avg. progress" value={`${analytics.avgProgress}%`} />
        <StatCard label="Avg. reading time" value={`${Math.round(analytics.avgReadingTimeSeconds / 60)} min`} />
        <StatCard label="Completed" value={analytics.completed.toLocaleString()} hint={`${analytics.completionRate}% completion rate`} />
        <StatCard label="Bottom reached" value={analytics.bottomReached.toLocaleString()} />
        <StatCard label="Full video completion" value={`${analytics.fullVideoCompletionRate}%`} />
        <StatCard label="Next-article open rate" value={`${analytics.nextArticleOpenRate}%`} />
      </div>

      <Card>
        <CardHeader><CardTitle>Video performance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {analytics.videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No videos configured on this article.</p>
          ) : (
            analytics.videos.map((v) => (
              <div key={v.slotIndex} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Video {v.slotIndex}</span>
                  <span className="text-muted-foreground">
                    {v.played.toLocaleString()} played · {v.completed.toLocaleString()} completed ({v.completionRate}%)
                  </span>
                </div>
                <Progress value={v.completionRate} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
