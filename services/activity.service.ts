import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
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

export async function listActivityLogs(params: { page?: number; perPage?: number } = {}) {
  const supabase = await createClient();
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 50;
  const from = (page - 1) * perPage;

  const { data, count, error } = await supabase
    .from("activity_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + perPage - 1);
  if (error) throw new Error(`Failed to list activity logs: ${error.message}`);

  const userIds = [...new Set((data ?? []).map((l) => l.user_id).filter(Boolean))] as string[];
  const { data: users } = userIds.length
    ? await supabase.from("profiles").select("id, display_name, email").in("id", userIds)
    : { data: [] as Array<{ id: string; display_name: string | null; email: string }> };
  const userById = new Map((users ?? []).map((u) => [u.id, u.display_name ?? u.email]));

  return {
    items: (data ?? []).map((l) => ({ ...l, user_name: l.user_id ? (userById.get(l.user_id) ?? "Unknown") : "System" })),
    total: count ?? 0,
    page,
    perPage,
  };
}
