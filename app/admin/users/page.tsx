import { requireRole } from "@/lib/auth/guards";
import { listUsers, getRolePermissionsMatrix, ALL_PERMISSIONS } from "@/services/users.service";
import { UsersManager } from "@/components/admin/users/users-manager";
import { RolesMatrix } from "@/components/admin/users/roles-matrix";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const profile = await requireRole("admin");
  const [users, matrix] = await Promise.all([listUsers(), getRolePermissionsMatrix()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">Manage staff accounts and role permissions.</p>
      </div>

      <UsersManager users={users} currentUserId={profile.id} canGrantSuperAdmin={profile.role === "super_admin"} />

      <RolesMatrix
        permissions={ALL_PERMISSIONS}
        matrix={{
          author: [...(matrix.get("author") ?? [])],
          editor: [...(matrix.get("editor") ?? [])],
          admin: [...(matrix.get("admin") ?? [])],
          super_admin: [...(matrix.get("super_admin") ?? [])],
        }}
      />
    </div>
  );
}
