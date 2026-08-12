"use server";

import { revalidatePath } from "next/cache";

import { requireRole, assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { setCommentStatus, deleteComment } from "@/services/comments.service";

export async function setCommentStatusAction(id: string, status: "approved" | "rejected" | "spam" | "pending") {
  const profile = await requireRole("editor");
  assertPermission(profile, PERMISSIONS.COMMENTS_MODERATE);
  await setCommentStatus(id, status, profile.id);
  revalidatePath("/admin/comments");
}

export async function deleteCommentAction(id: string) {
  const profile = await requireRole("editor");
  assertPermission(profile, PERMISSIONS.COMMENTS_MODERATE);
  await deleteComment(id, profile.id);
  revalidatePath("/admin/comments");
}
