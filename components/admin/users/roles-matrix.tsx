"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { setRolePermissionAction } from "@/app/admin/users/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { PermissionKey } from "@/lib/auth/permissions";
import type { UserRole } from "@/types/database.types";

const ROLES: Exclude<UserRole, "super_admin">[] = ["author", "editor", "admin"];

export function RolesMatrix({
  permissions,
  matrix,
}: {
  permissions: PermissionKey[];
  matrix: Record<UserRole, PermissionKey[]>;
}) {
  const [, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roles &amp; permissions</CardTitle>
        <CardDescription>Super Admin always has every permission and isn&apos;t shown here.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Permission</TableHead>
              {ROLES.map((r) => <TableHead key={r} className="text-center capitalize">{r}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((perm) => (
              <TableRow key={perm}>
                <TableCell className="font-mono text-xs">{perm}</TableCell>
                {ROLES.map((role) => (
                  <TableCell key={role} className="text-center">
                    <Checkbox
                      defaultChecked={matrix[role]?.includes(perm)}
                      onCheckedChange={(checked) =>
                        startTransition(async () => {
                          try {
                            await setRolePermissionAction(role, perm, checked === true);
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Failed to update");
                          }
                        })
                      }
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
