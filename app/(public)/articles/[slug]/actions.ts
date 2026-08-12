"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth/guards";
import { submitComment } from "@/services/comments.service";

const submitSchema = z.object({
  postId: z.string().uuid(),
  postSlug: z.string().min(1),
  authorName: z.string().trim().min(1).max(100),
  authorEmail: z.string().trim().email().optional().or(z.literal("")),
  content: z.string().trim().min(1).max(3000),
});

export type SubmitCommentState = { error?: string; success?: boolean } | undefined;

export async function submitCommentAction(_prev: SubmitCommentState, formData: FormData): Promise<SubmitCommentState> {
  const parsed = submitSchema.safeParse({
    postId: formData.get("postId"),
    postSlug: formData.get("postSlug"),
    authorName: formData.get("authorName"),
    authorEmail: formData.get("authorEmail"),
    content: formData.get("content"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const profile = await getCurrentProfile();
  try {
    await submitComment({
      postId: parsed.data.postId,
      authorName: profile?.displayName ?? parsed.data.authorName,
      authorEmail: parsed.data.authorEmail || null,
      content: parsed.data.content,
      authorUserId: profile?.id ?? null,
    });
    revalidatePath(`/articles/${parsed.data.postSlug}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to submit comment" };
  }
}
