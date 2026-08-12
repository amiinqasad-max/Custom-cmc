import "server-only";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/services/activity.service";
import type { TagInput } from "@/schemas/taxonomy";

export async function listTags() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tags").select("*").order("name");
  if (error) throw new Error(`Failed to list tags: ${error.message}`);
  return data ?? [];
}

export async function getExistingTagSlugs(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("slug");
  return new Set((data ?? []).map((t) => t.slug));
}

export async function createTag(input: TagInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tags").insert(input).select().single();
  if (error) throw new Error(`Failed to create tag: ${error.message}`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await logActivity(supabase, { userId: user.id, action: "tag.created", resourceType: "tag", resourceId: data.id });
  return data;
}

export async function updateTag(id: string, input: TagInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tags").update(input).eq("id", id).select().single();
  if (error) throw new Error(`Failed to update tag: ${error.message}`);
  return data;
}

export async function deleteTag(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete tag: ${error.message}`);
}
