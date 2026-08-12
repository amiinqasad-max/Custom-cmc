/**
 * Lightweight, edge-safe (no supabase-js) redirect lookup for proxy.ts.
 * Fetches the active redirect list via the public REST API (safe — RLS only
 * exposes `is_active = true` rows to anon, see redirects_select_public
 * policy) and caches it in module scope for 60s so most requests don't hit
 * the network at all.
 */
let cache: { map: Map<string, { to: string; status: number }>; expiresAt: number } | null = null;
const TTL_MS = 60_000;

export async function lookupRedirect(pathname: string): Promise<{ to: string; status: number } | null> {
  const now = Date.now();
  if (!cache || now > cache.expiresAt) {
    cache = await fetchRedirects();
  }
  return cache.map.get(pathname) ?? null;
}

async function fetchRedirects(): Promise<{ map: Map<string, { to: string; status: number }>; expiresAt: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const empty = { map: new Map(), expiresAt: Date.now() + TTL_MS };
  if (!url || !anonKey) return empty;

  try {
    const res = await fetch(
      `${url}/rest/v1/redirects?is_active=eq.true&select=from_path,to_path,status_code`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } }
    );
    if (!res.ok) return empty;
    const rows: Array<{ from_path: string; to_path: string; status_code: number }> = await res.json();
    const map = new Map(rows.map((r) => [r.from_path, { to: r.to_path, status: r.status_code }]));
    return { map, expiresAt: Date.now() + TTL_MS };
  } catch {
    return empty;
  }
}
