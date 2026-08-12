"use server";

import { revalidatePath } from "next/cache";

import { requireRole, assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { pageSchema, type PageInput } from "@/schemas/page";
import { createPage, updatePage, deletePage, getExistingPageSlugs } from "@/services/pages.service";
import { slugifyTitle, uniqueSlug } from "@/lib/content/slug";

export async function savePageAction(pageId: string | null, input: PageInput) {
  const profile = await requireRole("editor");
  assertPermission(profile, PERMISSIONS.PAGES_MANAGE);

  const parsed = pageSchema.parse(input);
  const slugs = await getExistingPageSlugs();
  parsed.slug = uniqueSlug(parsed.slug || slugifyTitle(parsed.title), slugs, pageId ? parsed.slug : undefined);

  const page = pageId ? await updatePage(pageId, parsed, profile.id) : await createPage(parsed, profile.id);

  revalidatePath("/admin/pages");
  revalidatePath(`/page/${page.slug}`);
  return page;
}

export async function deletePageAction(id: string) {
  const profile = await requireRole("editor");
  assertPermission(profile, PERMISSIONS.PAGES_MANAGE);
  await deletePage(id, profile.id);
  revalidatePath("/admin/pages");
}
