"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, Trash2, X, Flag } from "lucide-react";
import { toast } from "sonner";

import { setCommentStatusAction, deleteCommentAction } from "@/app/admin/comments/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CommentStatus } from "@/types/database.types";

type CommentRow = {
  id: string;
  author_name: string;
  author_email: string | null;
  content: string;
  status: CommentStatus;
  created_at: string;
  post: { id: string; title: string; slug: string } | null;
};

const STATUS_VARIANT: Record<CommentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default",
  pending: "secondary",
  rejected: "outline",
  spam: "destructive",
};

export function CommentsManager({ comments }: { comments: CommentRow[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function act(fn: () => Promise<unknown>, message: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(message);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  if (comments.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No comments here.</p>;
  }

  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <div key={c.id} className="rounded-lg border p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">
              <span className="font-medium">{c.author_name}</span>
              {c.author_email && <span className="ml-2 text-muted-foreground">{c.author_email}</span>}
              <span className="mx-2 text-muted-foreground">·</span>
              {c.post && (
                <Link href={`/articles/${c.post.slug}`} target="_blank" className="text-muted-foreground hover:underline">
                  {c.post.title}
                </Link>
              )}
            </div>
            <Badge variant={STATUS_VARIANT[c.status]} className="capitalize">{c.status}</Badge>
          </div>
          <p className="mb-3 text-sm">{c.content}</p>
          <div className="flex flex-wrap gap-2">
            {c.status !== "approved" && (
              <Button size="sm" variant="outline" disabled={pending} onClick={() => act(() => setCommentStatusAction(c.id, "approved"), "Approved")}>
                <Check className="size-3.5" /> Approve
              </Button>
            )}
            {c.status !== "rejected" && (
              <Button size="sm" variant="outline" disabled={pending} onClick={() => act(() => setCommentStatusAction(c.id, "rejected"), "Rejected")}>
                <X className="size-3.5" /> Reject
              </Button>
            )}
            {c.status !== "spam" && (
              <Button size="sm" variant="outline" disabled={pending} onClick={() => act(() => setCommentStatusAction(c.id, "spam"), "Marked as spam")}>
                <Flag className="size-3.5" /> Spam
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => deleteCommentAction(c.id), "Deleted")}>
              {pending ? <Loader2 className="animate-spin" /> : <Trash2 className="size-3.5 text-destructive" />} Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
