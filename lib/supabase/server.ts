import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database.types";

/**
 * Server-side Supabase client for Server Components / Server Actions / Route Handlers.
 * Runs as the *current signed-in user* (anon key + their session cookie), so RLS applies
 * exactly as it would in the browser. Use this for all normal reads/writes in admin UI.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component with no request context to write to —
            // safe to ignore as long as middleware refreshes the session.
          }
        },
      },
    }
  );
}
