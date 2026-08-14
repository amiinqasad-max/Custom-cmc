"use server";

import { revalidatePath } from "next/cache";

import { requireRole, assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { categorySchema } from "@/schemas/taxonomy";
import { createCategory, updateCategory, deleteCategory, getExistingCategorySlugs } from "@/services/categories.service";
import { slugifyTitle, uniqueSlug } from "@/lib/content/slug";
import { parseOrThrow } from "@/lib/zod-error";

function parseForm(formData: FormData) {
  return parseOrThrow(categorySchema, {
    name: formData.get("name"),
    slug: String(formData.get("slug") || "").trim() || slugifyTitle(String(formData.get("name") || "")),
    description: formData.get("description") || null,
    image_id: formData.get("image_id") || null,
    parent_id: (formData.get("parent_id") as string) === "none" ? null : formData.get("parent_id") || null,
    sort_order: Number(formData.get("sort_order") || 0),
    ads_enabled: formData.get("ads_enabled") === "on",
  });
}

export async function createCategoryAction(formData: FormData) {
  const profile = await requireRole("editor");
  assertPermission(profile, PERMISSIONS.CATEGORIES_MANAGE);
  const input = parseForm(formData);
  const slugs = await getExistingCategorySlugs();
  input.slug = uniqueSlug(input.slug, slugs);
  await createCategory(input);
  revalidatePath("/admin/categories");
}

export async function updateCategoryAction(id: string, formData: FormData) {
  const profile = await requireRole("editor");
  assertPermission(profile, PERMISSIONS.CATEGORIES_MANAGE);
  const input = parseForm(formData);
  const slugs = await getExistingCategorySlugs();
  input.slug = uniqueSlug(input.slug, slugs, input.slug);
  await updateCategory(id, input);
  revalidatePath("/admin/categories");
}

export async function deleteCategoryAction(id: string) {
  const profile = await requireRole("editor");
  assertPermission(profile, PERMISSIONS.CATEGORIES_MANAGE);
  await deleteCategory(id);
  revalidatePath("/admin/categories");
}
