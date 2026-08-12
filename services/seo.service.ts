import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, SeoEntityType } from "@/types/database.types";
import type { SeoMetadataInput } from "@/schemas/seo";

export async function upsertSeoMetadata(
  supabase: SupabaseClient<Database>,
  entityType: SeoEntityType,
  entityId: string,
  seo: SeoMetadataInput
) {
  const { error } = await supabase.from("seo_metadata").upsert(
    {
      entity_type: entityType,
      entity_id: entityId,
      seo_title: seo.seo_title || null,
      meta_description: seo.meta_description || null,
      canonical_url: seo.canonical_url || null,
      robots_index: seo.robots_index,
      robots_follow: seo.robots_follow,
      og_title: seo.og_title || null,
      og_description: seo.og_description || null,
      og_image_id: seo.og_image_id || null,
      twitter_card: seo.twitter_card,
      schema_type: seo.schema_type || null,
    },
    { onConflict: "entity_type,entity_id" }
  );
  if (error) throw new Error(`Failed to save SEO metadata: ${error.message}`);
}

export async function getSeoMetadata(
  supabase: SupabaseClient<Database>,
  entityType: SeoEntityType,
  entityId: string
) {
  const { data } = await supabase
    .from("seo_metadata")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();
  return data;
}
