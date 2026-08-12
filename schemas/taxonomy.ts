import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  slug: z.string().trim().min(1).max(150).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  description: z.string().trim().max(2000).optional().nullable(),
  image_id: z.string().uuid().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  sort_order: z.number().int().default(0),
  ads_enabled: z.boolean().default(true),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const tagSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  slug: z.string().trim().min(1).max(150).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  description: z.string().trim().max(2000).optional().nullable(),
});
export type TagInput = z.infer<typeof tagSchema>;
