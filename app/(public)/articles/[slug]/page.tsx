import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

import { getPublishedPostBySlug } from "@/services/public-content.service";
import { getResolvedAdPlacementsForPost } from "@/services/ads.service";
import { createPublicClient } from "@/lib/supabase/public";
import { getSetting } from "@/services/settings.service";
import { buildEntityMetadata } from "@/lib/seo/metadata";
import { articleSchema, breadcrumbSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/public/json-ld";
import { ArticleBody, type InjectionPoint } from "@/components/public/article-body";
import { ArticleTrackingProvider } from "@/components/public/article-tracking-provider";
import { AutoNextOverlay } from "@/components/public/auto-next-overlay";
import { AdSlot } from "@/components/public/ad-slot";
import { Badge } from "@/components/ui/badge";
import { analyzeContent } from "@/lib/content/analyze";

export const revalidate = 60;

async function loadArticle(slug: string) {
  const data = await getPublishedPostBySlug(slug);
  if (!data) return null;
  return data;
}

export async function generateMetadata({ params }: PageProps<"/articles/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadArticle(slug);
  if (!data) return {};

  const supabase = createPublicClient();
  const [seoDefaults, general] = await Promise.all([
    getSetting("seo_defaults", supabase),
    getSetting("general", supabase),
  ]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

  return buildEntityMetadata({
    title: data.post.title,
    description: data.post.excerpt,
    path: `/articles/${data.post.slug}`,
    seo: data.seo
      ? {
          seo_title: data.seo.seo_title,
          meta_description: data.seo.meta_description,
          canonical_url: data.seo.canonical_url,
          robots_index: data.seo.robots_index,
          robots_follow: data.seo.robots_follow,
          og_title: data.seo.og_title,
          og_description: data.seo.og_description,
          og_image_url: data.seo.og_image_url,
          twitter_card: data.seo.twitter_card,
        }
      : null,
    siteUrl,
    seoDefaults,
    general,
    imageUrl: data.featuredImageUrl,
  });
}

export default async function ArticlePage({ params }: PageProps<"/articles/[slug]">) {
  const { slug } = await params;
  const data = await loadArticle(slug);
  if (!data) notFound();

  const { post, category, author, tags, videos } = data;
  const supabase = createPublicClient();
  const [readingSettings, seoDefaults, resolvedAds] = await Promise.all([
    getSetting("reading", supabase),
    getSetting("seo_defaults", supabase),
    getResolvedAdPlacementsForPost({
      postId: post.id,
      categoryId: post.category_id,
      categoryAdsEnabled: category?.ads_enabled ?? true,
      content: post.content as never,
      videoSlotsPresent: Object.keys(videos).map(Number),
    }),
  ]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
  const threshold = post.completion_threshold_percent ?? readingSettings.completion_threshold_percent;

  // "middle" and "before_conclusion" are relative positions computed against
  // paragraph count — resolve them to a concrete after_paragraph index once
  // we know it, so they can slot into the same after_paragraph injection points.
  const { paragraphCount } = analyzeContent(post.content as never);
  const middleParagraph = Math.max(1, Math.round(paragraphCount / 2));
  const beforeConclusionParagraph = Math.max(1, paragraphCount - 1);

  function renderAdInjection(point: InjectionPoint): React.ReactNode {
    const matches = resolvedAds.filter(({ placement }) => {
      if (point.type === "top") return placement.positionType === "top";
      if (point.type === "bottom") return placement.positionType === "bottom";
      if (point.type === "after_paragraph") {
        if (placement.positionType === "after_paragraph") return placement.paragraphNumber === point.paragraphIndex;
        if (placement.positionType === "middle") return middleParagraph === point.paragraphIndex;
        if (placement.positionType === "before_conclusion") return beforeConclusionParagraph === point.paragraphIndex;
        return false;
      }
      if (point.type === "before_video") return placement.positionType === "before_video" && placement.videoSlot === point.videoSlot;
      if (point.type === "after_video") return placement.positionType === "after_video" && placement.videoSlot === point.videoSlot;
      return false;
    });
    if (matches.length === 0) return null;
    return (
      <>
        {matches.map(({ placement, adSlot }) => (
          <AdSlot
            key={placement.id}
            placementId={placement.id}
            postId={post.id}
            adClient={adSlot.ad_client}
            adSlot={adSlot.ad_slot}
            format={adSlot.format}
            responsive={adSlot.responsive}
          />
        ))}
      </>
    );
  }

  return (
    <>
      <JsonLd
        data={articleSchema({
          headline: post.title,
          description: post.excerpt,
          url: `${siteUrl}/articles/${post.slug}`,
          imageUrl: data.featuredImageUrl,
          datePublished: post.published_at,
          dateModified: post.updated_at,
          authorName: author?.display_name ?? author?.email ?? "Staff",
          organizationName: seoDefaults.organization_name,
          organizationLogoUrl: seoDefaults.organization_logo_url,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: siteUrl },
          ...(category ? [{ name: category.name, url: `${siteUrl}/category/${category.slug}` }] : []),
          { name: post.title, url: `${siteUrl}/articles/${post.slug}` },
        ])}
      />

      <ArticleTrackingProvider postId={post.id}>
        <article className="mx-auto max-w-2xl px-4 py-10">
          <header className="mb-6 space-y-3">
            {category && (
              <Link href={`/category/${category.slug}`}>
                <Badge variant="secondary">{category.name}</Badge>
              </Link>
            )}
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
            {post.excerpt && <p className="text-lg text-muted-foreground">{post.excerpt}</p>}
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{author?.display_name ?? author?.email ?? "Staff"}</span>
              <span>·</span>
              <time dateTime={post.published_at ?? undefined}>
                {post.published_at ? new Date(post.published_at).toLocaleDateString() : "Draft"}
              </time>
              <span>·</span>
              <span>{post.reading_time_minutes} min read</span>
            </div>
          </header>

          {data.featuredImageUrl && (
            <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-lg">
              <Image src={data.featuredImageUrl} alt={post.title} fill sizes="768px" className="object-cover" unoptimized priority />
            </div>
          )}

          <ArticleBody content={post.content as never} videos={videos} renderInjection={renderAdInjection} />

          {tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2 border-t pt-6">
              {tags.map((tag) => (
                <Link key={tag.id} href={`/tag/${tag.slug}`}>
                  <Badge variant="outline">{tag.name}</Badge>
                </Link>
              ))}
            </div>
          )}

          <p className="mt-8 text-xs text-muted-foreground">
            Required reading progress: {threshold}% · Videos required: {Object.keys(videos).length}/
            {data.postVideos.filter((v) => v.required).length || data.postVideos.length}
          </p>
        </article>

        <AutoNextOverlay
          postId={post.id}
          autoNextEnabled={readingSettings.auto_next_enabled}
          autoNextDelayMs={readingSettings.auto_next_delay_ms}
        />
      </ArticleTrackingProvider>
    </>
  );
}
