import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getCategoryBySlug, listPublishedPosts } from "@/services/public-content.service";
import { ArticleCard } from "@/components/public/article-card";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/category/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return { title: category.name, description: category.description ?? undefined };
}

export default async function CategoryPage({ params }: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const posts = await listPublishedPosts({ categorySlug: slug, perPage: 24 });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{category.name}</h1>
        {category.description && <p className="mt-1 text-muted-foreground">{category.description}</p>}
      </div>
      {posts.items.length === 0 ? (
        <p className="text-muted-foreground">No articles in this category yet.</p>
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
