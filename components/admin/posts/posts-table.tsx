"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { MoreHorizontal, Star } from "lucide-react";
import { toast } from "sonner";

import { setPostStatusAction, deletePostAction, duplicatePostAction } from "@/app/admin/posts/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  published: "default",
  draft: "secondary",
  scheduled: "outline",
  archived: "destructive",
};

export type PostListItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  is_featured: boolean;
  updated_at: string;
  published_at: string | null;
  category_name: string | null;
  author_name: string | null;
};

export function PostsTable({ posts }: { posts: PostListItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function act(fn: () => Promise<unknown>, successMessage: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(successMessage);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Author</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {posts.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
              No articles match these filters.
            </TableCell>
          </TableRow>
        ) : (
          posts.map((post) => (
            <TableRow key={post.id}>
              <TableCell className="max-w-sm">
                <Link href={`/admin/posts/${post.id}`} className="flex items-center gap-1.5 font-medium hover:underline">
                  {post.is_featured && <Star className="size-3.5 fill-warning text-warning" />}
                  <span className="truncate">{post.title}</span>
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[post.status] ?? "outline"} className="capitalize">{post.status}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{post.category_name ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{post.author_name ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{new Date(post.updated_at).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={pending}>
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/posts/${post.id}`}>Edit</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href={`/articles/${post.slug}`} target="_blank" rel="noreferrer">View live</a>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => act(() => duplicatePostAction(post.id), "Duplicated")}>
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {post.status !== "published" && (
                      <DropdownMenuItem onClick={() => act(() => setPostStatusAction(post.id, "published"), "Published")}>
                        Publish
                      </DropdownMenuItem>
                    )}
                    {post.status === "published" && (
                      <DropdownMenuItem onClick={() => act(() => setPostStatusAction(post.id, "draft"), "Unpublished")}>
                        Unpublish
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => act(() => setPostStatusAction(post.id, "archived"), "Archived")}>
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        if (confirm(`Delete "${post.title}"? This cannot be undone.`)) {
                          act(() => deletePostAction(post.id), "Deleted");
                        }
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
