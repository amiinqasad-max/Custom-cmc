import { requireRole } from "@/lib/auth/guards";
import { listCategories } from "@/services/categories.service";
import { listTags } from "@/services/tags.service";
import { listPosts } from "@/services/posts.service";
import { PostEditorForm, emptyPostDefaults } from "@/components/admin/posts/post-editor-form";
import type { VideoSlotState } from "@/components/admin/posts/video-slots-panel";

const EMPTY_VIDEO_SLOTS: VideoSlotState[] = [1, 2, 3].map((slot_index) => ({
  slot_index,
  media_id: null,
  required: true,
  completion_threshold_percent: 90,
  mediaPreview: null,
}));

export const metadata = { title: "New article" };

export default async function NewPostPage() {
  const profile = await requireRole("author");
  const [categories, tags, postsPage] = await Promise.all([
    listCategories(),
    listTags(),
    listPosts({ status: "all", page: 1, perPage: 100 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New article</h1>
      </div>
      <PostEditorForm
        postId={null}
        defaultValues={emptyPostDefaults()}
        initialVideoSlots={EMPTY_VIDEO_SLOTS}
        featuredImagePreview={null}
        categories={categories}
        tags={tags}
        otherPosts={postsPage.items.map((p) => ({ id: p.id, title: p.title, slug: p.slug }))}
        userId={profile.id}
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"}
      />
    </div>
  );
}
