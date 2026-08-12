import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Service-role Supabase client. BYPASSES ROW LEVEL SECURITY.
 *
 * `import "server-only"` makes any accidental client-component import a build
 * error. Only use this from:
 *  - /api/track/* route handlers (anonymous tracking writes, validated + rate
 *    limited before this is ever touched)
 *  - narrow server actions that must legitimately cross RLS boundaries
 *    (e.g. reading aggregate analytics across all users)
 *
 * Never use this as a shortcut to skip writing a proper RLS policy or a
 * permission check — every call site using this client must do its own
 * authorization check first.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your server environment (never NEXT_PUBLIC_)."
    );
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
