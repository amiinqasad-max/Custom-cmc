"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole, assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { updateSetting } from "@/services/settings.service";
import { parseOrThrow } from "@/lib/zod-error";

async function guard() {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.SETTINGS_MANAGE);
  return profile;
}

const generalSchema = z.object({
  site_name: z.string().trim().min(1).max(150),
  site_description: z.string().trim().max(300),
  logo_url: z.string().trim().max(2048).nullable(),
  favicon_url: z.string().trim().max(2048).nullable(),
  timezone: z.string().trim().min(1),
  language: z.string().trim().min(1).max(10),
});

export async function updateGeneralSettingsAction(formData: FormData) {
  const profile = await guard();
  const parsed = parseOrThrow(generalSchema, {
    site_name: formData.get("site_name"),
    site_description: formData.get("site_description"),
    logo_url: formData.get("logo_url") || null,
    favicon_url: formData.get("favicon_url") || null,
    timezone: formData.get("timezone"),
    language: formData.get("language"),
  });
  await updateSetting("general", parsed, profile.id);
  revalidatePath("/admin/settings");
}

const readingSchema = z.object({
  completion_threshold_percent: z.number().int().min(1).max(100),
  video_completion_threshold_percent: z.number().int().min(1).max(100),
  auto_next_enabled: z.boolean(),
  auto_next_delay_ms: z.number().int().min(0).max(60_000),
  next_article_strategy: z.enum(["same_category", "algorithmic"]),
});

export async function updateReadingSettingsAction(formData: FormData) {
  const profile = await guard();
  const parsed = parseOrThrow(readingSchema, {
    completion_threshold_percent: Number(formData.get("completion_threshold_percent")),
    video_completion_threshold_percent: Number(formData.get("video_completion_threshold_percent")),
    auto_next_enabled: formData.get("auto_next_enabled") === "on",
    auto_next_delay_ms: Number(formData.get("auto_next_delay_ms")),
    next_article_strategy: formData.get("next_article_strategy"),
  });
  await updateSetting("reading", parsed, profile.id);
  revalidatePath("/admin/settings");
}

const socialSchema = z.object({
  facebook_url: z.string().trim().max(2048).nullable(),
  twitter_url: z.string().trim().max(2048).nullable(),
  instagram_url: z.string().trim().max(2048).nullable(),
  youtube_url: z.string().trim().max(2048).nullable(),
  linkedin_url: z.string().trim().max(2048).nullable(),
});

export async function updateSocialSettingsAction(formData: FormData) {
  const profile = await guard();
  const parsed = parseOrThrow(socialSchema, {
    facebook_url: formData.get("facebook_url") || null,
    twitter_url: formData.get("twitter_url") || null,
    instagram_url: formData.get("instagram_url") || null,
    youtube_url: formData.get("youtube_url") || null,
    linkedin_url: formData.get("linkedin_url") || null,
  });
  await updateSetting("social", parsed, profile.id);
  revalidatePath("/admin/settings");
}

const analyticsSchema = z.object({
  anonymous_tracking_enabled: z.boolean(),
  heartbeat_interval_seconds: z.number().int().min(5).max(120),
});

export async function updateAnalyticsSettingsAction(formData: FormData) {
  const profile = await guard();
  const parsed = parseOrThrow(analyticsSchema, {
    anonymous_tracking_enabled: formData.get("anonymous_tracking_enabled") === "on",
    heartbeat_interval_seconds: Number(formData.get("heartbeat_interval_seconds")),
  });
  await updateSetting("analytics", parsed, profile.id);
  revalidatePath("/admin/settings");
}

const securitySchema = z.object({ track_api_rate_limit_per_minute: z.number().int().min(10).max(10_000) });

export async function updateSecuritySettingsAction(formData: FormData) {
  const profile = await guard();
  const parsed = parseOrThrow(securitySchema, { track_api_rate_limit_per_minute: Number(formData.get("track_api_rate_limit_per_minute")) });
  await updateSetting("security", parsed, profile.id);
  revalidatePath("/admin/settings");
}

const contentSchema = z.object({
  default_post_status: z.enum(["draft", "published"]),
  comments_enabled: z.boolean(),
});

export async function updateContentSettingsAction(formData: FormData) {
  const profile = await guard();
  const parsed = parseOrThrow(contentSchema, {
    default_post_status: formData.get("default_post_status"),
    comments_enabled: formData.get("comments_enabled") === "on",
  });
  await updateSetting("content", parsed, profile.id);
  revalidatePath("/admin/settings");
}

const performanceSchema = z.object({ public_page_revalidate_seconds: z.number().int().min(0).max(86_400) });

export async function updatePerformanceSettingsAction(formData: FormData) {
  const profile = await guard();
  const parsed = parseOrThrow(performanceSchema, { public_page_revalidate_seconds: Number(formData.get("public_page_revalidate_seconds")) });
  await updateSetting("performance", parsed, profile.id);
  revalidatePath("/admin/settings");
}

const emailSchema = z.object({
  from_name: z.string().trim().min(1).max(150),
  from_email: z.string().trim().email().optional().or(z.literal("")),
  reply_to: z.string().trim().email().optional().or(z.literal("")),
});

export async function updateEmailSettingsAction(formData: FormData) {
  const profile = await guard();
  const parsed = parseOrThrow(emailSchema, {
    from_name: formData.get("from_name"),
    from_email: formData.get("from_email") || "",
    reply_to: formData.get("reply_to") || "",
  });
  await updateSetting(
    "email",
    { from_name: parsed.from_name, from_email: parsed.from_email || null, reply_to: parsed.reply_to || null },
    profile.id
  );
  revalidatePath("/admin/settings");
}
