import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/services/activity.service";
import { PERMISSIONS, type PermissionKey } from "@/lib/auth/permissions";
import type { UserRole } from "@/types/database.types";

export async function listUsers() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list users: ${error.message}`);
  return data ?? [];
}

/**
 * Invites a new staff member by email via Supabase Auth (sends the
 * project's configured invite email). The profile row is created
 * automatically by the handle_new_user() trigger once they accept; we
 * patch its role right after since new signups always default to 'author'.
 */
export async function inviteUser(email: string, role: UserRole, invitedBy: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  });
  if (error) throw new Error(`Failed to invite user: ${error.message}`);

  if (data.user && role !== "author") {
    await admin.from("profiles").update({ role }).eq("id", data.user.id);
  }

  const supabase = await createClient();
  await logActivity(supabase, { userId: invitedBy, action: "user.invited", resourceType: "profile", resourceId: data.user?.id, metadata: { email, role } });
  return data.user;
}

export async function updateUserRole(userId: string, role: UserRole, actingUserId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(`Failed to update role: ${error.message}`);
  await logActivity(supabase, { userId: actingUserId, action: "user.role_changed", resourceType: "profile", resourceId: userId, metadata: { role } });
}

export async function deleteUser(userId: string, actingUserId: string) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`Failed to delete user: ${error.message}`);
  const supabase = await createClient();
  await logActivity(supabase, { userId: actingUserId, action: "user.deleted", resourceType: "profile", resourceId: userId });
}

export async function getRolePermissionsMatrix() {
  const supabase = await createClient();
  const { data } = await supabase.from("role_permissions").select("role, permission_key");
  const matrix = new Map<UserRole, Set<PermissionKey>>();
  for (const role of ["author", "editor", "admin", "super_admin"] as UserRole[]) matrix.set(role, new Set());
  for (const row of data ?? []) matrix.get(row.role)?.add(row.permission_key as PermissionKey);
  return matrix;
}

export async function setRolePermission(role: UserRole, permission: PermissionKey, enabled: boolean, actingUserId: string) {
  if (role === "super_admin") return; // super_admin implicitly has everything; matrix row is informational only
  const supabase = await createClient();
  if (enabled) {
    await supabase.from("role_permissions").upsert({ role, permission_key: permission });
  } else {
    await supabase.from("role_permissions").delete().eq("role", role).eq("permission_key", permission);
  }
  await logActivity(supabase, {
    userId: actingUserId,
    action: "role.permission_changed",
    resourceType: "role_permissions",
    resourceId: role,
    metadata: { permission, enabled },
  });
}

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);
