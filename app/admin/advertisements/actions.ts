"use server";

import { revalidatePath } from "next/cache";

import { requireRole, assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { adSlotSchema, adPlacementSchema, adSafetySchema } from "@/schemas/ads";
import {
  createAdSlot,
  updateAdSlot,
  deleteAdSlot,
  createAdPlacement,
  setAdPlacementEnabled,
  deleteAdPlacement,
} from "@/services/ads.service";
import { updateSetting } from "@/services/settings.service";
import { parseOrThrow } from "@/lib/zod-error";

function parseSlotForm(formData: FormData) {
  return parseOrThrow(adSlotSchema, {
    name: formData.get("name"),
    ad_client: formData.get("ad_client"),
    ad_slot: formData.get("ad_slot"),
    format: formData.get("format"),
    responsive: formData.get("responsive") === "on",
    status: formData.get("status"),
  });
}

export async function createAdSlotAction(formData: FormData) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.ADS_MANAGE);
  await createAdSlot(parseSlotForm(formData), profile.id);
  revalidatePath("/admin/advertisements");
}

export async function updateAdSlotAction(id: string, formData: FormData) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.ADS_MANAGE);
  await updateAdSlot(id, parseSlotForm(formData), profile.id);
  revalidatePath("/admin/advertisements");
}

export async function deleteAdSlotAction(id: string) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.ADS_MANAGE);
  await deleteAdSlot(id, profile.id);
  revalidatePath("/admin/advertisements");
}

function parsePlacementForm(formData: FormData) {
  const paragraph = formData.get("paragraph_number");
  const videoSlot = formData.get("video_slot");
  return parseOrThrow(adPlacementSchema, {
    name: formData.get("name"),
    ad_slot_id: formData.get("ad_slot_id"),
    position_type: formData.get("position_type"),
    paragraph_number: paragraph ? Number(paragraph) : null,
    video_slot: videoSlot ? Number(videoSlot) : null,
    priority: Number(formData.get("priority") || 0),
    is_enabled: true,
  });
}

export async function createAdPlacementAction(formData: FormData) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.ADS_MANAGE);
  await createAdPlacement(parsePlacementForm(formData), profile.id);
  revalidatePath("/admin/advertisements");
}

export async function toggleAdPlacementAction(id: string, isEnabled: boolean) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.ADS_MANAGE);
  await setAdPlacementEnabled(id, isEnabled, profile.id);
  revalidatePath("/admin/advertisements");
}

export async function deleteAdPlacementAction(id: string) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.ADS_MANAGE);
  await deleteAdPlacement(id, profile.id);
  revalidatePath("/admin/advertisements");
}

export async function updateAdSafetyAction(formData: FormData) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.ADS_MANAGE);

  const parsed = parseOrThrow(adSafetySchema, {
    max_ads_per_article: Number(formData.get("max_ads_per_article")),
    min_paragraphs_between_ads: Number(formData.get("min_paragraphs_between_ads")),
    min_content_length_before_ads: Number(formData.get("min_content_length_before_ads")),
    disable_on_pages: formData.get("disable_on_pages") === "on",
    disable_on_short_articles: formData.get("disable_on_short_articles") === "on",
    short_article_word_count: Number(formData.get("short_article_word_count")),
  });

  await updateSetting(
    "ads",
    { ...parsed, excluded_category_ids: [], excluded_post_ids: [] },
    profile.id
  );
  revalidatePath("/admin/advertisements");
}
