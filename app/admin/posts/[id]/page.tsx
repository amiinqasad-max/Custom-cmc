import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { listCategories } from "@/services/categories.service";
import { listTags } from "@/services/tags.service";
import { listPosts, getPostForEdit } from "@/services/posts.service";
import { getMediaByIds } from "@/services/media.service";
import { EMPTY_SEO } from "@/schemas/seo";
import { PostEditorForm } from "@/components/admin/posts/post-editor-form";
import type { PostInput } from "@/schemas/post";
import type { VideoSlotState } from "@/components/admin/posts/video-slots-panel";

export const metadata = { title: "Edit article" };

export default async function EditPostPage({ params }: PageProps<"/admin/posts/[id]">) {
  const { id } = await params;
  const profile = await requireRole("author");

  const [{ post, tagIds, videos, seo }, categories, tags, postsPage] = await Promise.all([
    getPostForEdit(id).catch(() => notFound()),
    listCategories(),
    listTags(),
    listPosts({ status: "all", page: 1, perPage: 100 }),
  ]);
  if (!post) notFound();

  const mediaIds = [post.featured_image_id, ...videos.map((v) => v.media_id)].filter(Boolean) as string[];
  const mediaItems = await getMediaByIds(mediaIds);
  const mediaById = new Map(mediaItems.map((m) => [m.id, m]));

  const featuredImagePreview = post.featured_image_id
    ? (() => {
        const m = mediaById.get(post.featured_image_id!);
        return m ? { url: m.url, alt: m.alt_text } : null;
      })()
    : null;

  const initialVideoSlots: VideoSlotState[] = [1, 2, 3].map((slotIndex) => {
    const existing = videos.find((v) => v.slot_index === slotIndex);
    const media = existing?.media_id ? mediaById.get(existing.media_id) : undefined;
    return {
      slot_index: slotIndex,
      media_id: existing?.media_id ?? null,
      required: existing?.required ?? true,
      completion_threshold_percent: existing?.completion_threshold_percent ?? 90,
      mediaPreview: media ? { file_name: media.file_name, duration_seconds: media.duration_seconds } : null,
    };
  });

  const defaultValues: PostInput = {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? "",
    content: (post.content as PostInput["content"]) ?? { type: "doc", content: [] },
    featured_image_id: post.featured_image_id,
    category_id: post.category_id,
    tag_ids: tagIds,
    author_id: post.author_id,
    status: post.status,
    is_featured: post.is_featured,
    scheduled_at: post.scheduled_at,
    next_article_id: post.next_article_id,
    completion_threshold_percent: post.completion_threshold_percent,
    videos: [],
    seo: seo
      ? {
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
        }
      : EMPTY_SEO,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit article</h1>
      </div>
      <PostEditorForm
        postId={post.id}
        defaultValues={defaultValues}
        initialVideoSlots={initialVideoSlots}
        featuredImagePreview={featuredImagePreview}
        categories={categories}
        tags={tags}
        otherPosts={postsPage.items.filter((p) => p.id !== post.id).map((p) => ({ id: p.id, title: p.title, slug: p.slug }))}
        userId={profile.id}
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"}
      />
    </div>
  );
}
