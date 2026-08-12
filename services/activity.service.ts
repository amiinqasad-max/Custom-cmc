import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/types/database.types";

/**
 * Logs one admin audit-trail row. Called from every mutating service after a
 * successful write. Uses the caller's own (RLS-scoped) client — the
 * activity_logs INSERT policy only allows `user_id = auth.uid()`, so this
 * can never be used to forge another user's action.
 */
export async function logActivity(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, Json>;
  }
) {
  const { error } = await supabase.from("activity_logs").insert({
    user_id: params.userId,
    action: params.action,
    resource_type: params.resourceType ?? null,
    resource_id: params.resourceId ?? null,
    metadata: (params.metadata ?? {}) as Json,
  });
  if (error) {
    // Never let audit logging block the actual mutation the user asked for.
    console.error("activity log insert failed", error);
  }
}
