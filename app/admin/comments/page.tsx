import { requireRole } from "@/lib/auth/guards";
import { listComments } from "@/services/comments.service";
import { getSetting } from "@/services/settings.service";
import { CommentsManager } from "@/components/admin/comments/comments-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata = { title: "Comments" };

export default async function CommentsPage({ searchParams }: PageProps<"/admin/comments">) {
  await requireRole("editor");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "pending";

  const [comments, contentSettings] = await Promise.all([
    listComments(status as never),
    getSetting("content"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Comments</h1>
        <p className="text-sm text-muted-foreground">Moderate reader comments.</p>
      </div>

      {!contentSettings.comments_enabled && (
        <Alert variant="warning">
          <AlertTitle>Comments are disabled site-wide</AlertTitle>
          <AlertDescription>Turn them back on in Settings → Content to accept new submissions.</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue={status}>
        <TabsList>
          <TabsTrigger value="pending" asChild><a href="/admin/comments?status=pending">Pending</a></TabsTrigger>
          <TabsTrigger value="approved" asChild><a href="/admin/comments?status=approved">Approved</a></TabsTrigger>
          <TabsTrigger value="spam" asChild><a href="/admin/comments?status=spam">Spam</a></TabsTrigger>
          <TabsTrigger value="rejected" asChild><a href="/admin/comments?status=rejected">Rejected</a></TabsTrigger>
          <TabsTrigger value="all" asChild><a href="/admin/comments?status=all">All</a></TabsTrigger>
        </TabsList>
        <TabsContent value={status} className="mt-4">
          <CommentsManager comments={comments} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
