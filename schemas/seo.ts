import { z } from "zod";

export const seoMetadataSchema = z.object({
  seo_title: z.string().trim().max(70).optional().nullable(),
  meta_description: z.string().trim().max(160).optional().nullable(),
  canonical_url: z.string().trim().url().optional().nullable().or(z.literal("")),
  robots_index: z.boolean(),
  robots_follow: z.boolean(),
  og_title: z.string().trim().max(90).optional().nullable(),
  og_description: z.string().trim().max(200).optional().nullable(),
  og_image_id: z.string().uuid().optional().nullable(),
  twitter_card: z.enum(["summary", "summary_large_image"]),
  schema_type: z.string().trim().max(60).optional().nullable(),
});
export type SeoMetadataInput = z.infer<typeof seoMetadataSchema>;

export const EMPTY_SEO: SeoMetadataInput = {
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
};
