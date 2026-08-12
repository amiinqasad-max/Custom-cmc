import Link from "next/link";

import { requireRole } from "@/lib/auth/guards";
import { listAllVideosWithStats } from "@/services/analytics.service";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Videos" };

export default async function VideosPage() {
  await requireRole("editor");
  const videos = await listAllVideosWithStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Videos</h1>
        <p className="text-sm text-muted-foreground">Engagement across every tracked video, site-wide.</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Article</TableHead>
            <TableHead>Slot</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Required</TableHead>
            <TableHead>Played</TableHead>
            <TableHead className="w-48">Completion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {videos.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No videos configured yet.</TableCell></TableRow>
          ) : (
            videos.map((v) => (
              <TableRow key={v.postVideoId}>
                <TableCell>
                  <Link href={`/admin/posts/${v.postId}`} className="font-medium hover:underline">{v.postTitle}</Link>
                </TableCell>
                <TableCell>Video {v.slotIndex}</TableCell>
                <TableCell className="text-muted-foreground">{v.durationSeconds ? `${v.durationSeconds.toFixed(1)}s` : "—"}</TableCell>
                <TableCell><Badge variant={v.required ? "default" : "outline"}>{v.required ? "Required" : "Optional"}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{v.played.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={v.completionRate} className="h-2" />
                    <span className="w-10 shrink-0 text-xs text-muted-foreground">{v.completionRate}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
