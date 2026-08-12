import { z } from "zod";

export const articleTrackSchema = z.object({
  postId: z.string().uuid(),
  sessionToken: z.string().uuid(),
  event: z.enum(["open", "heartbeat", "bottom", "next_opened"]),
  progressPercent: z.number().min(0).max(100).optional(),
  timeSpentSeconds: z.number().min(0).optional(),
  nextPostId: z.string().uuid().optional(),
  referrer: z.string().max(2048).optional().nullable(),
});
export type ArticleTrackInput = z.infer<typeof articleTrackSchema>;

export const videoTrackSchema = z.object({
  postId: z.string().uuid(),
  sessionToken: z.string().uuid(),
  slotIndex: z.number().int().min(1).max(3),
  event: z.enum(["play", "pause", "progress", "ended"]),
  currentTimeSeconds: z.number().min(0),
  clientDurationSeconds: z.number().min(0).optional(),
});
export type VideoTrackInput = z.infer<typeof videoTrackSchema>;
