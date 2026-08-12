import { z } from "zod";

import { seoMetadataSchema, EMPTY_SEO } from "@/schemas/seo";
import { tiptapDocSchema } from "@/schemas/post";

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
  status: z.enum(["draft", "published"]).default("draft"),
  ads_enabled: z.boolean().default(false),
  seo: seoMetadataSchema.default(EMPTY_SEO),
});
export type PageInput = z.infer<typeof pageSchema>;
