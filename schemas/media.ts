import { z } from "zod";

export const MEDIA_MAX_BYTES = {
  image: 15 * 1024 * 1024, // 15MB
  video: 500 * 1024 * 1024, // 500MB
  document: 25 * 1024 * 1024, // 25MB
} as const;

export const ALLOWED_MIME_TYPES: Record<"image" | "video" | "document", string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

export function mediaFileTypeFor(mimeType: string): "image" | "video" | "document" | null {
  for (const [type, mimes] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (mimes.includes(mimeType)) return type as "image" | "video" | "document";
  }
  return null;
}

export const mediaUpdateSchema = z.object({
  title: z.string().trim().max(200).optional().nullable(),
  alt_text: z.string().trim().max(300).optional().nullable(),
  caption: z.string().trim().max(500).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
});
export type MediaUpdateInput = z.infer<typeof mediaUpdateSchema>;

/** Server-side validation before accepting an upload — never trust the client's claimed mime/size alone. */
export function validateUpload(mimeType: string, sizeBytes: number): { ok: true } | { ok: false; error: string } {
  const fileType = mediaFileTypeFor(mimeType);
  if (!fileType) return { ok: false, error: `File type "${mimeType}" is not allowed.` };
  if (sizeBytes <= 0) return { ok: false, error: "Empty file." };
  if (sizeBytes > MEDIA_MAX_BYTES[fileType]) {
    return { ok: false, error: `${fileType} files must be under ${MEDIA_MAX_BYTES[fileType] / (1024 * 1024)}MB.` };
  }
  return { ok: true };
}
