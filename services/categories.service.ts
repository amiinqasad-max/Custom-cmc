import "server-only";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/services/activity.service";
import type { CategoryInput } from "@/schemas/taxonomy";

export async function listCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("*").order("sort_order").order("name");
  if (error) throw new Error(`Failed to list categories: ${error.message}`);
  return data ?? [];
}

export async function getCategory(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("*").eq("id", id).single();
  if (error) throw new Error(`Category not found: ${error.message}`);
  return data;
}

export async function getExistingCategorySlugs(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("slug");
  return new Set((data ?? []).map((c) => c.slug));
}

export async function createCategory(input: CategoryInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").insert(input).select().single();
  if (error) throw new Error(`Failed to create category: ${error.message}`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await logActivity(supabase, { userId: user.id, action: "category.created", resourceType: "category", resourceId: data.id });
  return data;
}

export async function updateCategory(id: string, input: CategoryInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").update(input).eq("id", id).select().single();
  if (error) throw new Error(`Failed to update category: ${error.message}`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await logActivity(supabase, { userId: user.id, action: "category.updated", resourceType: "category", resourceId: id });
  return data;
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete category: ${error.message}`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await logActivity(supabase, { userId: user.id, action: "category.deleted", resourceType: "category", resourceId: id });
}
