import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { logActivity } from "@/services/activity.service";
import type { MenuInput, MenuItemInput } from "@/schemas/menu";
import type { Tables, TablesUpdate } from "@/types/database.types";

export async function listMenus() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("menus").select("*").order("name");
  if (error) throw new Error(`Failed to list menus: ${error.message}`);
  return data ?? [];
}

export async function getMenuWithItems(menuId: string) {
  const supabase = await createClient();
  const [{ data: menu }, { data: items }] = await Promise.all([
    supabase.from("menus").select("*").eq("id", menuId).single(),
    supabase.from("menu_items").select("*").eq("menu_id", menuId).order("sort_order"),
  ]);
  return { menu, items: items ?? [] };
}

/** Resolves display labels for page/article/category targets so the admin UI can show "About" instead of a UUID. */
export async function resolveMenuItemTargets(items: Tables<"menu_items">[]) {
  const supabase = await createClient();
  const byType = { page: [] as string[], article: [] as string[], category: [] as string[] };
  for (const item of items) {
    if (item.type !== "custom_url" && item.target_id) byType[item.type].push(item.target_id);
  }

  const [{ data: pages }, { data: posts }, { data: categories }] = await Promise.all([
    byType.page.length ? supabase.from("pages").select("id, title, slug").in("id", byType.page) : Promise.resolve({ data: [] }),
    byType.article.length ? supabase.from("posts").select("id, title, slug").in("id", byType.article) : Promise.resolve({ data: [] }),
    byType.category.length
      ? supabase.from("categories").select("id, name, slug").in("id", byType.category)
      : Promise.resolve({ data: [] }),
  ]);

  const map = new Map<string, { label: string; path: string }>();
  for (const p of pages ?? []) map.set(p.id, { label: p.title, path: `/page/${p.slug}` });
  for (const p of posts ?? []) map.set(p.id, { label: p.title, path: `/articles/${p.slug}` });
  for (const c of categories ?? []) map.set(c.id, { label: c.name, path: `/category/${c.slug}` });
  return map;
}

export async function createMenu(input: MenuInput, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("menus").insert(input).select().single();
  if (error) throw new Error(`Failed to create menu: ${error.message}`);
  await logActivity(supabase, { userId, action: "menu.created", resourceType: "menu", resourceId: data.id });
  return data;
}

export async function deleteMenu(id: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("menus").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete menu: ${error.message}`);
  await logActivity(supabase, { userId, action: "menu.deleted", resourceType: "menu", resourceId: id });
}

export async function createMenuItem(input: MenuItemInput, userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("menu_items")
    .select("*", { count: "exact", head: true })
    .eq("menu_id", input.menu_id);

  const { data, error } = await supabase
    .from("menu_items")
    .insert({ ...input, sort_order: count ?? 0 })
    .select()
    .single();
  if (error) throw new Error(`Failed to create menu item: ${error.message}`);
  await logActivity(supabase, { userId, action: "menu.item_created", resourceType: "menu_item", resourceId: data.id });
  return data;
}

export async function updateMenuItem(id: string, input: TablesUpdate<"menu_items">, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").update(input).eq("id", id);
  if (error) throw new Error(`Failed to update menu item: ${error.message}`);
  await logActivity(supabase, { userId, action: "menu.item_updated", resourceType: "menu_item", resourceId: id });
}

export async function deleteMenuItem(id: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete menu item: ${error.message}`);
  await logActivity(supabase, { userId, action: "menu.item_deleted", resourceType: "menu_item", resourceId: id });
}

export async function reorderMenuItems(orderedIds: string[], userId: string) {
  const supabase = await createClient();
  await Promise.all(orderedIds.map((id, index) => supabase.from("menu_items").update({ sort_order: index }).eq("id", id)));
  await logActivity(supabase, { userId, action: "menu.reordered", resourceType: "menu" });
}

/** Public read used by the site header/footer — no cookies, so pages using this stay statically generatable. */
export async function getPublicMenuByLocation(location: "header" | "footer") {
  const supabase = createPublicClient();
  const { data: menu } = await supabase.from("menus").select("*").eq("location", location).limit(1).maybeSingle();
  if (!menu) return null;
  const { data: items } = await supabase
    .from("menu_items")
    .select("*")
    .eq("menu_id", menu.id)
    .eq("is_enabled", true)
    .order("sort_order");
  return { menu, items: items ?? [], hrefById: await resolvePublicMenuItemHrefs(supabase, items ?? []) };
}

async function resolvePublicMenuItemHrefs(
  supabase: ReturnType<typeof createPublicClient>,
  items: Tables<"menu_items">[]
) {
  const byType = { page: [] as string[], article: [] as string[], category: [] as string[] };
  for (const item of items) {
    if (item.type !== "custom_url" && item.target_id) byType[item.type].push(item.target_id);
  }

  const [{ data: pages }, { data: posts }, { data: categories }] = await Promise.all([
    byType.page.length ? supabase.from("pages").select("id, slug").in("id", byType.page) : Promise.resolve({ data: [] }),
    byType.article.length ? supabase.from("posts").select("id, slug").in("id", byType.article) : Promise.resolve({ data: [] }),
    byType.category.length ? supabase.from("categories").select("id, slug").in("id", byType.category) : Promise.resolve({ data: [] }),
  ]);

  const map = new Map<string, string>();
  for (const p of pages ?? []) map.set(p.id, `/page/${p.slug}`);
  for (const p of posts ?? []) map.set(p.id, `/articles/${p.slug}`);
  for (const c of categories ?? []) map.set(c.id, `/category/${c.slug}`);
  return map;
}

