"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { submitCommentAction, type SubmitCommentState } from "@/app/(public)/articles/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type PublicComment = {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
  parent_id: string | null;
};

export function CommentsSection({
  postId,
  postSlug,
  comments,
  isSignedIn,
}: {
  postId: string;
  postSlug: string;
  comments: PublicComment[];
  isSignedIn: boolean;
}) {
  const [state, formAction, pending] = useActionState<SubmitCommentState, FormData>(submitCommentAction, undefined);

  return (
    <section className="mt-12 border-t pt-8">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h2>

      <div className="mb-8 space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Be the first to comment.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-lg border p-3">
              <div className="mb-1 flex items-center gap-2 text-sm">
                <span className="font-medium">{c.author_name}</span>
                <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-muted-foreground">{c.content}</p>
            </div>
          ))
        )}
      </div>

      {state?.success ? (
        <Alert>
          <AlertDescription>Thanks — your comment is awaiting moderation.</AlertDescription>
        </Alert>
      ) : (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="postId" value={postId} />
          <input type="hidden" name="postSlug" value={postSlug} />
          {state?.error && (
            <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>
          )}
          {!isSignedIn && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="authorName" className="text-xs">Name</Label>
                <Input id="authorName" name="authorName" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="authorEmail" className="text-xs">Email (optional, not published)</Label>
                <Input id="authorEmail" name="authorEmail" type="email" />
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="content" className="text-xs">Comment</Label>
            <Textarea id="content" name="content" rows={3} required />
          </div>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} Post comment
          </Button>
        </form>
      )}
    </section>
  );
}
