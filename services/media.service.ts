import "server-only";

import { createClient } from "@/lib/supabase/server";
import { validateUpload, mediaFileTypeFor, type MediaUpdateInput } from "@/schemas/media";
import { logActivity } from "@/services/activity.service";
import type { Tables } from "@/types/database.types";

export type MediaItem = Tables<"media">;

export type MediaFilters = {
  search?: string;
  fileType?: "image" | "video" | "document" | "all";
  page?: number;
  perPage?: number;
};

export async function listMedia(filters: MediaFilters = {}) {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 24;
  const from = (page - 1) * perPage;

  let query = supabase.from("media").select("*", { count: "exact" }).order("created_at", { ascending: false });

  if (filters.fileType && filters.fileType !== "all") {
    query = query.eq("file_type", filters.fileType);
  }
  if (filters.search) {
    query = query.or(`file_name.ilike.%${filters.search}%,title.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query.range(from, from + perPage - 1);
  if (error) throw new Error(`Failed to list media: ${error.message}`);

  return { items: data ?? [], total: count ?? 0, page, perPage };
}

export async function getMediaByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("media").select("*").in("id", ids);
  if (error) throw new Error(`Failed to load media: ${error.message}`);
  return data ?? [];
}

/**
 * Registers a media row *after* the file bytes are already uploaded to
 * Supabase Storage client-side (browser -> Storage directly, so large video
 * uploads never round-trip through the Next.js server). Re-validates
 * mime/size server-side rather than trusting the client's claims blindly.
 */
export async function registerMediaUpload(input: {
  fileName: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
}) {
  const validation = validateUpload(input.mimeType, input.fileSizeBytes);
  if (!validation.ok) throw new Error(validation.error);

  const fileType = mediaFileTypeFor(input.mimeType);
  if (!fileType) throw new Error("Unsupported file type");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: publicUrl } = supabase.storage.from("media").getPublicUrl(input.storagePath);

  const { data, error } = await supabase
    .from("media")
    .insert({
      file_name: input.fileName,
      storage_path: input.storagePath,
      url: publicUrl.publicUrl,
      mime_type: input.mimeType,
      file_type: fileType,
      file_size_bytes: input.fileSizeBytes,
      width: input.width ?? null,
      height: input.height ?? null,
      duration_seconds: input.durationSeconds ?? null,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save media record: ${error.message}`);

  await logActivity(supabase, {
    userId: user.id,
    action: "media.uploaded",
    resourceType: "media",
    resourceId: data.id,
    metadata: { file_name: input.fileName, file_type: fileType },
  });

  return data;
}

export async function updateMedia(id: string, input: MediaUpdateInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media")
    .update({
      title: input.title ?? null,
      alt_text: input.alt_text ?? null,
      caption: input.caption ?? null,
      description: input.description ?? null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update media: ${error.message}`);
  return data;
}

export async function deleteMedia(id: string) {
  const supabase = await createClient();
  const { data: media, error: fetchError } = await supabase
    .from("media")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (fetchError) throw new Error(`Media not found: ${fetchError.message}`);

  const { error: deleteError } = await supabase.from("media").delete().eq("id", id);
  if (deleteError) throw new Error(`Failed to delete media: ${deleteError.message}`);

  await supabase.storage.from("media").remove([media.storage_path]);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logActivity(supabase, { userId: user.id, action: "media.deleted", resourceType: "media", resourceId: id });
  }
}
