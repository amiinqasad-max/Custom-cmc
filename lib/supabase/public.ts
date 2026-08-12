import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Stateless anon-key client with no cookie/session plumbing — for reads that
 * are already public under RLS (sitemap generation, etc.) and run outside a
 * per-request context (so `cookies()` from next/headers isn't available).
 * Never use this where auth/RLS-as-current-user matters; use
 * lib/supabase/server.ts for that.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
