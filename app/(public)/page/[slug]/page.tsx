import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getPublishedPageBySlug } from "@/services/public-content.service";
import { createPublicClient } from "@/lib/supabase/public";
import { getSetting } from "@/services/settings.service";
import { buildEntityMetadata } from "@/lib/seo/metadata";
import { ArticleBody } from "@/components/public/article-body";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/page/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublishedPageBySlug(slug);
  if (!result) return {};

  const supabase = createPublicClient();
  const [seoDefaults, general] = await Promise.all([getSetting("seo_defaults", supabase), getSetting("general", supabase)]);

  return buildEntityMetadata({
    title: result.page.title,
    description: null,
    path: `/page/${result.page.slug}`,
    seo: result.seo
      ? {
          seo_title: result.seo.seo_title,
          meta_description: result.seo.meta_description,
          canonical_url: result.seo.canonical_url,
          robots_index: result.seo.robots_index,
          robots_follow: result.seo.robots_follow,
          og_title: result.seo.og_title,
          og_description: result.seo.og_description,
          og_image_url: null,
          twitter_card: result.seo.twitter_card,
        }
      : null,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com",
    seoDefaults,
    general,
    type: "website",
  });
}

export default async function StaticPage({ params }: PageProps<"/page/[slug]">) {
  const { slug } = await params;
  const result = await getPublishedPageBySlug(slug);
  if (!result) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">{result.page.title}</h1>
      <ArticleBody content={result.page.content as never} videos={{}} />
    </main>
  );
}
