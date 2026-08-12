import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { roleAtLeast, roleHasPermission, type PermissionKey } from "@/lib/auth/permissions";
import type { UserRole } from "@/types/database.types";

export type CurrentProfile = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
};

/**
 * Fetches the signed-in user's profile (auth + RBAC role) for use in Server
 * Components, server actions, and route handlers. Returns null if signed out.
 */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    role: profile.role,
  };
}

/** Redirects to /auth/login if signed out. Use at the top of admin pages/layouts. */
export async function requireUser(nextPath?: string): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect(`/auth/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  }
  return profile;
}

/** Redirects to the dashboard (with a denial flag) if the user's role tier is too low. */
export async function requireRole(minRole: UserRole, nextPath?: string): Promise<CurrentProfile> {
  const profile = await requireUser(nextPath);
  if (!roleAtLeast(profile.role, minRole)) {
    redirect("/admin/dashboard?denied=1");
  }
  return profile;
}

/** Throws inside a server action/route handler if the caller lacks `permission`. */
export function assertPermission(profile: CurrentProfile, permission: PermissionKey) {
  if (!roleHasPermission(profile.role, permission)) {
    throw new Error(`Forbidden: missing permission "${permission}"`);
  }
}
