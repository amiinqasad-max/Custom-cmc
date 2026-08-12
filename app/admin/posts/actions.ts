"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole, assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { postSchema, type PostInput } from "@/schemas/post";
import {
  createPost,
  updatePost,
  deletePost,
  duplicatePost,
  setPostStatus,
  getExistingPostSlugs,
  getPostForEdit,
} from "@/services/posts.service";
import { slugifyTitle, uniqueSlug } from "@/lib/content/slug";

async function assertCanEditPost(postId?: string) {
  const profile = await requireRole("author");
  assertPermission(profile, PERMISSIONS.POSTS_CREATE);

  if (postId) {
    const { post } = await getPostForEdit(postId);
    const isOwner = post.author_id === profile.id;
    if (!isOwner) assertPermission(profile, PERMISSIONS.POSTS_EDIT_ANY);
  }
  return profile;
}

export async function savePostAction(postId: string | null, input: PostInput) {
  const profile = await assertCanEditPost(postId ?? undefined);

  if (input.status === "published" || input.status === "scheduled") {
    assertPermission(profile, PERMISSIONS.POSTS_PUBLISH);
  }

  const parsed = postSchema.parse(input);
  const slugs = await getExistingPostSlugs();
  parsed.slug = uniqueSlug(parsed.slug || slugifyTitle(parsed.title), slugs, postId ? parsed.slug : undefined);

  const post = postId ? await updatePost(postId, parsed, profile.id) : await createPost(parsed, profile.id);

  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${post.id}`);
  revalidatePath(`/articles/${post.slug}`);
  return post;
}

export async function deletePostAction(id: string) {
  const profile = await assertCanEditPost(id);
  assertPermission(profile, PERMISSIONS.POSTS_DELETE);
  await deletePost(id, profile.id);
  revalidatePath("/admin/posts");
}

export async function duplicatePostAction(id: string) {
  const profile = await requireRole("author");
  assertPermission(profile, PERMISSIONS.POSTS_CREATE);
  const copy = await duplicatePost(id, profile.id);
  revalidatePath("/admin/posts");
  redirect(`/admin/posts/${copy.id}`);
}

export async function setPostStatusAction(id: string, status: "draft" | "published" | "archived") {
  const profile = await assertCanEditPost(id);
  assertPermission(profile, PERMISSIONS.POSTS_PUBLISH);
  await setPostStatus(id, status, profile.id);
  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${id}`);
}
