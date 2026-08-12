import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeContent } from "@/lib/content/analyze";
import { renderContentToHtml, autoExcerpt } from "@/lib/content/render-html";
import { slugifyTitle, uniqueSlug } from "@/lib/content/slug";
import { upsertSeoMetadata, getSeoMetadata } from "@/services/seo.service";
import { logActivity } from "@/services/activity.service";
import type { PostFilters, PostInput } from "@/schemas/post";
import type { Json, Tables, TablesUpdate } from "@/types/database.types";
import type { TiptapDoc } from "@/lib/content/types";

export type PostRow = Tables<"posts">;

export async function getExistingPostSlugs(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("slug");
  return new Set((data ?? []).map((p) => p.slug));
}

export async function listPosts(filters: PostFilters) {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 20;
  const from = (page - 1) * perPage;

  let query = supabase
    .from("posts")
    .select("id, title, slug, status, is_featured, published_at, updated_at, category_id, author_id", {
      count: "exact",
    })
    .order("updated_at", { ascending: false });

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.category_id) query = query.eq("category_id", filters.category_id);
  if (filters.search) query = query.ilike("title", `%${filters.search}%`);

  if (filters.tag_id) {
    const { data: postIds } = await supabase.from("post_tags").select("post_id").eq("tag_id", filters.tag_id);
    const ids = (postIds ?? []).map((r) => r.post_id);
    query = query.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data, error, count } = await query.range(from, from + perPage - 1);
  if (error) throw new Error(`Failed to list posts: ${error.message}`);

  const categoryIds = [...new Set((data ?? []).map((p) => p.category_id).filter(Boolean))] as string[];
  const authorIds = [...new Set((data ?? []).map((p) => p.author_id).filter(Boolean))] as string[];

  const [{ data: categories }, { data: authors }] = await Promise.all([
    categoryIds.length
      ? supabase.from("categories").select("id, name").in("id", categoryIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    authorIds.length
      ? supabase.from("profiles").select("id, display_name, email").in("id", authorIds)
      : Promise.resolve({ data: [] as Array<{ id: string; display_name: string | null; email: string }> }),
  ]);

  const categoryById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const authorById = new Map((authors ?? []).map((a) => [a.id, a.display_name ?? a.email]));

  return {
    items: (data ?? []).map((p) => ({
      ...p,
      category_name: p.category_id ? (categoryById.get(p.category_id) ?? null) : null,
      author_name: p.author_id ? (authorById.get(p.author_id) ?? null) : null,
    })),
    total: count ?? 0,
    page,
    perPage,
  };
}

export async function getPostForEdit(id: string) {
  const supabase = await createClient();
  const { data: post, error } = await supabase.from("posts").select("*").eq("id", id).single();
  if (error) throw new Error(`Post not found: ${error.message}`);

  const [{ data: postTags }, { data: videos }, seo] = await Promise.all([
    supabase.from("post_tags").select("tag_id").eq("post_id", id),
    supabase.from("post_videos").select("*").eq("post_id", id).order("slot_index"),
    getSeoMetadata(supabase, "post", id),
  ]);

  return {
    post,
    tagIds: (postTags ?? []).map((t) => t.tag_id),
    videos: videos ?? [],
    seo,
  };
}

function buildContentFields(content: TiptapDoc, excerpt?: string | null) {
  const analysis = analyzeContent(content);
  return {
    content_html: renderContentToHtml(content),
    reading_time_minutes: analysis.readingTimeMinutes,
    excerpt: excerpt?.trim() || autoExcerpt(content),
    analysis,
  };
}

async function syncPostVideos(supabase: Awaited<ReturnType<typeof createClient>>, postId: string, videos: PostInput["videos"]) {
  // Only slots with a media file assigned become real post_videos rows —
  // an empty slot isn't "a video that's 0% complete", it doesn't exist yet.
  const configured = videos.filter((v) => v.media_id);

  const mediaIds = configured.map((v) => v.media_id as string);
  const { data: mediaRows } = mediaIds.length
    ? await supabase.from("media").select("id, duration_seconds").in("id", mediaIds)
    : { data: [] as Array<{ id: string; duration_seconds: number | null }> };
  const durationByMediaId = new Map((mediaRows ?? []).map((m) => [m.id, m.duration_seconds]));

  for (const v of configured) {
    await supabase.from("post_videos").upsert(
      {
        post_id: postId,
        slot_index: v.slot_index,
        media_id: v.media_id,
        required: v.required,
        completion_threshold_percent: v.completion_threshold_percent,
        // Duration is always dynamically detected from the media file itself
        // (§4), never hard-coded — re-synced from `media` on every save.
        duration_seconds: v.media_id ? (durationByMediaId.get(v.media_id) ?? null) : null,
      },
      { onConflict: "post_id,slot_index" }
    );
  }
  // Remove slots the editor cleared or no longer uses.
  const keepSlots = configured.map((v) => v.slot_index);
  let del = supabase.from("post_videos").delete().eq("post_id", postId);
  del = keepSlots.length ? del.not("slot_index", "in", `(${keepSlots.join(",")})`) : del;
  await del;
}

export async function createPost(input: PostInput, authorId: string) {
  const supabase = await createClient();
  const { content_html, reading_time_minutes, excerpt } = buildContentFields(input.content, input.excerpt);

  const publishedAt = input.status === "published" ? new Date().toISOString() : null;

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      title: input.title,
      slug: input.slug,
      excerpt,
      content: input.content as unknown as Json,
      content_html,
      reading_time_minutes,
      featured_image_id: input.featured_image_id ?? null,
      category_id: input.category_id ?? null,
      author_id: input.author_id ?? authorId,
      status: input.status,
      is_featured: input.is_featured,
      published_at: publishedAt,
      scheduled_at: input.status === "scheduled" ? input.scheduled_at : null,
      next_article_id: input.next_article_id ?? null,
      completion_threshold_percent: input.completion_threshold_percent ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create post: ${error.message}`);

  await Promise.all([
    input.tag_ids.length
      ? supabase.from("post_tags").insert(input.tag_ids.map((tag_id) => ({ post_id: post.id, tag_id })))
      : Promise.resolve(),
    syncPostVideos(supabase, post.id, input.videos),
    upsertSeoMetadata(supabase, "post", post.id, input.seo),
  ]);

  await logActivity(supabase, {
    userId: authorId,
    action: post.status === "published" ? "post.published" : "post.created",
    resourceType: "post",
    resourceId: post.id,
    metadata: { title: post.title },
  });

  return post;
}

export async function updatePost(id: string, input: PostInput, userId: string) {
  const supabase = await createClient();
  const { content_html, reading_time_minutes, excerpt } = buildContentFields(input.content, input.excerpt);

  const { data: existing } = await supabase.from("posts").select("status, published_at").eq("id", id).single();
  const publishedAt =
    input.status === "published" ? (existing?.published_at ?? new Date().toISOString()) : existing?.published_at ?? null;

  const { data: post, error } = await supabase
    .from("posts")
    .update({
      title: input.title,
      slug: input.slug,
      excerpt,
      content: input.content as unknown as Json,
      content_html,
      reading_time_minutes,
      featured_image_id: input.featured_image_id ?? null,
      category_id: input.category_id ?? null,
      status: input.status,
      is_featured: input.is_featured,
      published_at: input.status === "published" ? publishedAt : input.status === "draft" ? null : existing?.published_at ?? null,
      scheduled_at: input.status === "scheduled" ? input.scheduled_at : null,
      next_article_id: input.next_article_id ?? null,
      completion_threshold_percent: input.completion_threshold_percent ?? null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update post: ${error.message}`);

  await supabase.from("post_tags").delete().eq("post_id", id);
  await Promise.all([
    input.tag_ids.length
      ? supabase.from("post_tags").insert(input.tag_ids.map((tag_id) => ({ post_id: id, tag_id })))
      : Promise.resolve(),
    syncPostVideos(supabase, id, input.videos),
    upsertSeoMetadata(supabase, "post", id, input.seo),
  ]);

  const statusChanged = existing?.status !== input.status;
  await logActivity(supabase, {
    userId,
    action: statusChanged && input.status === "published" ? "post.published" : "post.updated",
    resourceType: "post",
    resourceId: id,
    metadata: { title: post.title },
  });

  return post;
}

export async function deletePost(id: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete post: ${error.message}`);
  await logActivity(supabase, { userId, action: "post.deleted", resourceType: "post", resourceId: id });
}

export async function setPostStatus(
  id: string,
  status: "draft" | "published" | "archived",
  userId: string
) {
  const supabase = await createClient();
  const patch: TablesUpdate<"posts"> = { status };
  if (status === "published") patch.published_at = new Date().toISOString();
  if (status === "draft") patch.published_at = null;

  const { error } = await supabase.from("posts").update(patch).eq("id", id);
  if (error) throw new Error(`Failed to update post status: ${error.message}`);

  await logActivity(supabase, {
    userId,
    action: status === "published" ? "post.published" : status === "archived" ? "post.archived" : "post.unpublished",
    resourceType: "post",
    resourceId: id,
  });
}

export async function duplicatePost(id: string, userId: string) {
  const supabase = await createClient();
  const { post, tagIds, videos, seo } = await getPostForEdit(id);
  const slugs = await getExistingPostSlugs();
  const newSlug = uniqueSlug(slugifyTitle(`${post.title}-copy`), slugs);

  const { data: copy, error } = await supabase
    .from("posts")
    .insert({
      title: `${post.title} (Copy)`,
      slug: newSlug,
      excerpt: post.excerpt,
      content: post.content,
      content_html: post.content_html,
      reading_time_minutes: post.reading_time_minutes,
      featured_image_id: post.featured_image_id,
      category_id: post.category_id,
      author_id: userId,
      status: "draft",
      is_featured: false,
      completion_threshold_percent: post.completion_threshold_percent,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to duplicate post: ${error.message}`);

  await Promise.all([
    tagIds.length ? supabase.from("post_tags").insert(tagIds.map((tag_id) => ({ post_id: copy.id, tag_id }))) : Promise.resolve(),
    videos.length
      ? supabase.from("post_videos").insert(
          videos.map((v) => ({
            post_id: copy.id,
            slot_index: v.slot_index,
            media_id: v.media_id,
            required: v.required,
            completion_threshold_percent: v.completion_threshold_percent,
          }))
        )
      : Promise.resolve(),
    seo
      ? upsertSeoMetadata(supabase, "post", copy.id, {
          seo_title: seo.seo_title,
          meta_description: seo.meta_description,
          canonical_url: seo.canonical_url,
          robots_index: seo.robots_index,
          robots_follow: seo.robots_follow,
          og_title: seo.og_title,
          og_description: seo.og_description,
          og_image_id: seo.og_image_id,
          twitter_card: seo.twitter_card,
          schema_type: seo.schema_type,
        })
      : Promise.resolve(),
  ]);

  await logActivity(supabase, { userId, action: "post.duplicated", resourceType: "post", resourceId: copy.id });
  return copy;
}

/** Publishes any posts whose scheduled_at has passed. Called from a cron-triggered route handler. */
export async function publishDuePosts() {
  const admin = createAdminClient();
  const { data: due } = await admin
    .from("posts")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString());

  if (!due?.length) return 0;

  await admin
    .from("posts")
    .update({ status: "published", published_at: new Date().toISOString() })
    .in(
      "id",
      due.map((p) => p.id)
    );
  return due.length;
}
