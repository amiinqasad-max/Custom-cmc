"use server";

import { revalidatePath } from "next/cache";

import { requireRole, assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { tagSchema } from "@/schemas/taxonomy";
import { createTag, updateTag, deleteTag, getExistingTagSlugs } from "@/services/tags.service";
import { slugifyTitle, uniqueSlug } from "@/lib/content/slug";
import { parseOrThrow } from "@/lib/zod-error";

function parseForm(formData: FormData) {
  return parseOrThrow(tagSchema, {
    name: formData.get("name"),
    slug: String(formData.get("slug") || "").trim() || slugifyTitle(String(formData.get("name") || "")),
    description: formData.get("description") || null,
  });
}

export async function createTagAction(formData: FormData) {
  const profile = await requireRole("editor");
  assertPermission(profile, PERMISSIONS.TAGS_MANAGE);
  const input = parseForm(formData);
  const slugs = await getExistingTagSlugs();
  input.slug = uniqueSlug(input.slug, slugs);
  await createTag(input);
  revalidatePath("/admin/tags");
}

export async function updateTagAction(id: string, formData: FormData) {
  const profile = await requireRole("editor");
  assertPermission(profile, PERMISSIONS.TAGS_MANAGE);
  const input = parseForm(formData);
  const slugs = await getExistingTagSlugs();
  input.slug = uniqueSlug(input.slug, slugs, input.slug);
  await updateTag(id, input);
  revalidatePath("/admin/tags");
}

export async function deleteTagAction(id: string) {
  const profile = await requireRole("editor");
  assertPermission(profile, PERMISSIONS.TAGS_MANAGE);
  await deleteTag(id);
  revalidatePath("/admin/tags");
}
