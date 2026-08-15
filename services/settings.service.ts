import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/services/activity.service";
import type { Database, Json } from "@/types/database.types";

export type GeneralSettings = {
  site_name: string;
  site_description: string;
  logo_url: string | null;
  favicon_url: string | null;
  timezone: string;
  language: string;
};

export type ReadingSettings = {
  completion_threshold_percent: number;
  video_completion_threshold_percent: number;
  auto_next_enabled: boolean;
  auto_next_delay_ms: number;
  next_article_strategy: "same_category" | "algorithmic" | "random";
  /**
   * Reading-progress percentages (1-100, ascending) at which video slots
   * 1/2/3 are automatically placed in the article body — index 0 is slot 1's
   * trigger point, index 1 is slot 2's, index 2 is slot 3's. See
   * lib/content/videoPlacement.ts.
   */
  video_placement_percentages: [number, number, number];
};

export type AdsSettings = {
  max_ads_per_article: number;
  min_paragraphs_between_ads: number;
  min_content_length_before_ads: number;
  disable_on_pages: boolean;
  disable_on_short_articles: boolean;
  short_article_word_count: number;
  excluded_category_ids: string[];
  excluded_post_ids: string[];
};

export type SeoDefaultsSettings = {
  default_seo_title_suffix: string;
  default_meta_description: string;
  default_og_image_url: string | null;
  twitter_handle: string | null;
  organization_name: string;
  organization_logo_url: string | null;
};

export type SocialSettings = {
  facebook_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  linkedin_url: string | null;
};

export type AnalyticsSettings = { anonymous_tracking_enabled: boolean; heartbeat_interval_seconds: number };
export type SecuritySettings = { track_api_rate_limit_per_minute: number };
export type ContentSettings = { default_post_status: string; comments_enabled: boolean };
export type PerformanceSettings = { public_page_revalidate_seconds: number };
/** Non-secret email display config only — SMTP credentials/API keys always live in server env vars, never here. */
export type EmailSettings = { from_name: string; from_email: string | null; reply_to: string | null };

export type SettingsMap = {
  general: GeneralSettings;
  reading: ReadingSettings;
  ads: AdsSettings;
  seo_defaults: SeoDefaultsSettings;
  social: SocialSettings;
  analytics: AnalyticsSettings;
  security: SecuritySettings;
  content: ContentSettings;
  performance: PerformanceSettings;
  email: EmailSettings;
};

export const SETTINGS_DEFAULTS: SettingsMap = {
  general: {
    site_name: "My Content Site",
    site_description: "A modern, fast content site.",
    logo_url: null,
    favicon_url: null,
    timezone: "UTC",
    language: "en",
  },
  reading: {
    completion_threshold_percent: 90,
    video_completion_threshold_percent: 90,
    auto_next_enabled: true,
    auto_next_delay_ms: 1500,
    next_article_strategy: "random",
    video_placement_percentages: [30, 60, 90],
  },
  ads: {
    max_ads_per_article: 5,
    min_paragraphs_between_ads: 4,
    min_content_length_before_ads: 150,
    disable_on_pages: true,
    disable_on_short_articles: true,
    short_article_word_count: 300,
    excluded_category_ids: [],
    excluded_post_ids: [],
  },
  seo_defaults: {
    default_seo_title_suffix: " | My Content Site",
    default_meta_description: "A modern, fast content site.",
    default_og_image_url: null,
    twitter_handle: null,
    organization_name: "My Content Site",
    organization_logo_url: null,
  },
  social: { facebook_url: null, twitter_url: null, instagram_url: null, youtube_url: null, linkedin_url: null },
  analytics: { anonymous_tracking_enabled: true, heartbeat_interval_seconds: 15 },
  security: { track_api_rate_limit_per_minute: 120 },
  content: { default_post_status: "draft", comments_enabled: true },
  performance: { public_page_revalidate_seconds: 60 },
  email: { from_name: "My Content Site", from_email: null, reply_to: null },
};

/**
 * Reads one settings group. `settings` is public-readable under RLS (no
 * secrets ever live in this table), so public pages can pass a
 * `createPublicClient()` here to avoid pulling in cookies()/auth for a
 * plain settings read — admin screens omit the param and get the
 * cookie-scoped client as usual.
 */
export async function getSetting<K extends keyof SettingsMap>(
  key: K,
  client?: SupabaseClient<Database>
): Promise<SettingsMap[K]> {
  const supabase = client ?? (await createClient());
  const { data } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
  return { ...SETTINGS_DEFAULTS[key], ...(data?.value as object) } as SettingsMap[K];
}

export async function getAllSettings(): Promise<SettingsMap> {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("key, value");
  const result = { ...SETTINGS_DEFAULTS };
  for (const row of data ?? []) {
    const key = row.key as keyof SettingsMap;
    if (key in result) {
      // @ts-expect-error -- narrowing per-key generic assignment is not worth the ceremony here
      result[key] = { ...SETTINGS_DEFAULTS[key], ...(row.value as object) };
    }
  }
  return result;
}

export async function updateSetting<K extends keyof SettingsMap>(key: K, value: SettingsMap[K], userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value: value as unknown as Json, updated_by: userId }, { onConflict: "key" });
  if (error) throw new Error(`Failed to update ${key} settings: ${error.message}`);
  await logActivity(supabase, { userId, action: "settings.updated", resourceType: "settings", resourceId: key });
}
