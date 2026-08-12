import { z } from "zod";

export const adTrackSchema = z.object({
  placementId: z.string().uuid(),
  postId: z.string().uuid().optional().nullable(),
  sessionToken: z.string().uuid().optional().nullable(),
  eventType: z.enum(["request", "load", "render", "viewable"]),
});
export type AdTrackInput = z.infer<typeof adTrackSchema>;
