import { createClient } from "@/lib/supabase/client";
import { validateUpload } from "@/schemas/media";
import { registerMediaUploadAction } from "@/app/admin/media/actions";

/** Reads natural width/height for images without hitting the network twice. */
function probeImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/**
 * Dynamically detects video duration client-side (§4/§33 — never hard-coded).
 * Loads just the metadata (preload="metadata"), not the full file.
 */
function probeVideoDuration(file: File): Promise<number | null> {
  if (!file.type.startsWith("video/")) return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve(Number.isFinite(video.duration) ? video.duration : null);
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    video.src = url;
  });
}

export type UploadProgress = { loaded: number; total: number };

/**
 * Uploads a file directly from the browser to Supabase Storage (so large
 * video files never round-trip through the Next.js server), probes
 * dimensions/duration client-side, then registers the `media` row via a
 * server action that re-validates everything.
 */
export async function uploadMediaFile(file: File, userId: string) {
  const validation = validateUpload(file.type, file.size);
  if (!validation.ok) throw new Error(validation.error);

  const [dimensions, duration] = await Promise.all([probeImageDimensions(file), probeVideoDuration(file)]);

  const ext = file.name.split(".").pop() ?? "bin";
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const folder = file.type.startsWith("image/") ? "images" : file.type.startsWith("video/") ? "videos" : "documents";
  const storagePath = `${folder}/${userId}/${crypto.randomUUID()}-${safeName}`.replace(/\.[^.]+$/, `.${ext}`);

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage.from("media").upload(storagePath, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  return registerMediaUploadAction({
    fileName: file.name,
    storagePath,
    mimeType: file.type,
    fileSizeBytes: file.size,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    durationSeconds: duration ?? null,
  });
}
