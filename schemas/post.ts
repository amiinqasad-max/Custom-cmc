import { z } from "zod";

import { seoMetadataSchema } from "@/schemas/seo";

// TipTap JSON is arbitrary-depth; validate shape loosely and trust the
// editor to produce well-formed content (server still sanitizes on render).
export const tiptapDocSchema = z.object({
  type: z.literal("doc"),
  content: z.array(z.any()).optional(),
});

export const postVideoSchema = z.object({
  slot_index: z.number().int().min(1).max(3),
  media_id: z.string().uuid().nullable(),
  required: z.boolean().default(true),
  completion_threshold_percent: z.number().int().min(1).max(100).default(90),
});
export type PostVideoInput = z.infer<typeof postVideoSchema>;

export const postSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(220)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  excerpt: z.string().trim().max(500).optional().nullable(),
  content: tiptapDocSchema,
  featured_image_id: z.string().uuid().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  tag_ids: z.array(z.string().uuid()).default([]),
  author_id: z.string().uuid().optional().nullable(),
  status: z.enum(["draft", "scheduled", "published", "archived"]).default("draft"),
  is_featured: z.boolean().default(false),
  scheduled_at: z.string().datetime().optional().nullable(),
  next_article_id: z.string().uuid().optional().nullable(),
  completion_threshold_percent: z.number().int().min(1).max(100).optional().nullable(),
  videos: z.array(postVideoSchema).max(3).default([]),
  seo: seoMetadataSchema.default({
    seo_title: null,
    meta_description: null,
    canonical_url: null,
    robots_index: true,
    robots_follow: true,
    og_title: null,
    og_description: null,
    og_image_id: null,
    twitter_card: "summary_large_image",
    schema_type: null,
  }),
}).refine((data) => data.status !== "scheduled" || !!data.scheduled_at, {
  message: "Scheduled articles need a scheduled date/time",
  path: ["scheduled_at"],
});

export type PostInput = z.infer<typeof postSchema>;

export const postFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["all", "draft", "scheduled", "published", "archived"]).default("all"),
  category_id: z.string().uuid().optional(),
  tag_id: z.string().uuid().optional(),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
});
export type PostFilters = z.infer<typeof postFiltersSchema>;
