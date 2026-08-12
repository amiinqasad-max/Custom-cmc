"use client";

/**
 * A session_token persists in sessionStorage per article so a refresh or
 * tab-return resumes the same article_sessions/post_video_progress rows
 * instead of spawning duplicates (§41: "must work reliably even if... page
 * refreshes"). A genuinely new visit (new tab, next day) gets a fresh token,
 * which is what makes "return visits" show up as distinct sessions.
 */
export function getOrCreateSessionToken(postId: string): string {
  const key = `article_session:${postId}`;
  if (typeof window === "undefined") return crypto.randomUUID();

  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;

  const token = crypto.randomUUID();
  window.sessionStorage.setItem(key, token);
  return token;
}
