"use server";

import { revalidatePath } from "next/cache";

import { requireRole, assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { menuSchema, menuItemSchema } from "@/schemas/menu";
import {
  createMenu,
  deleteMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  reorderMenuItems,
  getMenuWithItems,
} from "@/services/menus.service";
import { slugifyTitle, uniqueSlug } from "@/lib/content/slug";
import { createClient } from "@/lib/supabase/server";

export async function getMenuItemsAction(menuId: string) {
  await requireRole("admin");
  return getMenuWithItems(menuId);
}

export async function createMenuAction(formData: FormData) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.MENUS_MANAGE);

  const name = String(formData.get("name") ?? "");
  const supabase = await createClient();
  const { data: existing } = await supabase.from("menus").select("slug");
  const slug = uniqueSlug(slugifyTitle(name), new Set((existing ?? []).map((m) => m.slug)));

  const input = menuSchema.parse({ name, slug, location: formData.get("location") });
  const menu = await createMenu(input, profile.id);
  revalidatePath("/admin/menus");
  return menu;
}

export async function deleteMenuAction(id: string) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.MENUS_MANAGE);
  await deleteMenu(id, profile.id);
  revalidatePath("/admin/menus");
}

export async function createMenuItemAction(formData: FormData) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.MENUS_MANAGE);

  const parentId = formData.get("parent_id");
  const input = menuItemSchema.parse({
    menu_id: formData.get("menu_id"),
    parent_id: parentId && parentId !== "none" ? parentId : null,
    label: formData.get("label"),
    type: formData.get("type"),
    target_id: formData.get("target_id") || null,
    url: formData.get("url") || null,
    is_enabled: true,
    open_in_new_tab: formData.get("open_in_new_tab") === "on",
  });
  await createMenuItem(input, profile.id);
  revalidatePath("/admin/menus");
}

export async function toggleMenuItemAction(id: string, isEnabled: boolean) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.MENUS_MANAGE);
  await updateMenuItem(id, { is_enabled: isEnabled }, profile.id);
  revalidatePath("/admin/menus");
}

export async function deleteMenuItemAction(id: string) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.MENUS_MANAGE);
  await deleteMenuItem(id, profile.id);
  revalidatePath("/admin/menus");
}

export async function reorderMenuItemsAction(orderedIds: string[]) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.MENUS_MANAGE);
  await reorderMenuItems(orderedIds, profile.id);
  revalidatePath("/admin/menus");
}
