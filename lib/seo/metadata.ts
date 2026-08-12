import type { Metadata } from "next";

import type { SeoDefaultsSettings, GeneralSettings } from "@/services/settings.service";

export type SeoRecord = {
  seo_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  robots_index: boolean;
  robots_follow: boolean;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  twitter_card: "summary" | "summary_large_image";
} | null;

/**
 * Builds a Next.js Metadata object for a public post/page from its
 * per-entity SEO row (falling back through: entity SEO -> title/excerpt ->
 * global SEO defaults). Used by every public content route.
 */
export function buildEntityMetadata(params: {
  title: string;
  description: string | null;
  path: string; // e.g. "/articles/how-to-save-money"
  seo: SeoRecord;
  siteUrl: string;
  seoDefaults: SeoDefaultsSettings;
  general: GeneralSettings;
  imageUrl?: string | null;
  type?: "article" | "website";
}): Metadata {
  const { title, description, path, seo, siteUrl, seoDefaults, general, imageUrl, type = "article" } = params;

  const resolvedTitle = seo?.seo_title || `${title}${seoDefaults.default_seo_title_suffix}`;
  const resolvedDescription = seo?.meta_description || description || seoDefaults.default_meta_description;
  const canonical = seo?.canonical_url || `${siteUrl}${path}`;
  const ogImage = seo?.og_image_url || imageUrl || seoDefaults.default_og_image_url;

  return {
    title: seo?.seo_title || title,
    description: resolvedDescription,
    alternates: { canonical },
    robots: {
      index: seo?.robots_index ?? true,
      follow: seo?.robots_follow ?? true,
    },
    openGraph: {
      title: seo?.og_title || resolvedTitle,
      description: seo?.og_description || resolvedDescription,
      url: canonical,
      siteName: general.site_name,
      type,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: seo?.twitter_card ?? "summary_large_image",
      site: seoDefaults.twitter_handle ?? undefined,
      title: seo?.og_title || resolvedTitle,
      description: seo?.og_description || resolvedDescription,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}
