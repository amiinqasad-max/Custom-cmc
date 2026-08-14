import { z } from "zod";

import { seoMetadataSchema, EMPTY_SEO } from "@/schemas/seo";

// TipTap JSON is arbitrary-depth; validate shape loosely and trust the
// editor to produce well-formed content (server still sanitizes on render).
export const tiptapDocSchema = z.object({
  type: z.literal("doc"),
  content: z.array(z.any()).optional(),
});

export const postVideoSchema = z.object({
  slot_index: z.number().int().min(1).max(3),
  media_id: z.string().uuid().nullable(),
  required: z.boolean(),
  completion_threshold_percent: z.number().int().min(1).max(100),
});
export type PostVideoInput = z.infer<typeof postVideoSchema>;

// No `.default()` anywhere in this schema: it's paired with react-hook-form's
// zodResolver, whose TFieldValues must match the *input* type exactly. All
// defaults are supplied via the form's `defaultValues` prop instead
// (see emptyPostDefaults()).
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
  tag_ids: z.array(z.string().uuid()),
  author_id: z.string().uuid().optional().nullable(),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  is_featured: z.boolean(),
  scheduled_at: z.string().datetime().optional().nullable(),
  next_article_id: z.string().uuid().optional().nullable(),
  completion_threshold_percent: z.number().int().min(1).max(100).optional().nullable(),
  videos: z.array(postVideoSchema).max(3),
  seo: seoMetadataSchema,
}).refine((data) => data.status !== "scheduled" || !!data.scheduled_at, {
  message: "Scheduled articles need a scheduled date/time",
  path: ["scheduled_at"],
});

export type PostInput = z.infer<typeof postSchema>;

// Plain data, deliberately kept out of any "use client" module: a server
// component (app/admin/posts/new/page.tsx) calls this directly, and calling
// a function exported from a client module from server code throws at
// runtime ("Attempted to call X from the server but X is on the client").
export function emptyPostDefaults(): PostInput {
  return {
    title: "",
    slug: "",
    excerpt: "",
    content: { type: "doc", content: [] },
    featured_image_id: null,
    category_id: null,
    tag_ids: [],
    author_id: null,
    status: "draft",
    is_featured: false,
    scheduled_at: null,
    next_article_id: null,
    completion_threshold_percent: null,
    videos: [],
    seo: EMPTY_SEO,
  };
}

export const postFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["all", "draft", "scheduled", "published", "archived"]).default("all"),
  category_id: z.string().uuid().optional(),
  tag_id: z.string().uuid().optional(),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
});
export type PostFilters = z.infer<typeof postFiltersSchema>;
