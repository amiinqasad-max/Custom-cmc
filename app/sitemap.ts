import type { MetadataRoute } from "next";

import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 3600; // regenerate at most once an hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
  // Published posts/pages and all categories are public-readable under RLS
  // (see 0012_rls_policies.sql) — no service-role needed for a sitemap.
  const supabase = createPublicClient();

  const [{ data: posts }, { data: pages }, { data: categories }] = await Promise.all([
    supabase.from("posts").select("slug, updated_at").eq("status", "published"),
    supabase.from("pages").select("slug, updated_at").eq("status", "published"),
    supabase.from("categories").select("slug"),
  ]);

  const entries: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    ...((posts ?? []).map((p) => ({
      url: `${siteUrl}/articles/${p.slug}`,
      lastModified: p.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }))),
    ...((pages ?? []).map((p) => ({
      url: `${siteUrl}/page/${p.slug}`,
      lastModified: p.updated_at,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }))),
    ...((categories ?? []).map((c) => ({
      url: `${siteUrl}/category/${c.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    }))),
  ];

  return entries;
}
