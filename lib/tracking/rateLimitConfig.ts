import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import { getSetting } from "@/services/settings.service";

let cache: { limit: number; expiresAt: number } | null = null;
const TTL_MS = 60_000;

/** Cached read of Settings -> Security -> track_api_rate_limit_per_minute, so the hot tracking path doesn't hit the DB on every request. */
export async function getTrackRateLimit(): Promise<number> {
  const now = Date.now();
  if (cache && now < cache.expiresAt) return cache.limit;

  try {
    const security = await getSetting("security", createPublicClient());
    cache = { limit: security.track_api_rate_limit_per_minute, expiresAt: now + TTL_MS };
    return cache.limit;
  } catch {
    return 120;
  }
}
