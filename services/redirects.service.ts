import "server-only";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/services/activity.service";

export async function listRedirects() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("redirects").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list redirects: ${error.message}`);
  return data ?? [];
}

export async function createRedirect(input: { from_path: string; to_path: string; status_code: 301 | 302 }, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("redirects").insert(input).select().single();
  if (error) throw new Error(`Failed to create redirect: ${error.message}`);
  await logActivity(supabase, { userId, action: "redirect.created", resourceType: "redirect", resourceId: data.id });
  return data;
}

export async function updateRedirect(
  id: string,
  input: { from_path: string; to_path: string; status_code: 301 | 302; is_active: boolean },
  userId: string
) {
  const supabase = await createClient();
  const { error } = await supabase.from("redirects").update(input).eq("id", id);
  if (error) throw new Error(`Failed to update redirect: ${error.message}`);
  await logActivity(supabase, { userId, action: "redirect.updated", resourceType: "redirect", resourceId: id });
}

export async function deleteRedirect(id: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("redirects").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete redirect: ${error.message}`);
  await logActivity(supabase, { userId, action: "redirect.deleted", resourceType: "redirect", resourceId: id });
}

export type NotFoundLog = { id: number; path: string; referrer: string | null; hit_count: number; first_seen_at: string; last_seen_at: string };

export async function listNotFoundLogs(): Promise<NotFoundLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("not_found_logs")
    .select("*")
    .order("last_seen_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Failed to list 404 logs: ${error.message}`);
  return data ?? [];
}
