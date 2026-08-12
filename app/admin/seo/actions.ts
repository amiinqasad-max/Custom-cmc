"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole, assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { updateSetting, type SeoDefaultsSettings } from "@/services/settings.service";
import { createRedirect, updateRedirect, deleteRedirect } from "@/services/redirects.service";

const seoDefaultsSchema = z.object({
  default_seo_title_suffix: z.string().max(100),
  default_meta_description: z.string().max(300),
  default_og_image_url: z.string().url().optional().nullable().or(z.literal("")),
  twitter_handle: z.string().max(50).optional().nullable(),
  organization_name: z.string().min(1).max(200),
  organization_logo_url: z.string().url().optional().nullable().or(z.literal("")),
});

export async function updateSeoDefaultsAction(formData: FormData) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.SEO_MANAGE);

  const parsed = seoDefaultsSchema.parse({
    default_seo_title_suffix: formData.get("default_seo_title_suffix"),
    default_meta_description: formData.get("default_meta_description"),
    default_og_image_url: formData.get("default_og_image_url") || null,
    twitter_handle: formData.get("twitter_handle") || null,
    organization_name: formData.get("organization_name"),
    organization_logo_url: formData.get("organization_logo_url") || null,
  });

  await updateSetting("seo_defaults", parsed as SeoDefaultsSettings, profile.id);
  revalidatePath("/admin/seo");
}

const redirectSchema = z.object({
  from_path: z.string().trim().min(1).startsWith("/", "Must start with /"),
  to_path: z.string().trim().min(1),
  status_code: z.coerce.number().pipe(z.union([z.literal(301), z.literal(302)])),
});

export async function createRedirectAction(formData: FormData) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.REDIRECTS_MANAGE);
  const input = redirectSchema.parse({
    from_path: formData.get("from_path"),
    to_path: formData.get("to_path"),
    status_code: formData.get("status_code"),
  });
  await createRedirect(input, profile.id);
  revalidatePath("/admin/seo");
}

export async function deleteRedirectAction(id: string) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.REDIRECTS_MANAGE);
  await deleteRedirect(id, profile.id);
  revalidatePath("/admin/seo");
}

export async function toggleRedirectAction(id: string, isActive: boolean, fromPath: string, toPath: string, statusCode: 301 | 302) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.REDIRECTS_MANAGE);
  await updateRedirect(id, { from_path: fromPath, to_path: toPath, status_code: statusCode, is_active: isActive }, profile.id);
  revalidatePath("/admin/seo");
}
