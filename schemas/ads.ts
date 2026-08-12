import { z } from "zod";

export const adSlotSchema = z.object({
  name: z.string().trim().min(1).max(150),
  ad_client: z.string().trim().min(1).max(60),
  ad_slot: z.string().trim().min(1).max(60),
  format: z.enum(["auto", "horizontal", "vertical", "rectangle", "in-article"]),
  responsive: z.boolean(),
  status: z.enum(["active", "inactive"]),
});
export type AdSlotInput = z.infer<typeof adSlotSchema>;

export const adPlacementSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    ad_slot_id: z.string().uuid(),
    position_type: z.enum(["top", "after_paragraph", "before_video", "after_video", "middle", "before_conclusion", "bottom"]),
    paragraph_number: z.number().int().min(1).optional().nullable(),
    video_slot: z.number().int().min(1).max(3).optional().nullable(),
    priority: z.number().int(),
    is_enabled: z.boolean(),
  })
  .refine((d) => d.position_type !== "after_paragraph" || !!d.paragraph_number, {
    message: "Paragraph number is required for this position",
    path: ["paragraph_number"],
  })
  .refine((d) => !(d.position_type === "before_video" || d.position_type === "after_video") || !!d.video_slot, {
    message: "Video slot is required for this position",
    path: ["video_slot"],
  });
export type AdPlacementInput = z.infer<typeof adPlacementSchema>;

export const adSafetySchema = z.object({
  max_ads_per_article: z.number().int().min(0).max(20),
  min_paragraphs_between_ads: z.number().int().min(0).max(50),
  min_content_length_before_ads: z.number().int().min(0),
  disable_on_pages: z.boolean(),
  disable_on_short_articles: z.boolean(),
  short_article_word_count: z.number().int().min(0),
});
export type AdSafetyInput = z.infer<typeof adSafetySchema>;
