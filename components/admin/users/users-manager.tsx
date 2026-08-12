"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { inviteUserAction, updateUserRoleAction, deleteUserAction } from "@/app/admin/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Tables, UserRole } from "@/types/database.types";

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  editor: "Editor",
  author: "Author",
};

export function UsersManager({ users, currentUserId, canGrantSuperAdmin }: { users: Tables<"profiles">[]; currentUserId: string; canGrantSuperAdmin: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild>
            <Button><UserPlus /> Invite user</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite a staff member</DialogTitle></DialogHeader>
            <form
              action={(fd) =>
                startTransition(async () => {
                  try {
                    await inviteUserAction(fd);
                    toast.success("Invitation sent");
                    router.refresh();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to invite");
                  }
                })
              }
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select name="role" defaultValue="author">
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="author">Author</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {canGrantSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Plus />} Send invite</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="size-7"><AvatarFallback>{(u.display_name ?? u.email).slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                  <div>
                    <p className="text-sm font-medium">{u.display_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Select
                  defaultValue={u.role}
                  disabled={u.id === currentUserId || (u.role === "super_admin" && !canGrantSuperAdmin)}
                  onValueChange={(role) =>
                    startTransition(async () => {
                      try {
                        await updateUserRoleAction(u.id, role);
                        toast.success("Role updated");
                        router.refresh();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Failed to update role");
                      }
                    })
                  }
                >
                  <SelectTrigger className="w-40"><SelectValue>{ROLE_LABEL[u.role]}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="author">Author</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {canGrantSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                {u.id !== currentUserId && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon"><Trash2 className="size-4 text-destructive" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove {u.display_name ?? u.email}?</AlertDialogTitle>
                        <AlertDialogDescription>This revokes their access immediately.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            startTransition(async () => {
                              await deleteUserAction(u.id);
                              toast.success("User removed");
                              router.refresh();
                            })
                          }
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
