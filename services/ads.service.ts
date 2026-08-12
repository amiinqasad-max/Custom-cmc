import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { logActivity } from "@/services/activity.service";
import { getSetting } from "@/services/settings.service";
import { resolvePlacements, type CandidatePlacement } from "@/lib/ads/resolvePlacements";
import { analyzeContent } from "@/lib/content/analyze";
import type { AdSlotInput, AdPlacementInput } from "@/schemas/ads";
import type { TiptapDoc } from "@/lib/content/types";

export async function getAdEventsSummary() {
  const supabase = await createClient();
  const { data } = await supabase.from("ad_events").select("event_type");
  const counts: Record<string, number> = { request: 0, load: 0, render: 0, viewable: 0, impression_estimated: 0 };
  for (const row of data ?? []) counts[row.event_type] = (counts[row.event_type] ?? 0) + 1;
  return counts;
}

export async function listAdSlots() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("ad_slots").select("*").order("name");
  if (error) throw new Error(`Failed to list ad slots: ${error.message}`);
  return data ?? [];
}

export async function createAdSlot(input: AdSlotInput, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("ad_slots").insert(input).select().single();
  if (error) throw new Error(`Failed to create ad slot: ${error.message}`);
  await logActivity(supabase, { userId, action: "ad_slot.created", resourceType: "ad_slot", resourceId: data.id });
  return data;
}

export async function updateAdSlot(id: string, input: AdSlotInput, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ad_slots").update(input).eq("id", id);
  if (error) throw new Error(`Failed to update ad slot: ${error.message}`);
  await logActivity(supabase, { userId, action: "ad_slot.updated", resourceType: "ad_slot", resourceId: id });
}

export async function deleteAdSlot(id: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ad_slots").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete ad slot: ${error.message}`);
  await logActivity(supabase, { userId, action: "ad_slot.deleted", resourceType: "ad_slot", resourceId: id });
}

export async function listAdPlacements() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("ad_placements").select("*").order("priority", { ascending: false });
  if (error) throw new Error(`Failed to list ad placements: ${error.message}`);
  return data ?? [];
}

export async function createAdPlacement(input: AdPlacementInput, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("ad_placements").insert(input).select().single();
  if (error) throw new Error(`Failed to create ad placement: ${error.message}`);
  await logActivity(supabase, { userId, action: "ad_placement.created", resourceType: "ad_placement", resourceId: data.id });
  return data;
}

export async function updateAdPlacement(id: string, input: AdPlacementInput, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ad_placements").update(input).eq("id", id);
  if (error) throw new Error(`Failed to update ad placement: ${error.message}`);
  await logActivity(supabase, { userId, action: "ad_placement.updated", resourceType: "ad_placement", resourceId: id });
}

export async function setAdPlacementEnabled(id: string, isEnabled: boolean, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ad_placements").update({ is_enabled: isEnabled }).eq("id", id);
  if (error) throw new Error(`Failed to update ad placement: ${error.message}`);
  await logActivity(supabase, { userId, action: "ad_placement.updated", resourceType: "ad_placement", resourceId: id });
}

export async function deleteAdPlacement(id: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ad_placements").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete ad placement: ${error.message}`);
  await logActivity(supabase, { userId, action: "ad_placement.deleted", resourceType: "ad_placement", resourceId: id });
}

/**
 * Public: resolves which ads actually render for a given post, and returns
 * them joined with their ad_slot config (ad_client/ad_slot code, format).
 * Used by the article page — never called with anything the visitor could
 * influence beyond which article they're viewing.
 */
export async function getResolvedAdPlacementsForPost(params: {
  postId: string;
  categoryId: string | null;
  categoryAdsEnabled: boolean;
  content: TiptapDoc;
  videoSlotsPresent: number[];
  isPage?: boolean;
}) {
  const supabase = createPublicClient();
  const [{ data: placements }, adsSettings, { data: overrides }] = await Promise.all([
    supabase.from("ad_placements").select("*").eq("is_enabled", true),
    getSetting("ads", supabase),
    supabase.from("post_ad_placements").select("ad_placement_id, is_enabled").eq("post_id", params.postId),
  ]);

  const overrideMap = new Map((overrides ?? []).map((o) => [o.ad_placement_id, o.is_enabled]));
  const enabledCandidates = (placements ?? []).filter((p) => overrideMap.get(p.id) ?? true);
  if (enabledCandidates.length === 0) return [];

  const slotIds = [...new Set(enabledCandidates.map((p) => p.ad_slot_id))];
  const { data: slots } = slotIds.length
    ? await supabase.from("ad_slots").select("*").in("id", slotIds).eq("status", "active")
    : { data: [] };
  const slotById = new Map((slots ?? []).map((s) => [s.id, s]));

  const candidates: CandidatePlacement[] = enabledCandidates
    .filter((p) => slotById.has(p.ad_slot_id))
    .map((p) => ({
      id: p.id,
      positionType: p.position_type,
      paragraphNumber: p.paragraph_number,
      videoSlot: p.video_slot,
      priority: p.priority,
      adSlotId: p.ad_slot_id,
    }));

  const analysis = analyzeContent(params.content);

  const resolved = resolvePlacements({
    candidates,
    safety: {
      maxAdsPerArticle: adsSettings.max_ads_per_article,
      minParagraphsBetweenAds: adsSettings.min_paragraphs_between_ads,
      minContentLengthBeforeAds: adsSettings.min_content_length_before_ads,
      disableOnPages: adsSettings.disable_on_pages,
      disableOnShortArticles: adsSettings.disable_on_short_articles,
      shortArticleWordCount: adsSettings.short_article_word_count,
      excludedCategoryIds: adsSettings.excluded_category_ids,
      excludedPostIds: adsSettings.excluded_post_ids,
    },
    context: {
      isPage: params.isPage ?? false,
      postId: params.postId,
      categoryId: params.categoryId,
      wordCount: analysis.wordCount,
      paragraphCount: analysis.paragraphCount,
      videoSlotsPresent: params.videoSlotsPresent,
      adsEnabledOnEntity: params.categoryAdsEnabled,
    },
  });

  return resolved.map((placement) => ({ placement, adSlot: slotById.get(placement.adSlotId)! }));
}
