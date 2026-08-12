import "server-only";

import { createClient } from "@/lib/supabase/server";
import { renderContentToHtml } from "@/lib/content/render-html";
import { upsertSeoMetadata, getSeoMetadata } from "@/services/seo.service";
import { logActivity } from "@/services/activity.service";
import type { PageInput } from "@/schemas/page";
import type { Json } from "@/types/database.types";

export async function getExistingPageSlugs(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("pages").select("slug");
  return new Set((data ?? []).map((p) => p.slug));
}

export async function listPages() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("pages").select("*").order("updated_at", { ascending: false });
  if (error) throw new Error(`Failed to list pages: ${error.message}`);
  return data ?? [];
}

export async function getPageForEdit(id: string) {
  const supabase = await createClient();
  const { data: page, error } = await supabase.from("pages").select("*").eq("id", id).single();
  if (error) throw new Error(`Page not found: ${error.message}`);
  const seo = await getSeoMetadata(supabase, "page", id);
  return { page, seo };
}

export async function createPage(input: PageInput, authorId: string) {
  const supabase = await createClient();

  const { data: page, error } = await supabase
    .from("pages")
    .insert({
      title: input.title,
      slug: input.slug,
      content: input.content as unknown as Json,
      content_html: renderContentToHtml(input.content),
      featured_image_id: input.featured_image_id ?? null,
      author_id: authorId,
      status: input.status,
      ads_enabled: input.ads_enabled,
      published_at: input.status === "published" ? new Date().toISOString() : null,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create page: ${error.message}`);

  await upsertSeoMetadata(supabase, "page", page.id, input.seo);
  await logActivity(supabase, { userId: authorId, action: "page.created", resourceType: "page", resourceId: page.id });
  return page;
}

export async function updatePage(id: string, input: PageInput, userId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("pages").select("status, published_at").eq("id", id).single();

  const { data: page, error } = await supabase
    .from("pages")
    .update({
      title: input.title,
      slug: input.slug,
      content: input.content as unknown as Json,
      content_html: renderContentToHtml(input.content),
      featured_image_id: input.featured_image_id ?? null,
      status: input.status,
      ads_enabled: input.ads_enabled,
      published_at: input.status === "published" ? (existing?.published_at ?? new Date().toISOString()) : null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update page: ${error.message}`);

  await upsertSeoMetadata(supabase, "page", id, input.seo);
  await logActivity(supabase, { userId, action: "page.updated", resourceType: "page", resourceId: id });
  return page;
}

export async function deletePage(id: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pages").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete page: ${error.message}`);
  await logActivity(supabase, { userId, action: "page.deleted", resourceType: "page", resourceId: id });
}
