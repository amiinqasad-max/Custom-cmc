import { z } from "zod";

import { seoMetadataSchema } from "@/schemas/seo";
import { tiptapDocSchema } from "@/schemas/post";

// No `.default()` — paired with react-hook-form's zodResolver; defaults come
// from the form's `defaultValues` prop (see emptyPageDefaults()).
export const pageSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(220)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  content: tiptapDocSchema,
  featured_image_id: z.string().uuid().optional().nullable(),
  status: z.enum(["draft", "published"]),
  ads_enabled: z.boolean(),
  seo: seoMetadataSchema,
});
export type PageInput = z.infer<typeof pageSchema>;
