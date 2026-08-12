"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole, assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { inviteUser, updateUserRole, deleteUser, setRolePermission } from "@/services/users.service";
import type { PermissionKey } from "@/lib/auth/permissions";
import type { UserRole } from "@/types/database.types";

const roleSchema = z.enum(["author", "editor", "admin", "super_admin"]);

export async function inviteUserAction(formData: FormData) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.USERS_MANAGE);

  const email = z.string().email().parse(formData.get("email"));
  const role = roleSchema.parse(formData.get("role"));
  if (role === "super_admin" && profile.role !== "super_admin") {
    throw new Error("Only a super_admin can invite another super_admin");
  }

  await inviteUser(email, role, profile.id);
  revalidatePath("/admin/users");
}

export async function updateUserRoleAction(userId: string, role: string) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.USERS_MANAGE);
  const parsedRole = roleSchema.parse(role);
  if (parsedRole === "super_admin" && profile.role !== "super_admin") {
    throw new Error("Only a super_admin can grant the super_admin role");
  }
  await updateUserRole(userId, parsedRole, profile.id);
  revalidatePath("/admin/users");
}

export async function deleteUserAction(userId: string) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.USERS_MANAGE);
  if (userId === profile.id) throw new Error("You can't delete your own account");
  await deleteUser(userId, profile.id);
  revalidatePath("/admin/users");
}

export async function setRolePermissionAction(role: UserRole, permission: PermissionKey, enabled: boolean) {
  const profile = await requireRole("admin");
  assertPermission(profile, PERMISSIONS.USERS_MANAGE);
  await setRolePermission(role, permission, enabled, profile.id);
  revalidatePath("/admin/users");
}
