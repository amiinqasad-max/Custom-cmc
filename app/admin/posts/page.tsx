import Link from "next/link";
import { Plus } from "lucide-react";

import { requireRole } from "@/lib/auth/guards";
import { listPosts } from "@/services/posts.service";
import { listCategories } from "@/services/categories.service";
import { postFiltersSchema } from "@/schemas/post";
import { Button } from "@/components/ui/button";
import { PostsFilterBar } from "@/components/admin/posts/posts-filter-bar";
import { PostsTable } from "@/components/admin/posts/posts-table";

export const metadata = { title: "Posts" };

export default async function PostsPage({ searchParams }: PageProps<"/admin/posts">) {
  await requireRole("author");
  const sp = await searchParams;

  const filters = postFiltersSchema.parse({
    search: typeof sp.search === "string" ? sp.search : undefined,
    status: typeof sp.status === "string" ? sp.status : "all",
    category_id: typeof sp.category_id === "string" ? sp.category_id : undefined,
    page: sp.page ? Number(sp.page) : 1,
  });

  const [{ items, total, perPage, page }, categories] = await Promise.all([listPosts(filters), listCategories()]);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Posts</h1>
          <p className="text-sm text-muted-foreground">{total} article{total === 1 ? "" : "s"}</p>
        </div>
        <Button asChild>
          <Link href="/admin/posts/new"><Plus /> New article</Link>
        </Button>
      </div>

      <PostsFilterBar categories={categories} />
      <PostsTable posts={items} />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const params = new URLSearchParams();
            if (filters.search) params.set("search", filters.search);
            if (filters.status !== "all") params.set("status", filters.status);
            if (filters.category_id) params.set("category_id", filters.category_id);
            params.set("page", String(p));
            return (
              <Link
                key={p}
                href={`/admin/posts?${params.toString()}`}
                className={p === page ? "font-semibold underline" : "text-muted-foreground hover:underline"}
              >
                {p}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
