import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import type { VideoAsset } from "@/lib/content/types";

export async function getPublishedPostBySlug(slug: string) {
  const supabase = createPublicClient();

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!post) return null;

  const [{ data: category }, { data: author }, { data: postTags }, { data: postVideos }, { data: seo }, { data: featuredImage }] =
    await Promise.all([
      post.category_id ? supabase.from("categories").select("*").eq("id", post.category_id).maybeSingle() : Promise.resolve({ data: null }),
      post.author_id ? supabase.from("profiles").select("id, display_name, email").eq("id", post.author_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("post_tags").select("tag_id").eq("post_id", post.id),
      supabase.from("post_videos").select("*").eq("post_id", post.id).order("slot_index"),
      supabase.from("seo_metadata").select("*").eq("entity_type", "post").eq("entity_id", post.id).maybeSingle(),
      post.featured_image_id ? supabase.from("media").select("*").eq("id", post.featured_image_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

  const tagIds = (postTags ?? []).map((t) => t.tag_id);
  const { data: tags } = tagIds.length ? await supabase.from("tags").select("*").in("id", tagIds) : { data: [] };

  const videoMediaIds = (postVideos ?? []).map((v) => v.media_id).filter(Boolean) as string[];
  const { data: videoMedia } = videoMediaIds.length
    ? await supabase.from("media").select("*").in("id", videoMediaIds)
    : { data: [] };
  const mediaById = new Map((videoMedia ?? []).map((m) => [m.id, m]));

  const videos: Record<number, VideoAsset> = {};
  for (const v of postVideos ?? []) {
    if (!v.media_id) continue;
    const media = mediaById.get(v.media_id);
    if (media) videos[v.slot_index] = { url: media.url, posterUrl: null, durationSeconds: v.duration_seconds };
  }

  let ogImageUrl: string | null = null;
  if (seo?.og_image_id) {
    const { data: ogImage } = await supabase.from("media").select("url").eq("id", seo.og_image_id).maybeSingle();
    ogImageUrl = ogImage?.url ?? null;
  }

  return {
    post,
    category,
    author,
    tags: tags ?? [],
    postVideos: postVideos ?? [],
    videos,
    seo: seo ? { ...seo, og_image_url: ogImageUrl } : null,
    featuredImageUrl: featuredImage?.url ?? null,
  };
}

export type PublicPostCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
  reading_time_minutes: number;
  featured_image_url: string | null;
  category_name: string | null;
  category_slug: string | null;
};

async function toPostCards(supabase: ReturnType<typeof createPublicClient>, posts: Array<{
  id: string; title: string; slug: string; excerpt: string | null; published_at: string | null;
  reading_time_minutes: number; featured_image_id: string | null; category_id: string | null;
}>): Promise<PublicPostCard[]> {
  const imageIds = [...new Set(posts.map((p) => p.featured_image_id).filter(Boolean))] as string[];
  const categoryIds = [...new Set(posts.map((p) => p.category_id).filter(Boolean))] as string[];

  const [{ data: images }, { data: categories }] = await Promise.all([
    imageIds.length ? supabase.from("media").select("id, url").in("id", imageIds) : Promise.resolve({ data: [] }),
    categoryIds.length ? supabase.from("categories").select("id, name, slug").in("id", categoryIds) : Promise.resolve({ data: [] }),
  ]);
  const imageById = new Map((images ?? []).map((i) => [i.id, i.url]));
  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));

  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    published_at: p.published_at,
    reading_time_minutes: p.reading_time_minutes,
    featured_image_url: p.featured_image_id ? (imageById.get(p.featured_image_id) ?? null) : null,
    category_name: p.category_id ? (categoryById.get(p.category_id)?.name ?? null) : null,
    category_slug: p.category_id ? (categoryById.get(p.category_id)?.slug ?? null) : null,
  }));
}

export async function listPublishedPosts(params: { page?: number; perPage?: number; categorySlug?: string; tagSlug?: string; featuredOnly?: boolean } = {}) {
  const supabase = createPublicClient();
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 12;
  const from = (page - 1) * perPage;

  let query = supabase
    .from("posts")
    .select("id, title, slug, excerpt, published_at, reading_time_minutes, featured_image_id, category_id", { count: "exact" })
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (params.featuredOnly) query = query.eq("is_featured", true);

  if (params.categorySlug) {
    const { data: category } = await supabase.from("categories").select("id").eq("slug", params.categorySlug).maybeSingle();
    query = query.eq("category_id", category?.id ?? "00000000-0000-0000-0000-000000000000");
  }
  if (params.tagSlug) {
    const { data: tag } = await supabase.from("tags").select("id").eq("slug", params.tagSlug).maybeSingle();
    const { data: postTags } = tag ? await supabase.from("post_tags").select("post_id").eq("tag_id", tag.id) : { data: [] };
    const ids = (postTags ?? []).map((t) => t.post_id);
    query = query.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data, count } = await query.range(from, from + perPage - 1);
  return { items: await toPostCards(supabase, data ?? []), total: count ?? 0, page, perPage };
}

export async function getCategoryBySlug(slug: string) {
  const supabase = createPublicClient();
  const { data } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
  return data;
}

export async function getTagBySlug(slug: string) {
  const supabase = createPublicClient();
  const { data } = await supabase.from("tags").select("*").eq("slug", slug).maybeSingle();
  return data;
}

export async function getPublishedPageBySlug(slug: string) {
  const supabase = createPublicClient();
  const { data: page } = await supabase.from("pages").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!page) return null;
  const { data: seo } = await supabase.from("seo_metadata").select("*").eq("entity_type", "page").eq("entity_id", page.id).maybeSingle();
  return { page, seo };
}
