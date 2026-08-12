import type { NextRequest } from "next/server";

/**
 * Lightweight CSRF/hotlink guard for the public /api/track/* endpoints:
 * if the browser sent an Origin header, it must match our own site. Requests
 * with no Origin header (some same-origin beacons/older browsers) are let
 * through since we can't verify them either way — this is a defense-in-depth
 * layer on top of rate limiting and anti-fraud clamping, not a hard boundary.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return true;

  try {
    return new URL(origin).host === new URL(siteUrl).host;
  } catch {
    return true;
  }
}
