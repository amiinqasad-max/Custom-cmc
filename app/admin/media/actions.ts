"use server";

import { revalidatePath } from "next/cache";

import { requireRole, assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { mediaUpdateSchema } from "@/schemas/media";
import { registerMediaUpload, updateMedia, deleteMedia, listMedia, type MediaFilters } from "@/services/media.service";

export async function listMediaAction(filters: MediaFilters) {
  await requireRole("author");
  return listMedia(filters);
}

export async function registerMediaUploadAction(input: {
  fileName: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
}) {
  const profile = await requireRole("author");
  assertPermission(profile, PERMISSIONS.MEDIA_UPLOAD);
  const media = await registerMediaUpload(input);
  revalidatePath("/admin/media");
  return media;
}

export async function updateMediaAction(id: string, formData: FormData) {
  const profile = await requireRole("author");
  assertPermission(profile, PERMISSIONS.MEDIA_UPLOAD);
  const parsed = mediaUpdateSchema.safeParse({
    title: formData.get("title"),
    alt_text: formData.get("alt_text"),
    caption: formData.get("caption"),
    description: formData.get("description"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  await updateMedia(id, parsed.data);
  revalidatePath("/admin/media");
}

export async function deleteMediaAction(id: string) {
  const profile = await requireRole("author");
  assertPermission(profile, PERMISSIONS.MEDIA_UPLOAD);
  await deleteMedia(id);
  revalidatePath("/admin/media");
}
