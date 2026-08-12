/**
 * The single most important rule in this codebase (§7/§41):
 *
 *   article_completed = reading_progress >= threshold
 *                        AND every *required* video is completed
 *
 * Pure and server-authoritative — never trusts a client-sent `completed`
 * flag. See app/api/track/article and app/api/track/video for the only
 * call sites, both server-side.
 */

export type RequiredVideoStatus = { postVideoId: string; required: boolean; completed: boolean };

export function isArticleComplete(params: {
  progressPercent: number;
  threshold: number;
  videos: RequiredVideoStatus[];
}): boolean {
  const meetsReading = params.progressPercent >= params.threshold;
  const meetsVideos = params.videos.filter((v) => v.required).every((v) => v.completed);
  return meetsReading && meetsVideos;
}

export function isVideoComplete(params: {
  maxWatchedSeconds: number;
  durationSeconds: number | null;
  thresholdPercent: number;
  nativeEndedFired?: boolean;
}): boolean {
  // Robust even if the browser never fires `ended` (§6) — driven by the
  // watched-seconds high-water mark, not the event itself.
  if (params.nativeEndedFired) return true;
  if (!params.durationSeconds || params.durationSeconds <= 0) return false;
  const percent = (params.maxWatchedSeconds / params.durationSeconds) * 100;
  return percent >= params.thresholdPercent;
}

export function watchPercentage(maxWatchedSeconds: number, durationSeconds: number | null): number {
  if (!durationSeconds || durationSeconds <= 0) return 0;
  return Math.min(100, Math.round((maxWatchedSeconds / durationSeconds) * 1000) / 10);
}
