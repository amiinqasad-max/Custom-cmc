import type { UserRole } from "@/types/database.types";

/**
 * Mirrors supabase/seed.sql's `permissions` catalog. Kept in sync manually —
 * this constant drives UI gating (nav items, buttons) and is the source of
 * truth `services/users.service.ts` uses to reset the role_permissions table
 * from the admin "Roles" screen. The database is still the enforcement point
 * for actual writes (see has_permission() + RLS), this is for the app layer.
 */
export const PERMISSIONS = {
  POSTS_VIEW: "posts.view",
  POSTS_CREATE: "posts.create",
  POSTS_EDIT_OWN: "posts.edit_own",
  POSTS_EDIT_ANY: "posts.edit_any",
  POSTS_PUBLISH: "posts.publish",
  POSTS_DELETE: "posts.delete",
  PAGES_MANAGE: "pages.manage",
  MEDIA_UPLOAD: "media.upload",
  MEDIA_MANAGE: "media.manage",
  CATEGORIES_MANAGE: "categories.manage",
  TAGS_MANAGE: "tags.manage",
  MENUS_MANAGE: "menus.manage",
  SEO_MANAGE: "seo.manage",
  REDIRECTS_MANAGE: "redirects.manage",
  ADS_MANAGE: "ads.manage",
  ANALYTICS_VIEW: "analytics.view",
  USERS_MANAGE: "users.manage",
  COMMENTS_MODERATE: "comments.moderate",
  SETTINGS_MANAGE: "settings.manage",
  SYSTEM_VIEW: "system.view",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_RANK: Record<UserRole, number> = {
  author: 1,
  editor: 2,
  admin: 3,
  super_admin: 4,
};

export function roleAtLeast(role: UserRole | null | undefined, min: UserRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/** Default role -> permission matrix, mirrors supabase/seed.sql exactly. */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  author: [PERMISSIONS.POSTS_VIEW, PERMISSIONS.POSTS_CREATE, PERMISSIONS.POSTS_EDIT_OWN, PERMISSIONS.MEDIA_UPLOAD],
  editor: [
    PERMISSIONS.POSTS_VIEW,
    PERMISSIONS.POSTS_CREATE,
    PERMISSIONS.POSTS_EDIT_OWN,
    PERMISSIONS.POSTS_EDIT_ANY,
    PERMISSIONS.POSTS_PUBLISH,
    PERMISSIONS.POSTS_DELETE,
    PERMISSIONS.PAGES_MANAGE,
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_MANAGE,
    PERMISSIONS.CATEGORIES_MANAGE,
    PERMISSIONS.TAGS_MANAGE,
    PERMISSIONS.COMMENTS_MODERATE,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
  admin: Object.values(PERMISSIONS),
  super_admin: Object.values(PERMISSIONS),
};

export function roleHasPermission(role: UserRole | null | undefined, permission: PermissionKey): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;
  return DEFAULT_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
