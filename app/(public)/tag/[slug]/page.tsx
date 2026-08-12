import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getTagBySlug, listPublishedPosts } from "@/services/public-content.service";
import { ArticleCard } from "@/components/public/article-card";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/tag/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) return {};
  return { title: `#${tag.name}`, description: tag.description ?? undefined };
}

export default async function TagPage({ params }: PageProps<"/tag/[slug]">) {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) notFound();

  const posts = await listPublishedPosts({ tagSlug: slug, perPage: 24 });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">#{tag.name}</h1>
      {posts.items.length === 0 ? (
        <p className="text-muted-foreground">No articles tagged with this yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.items.map((post) => (
            <ArticleCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}
