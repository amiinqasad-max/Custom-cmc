"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updateProfileAction } from "@/app/admin/settings/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CurrentProfile } from "@/lib/auth/guards";

export function ProfileForm({ profile }: { profile: CurrentProfile }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          try {
            await updateProfileAction(fd);
            toast.success("Profile updated");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to update");
          }
        })
      }
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input id="display_name" name="display_name" defaultValue={profile.displayName ?? ""} required />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={profile.email} disabled />
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <Input value={profile.role.replace("_", " ")} disabled className="capitalize" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="avatar_url">Avatar URL</Label>
        <Input id="avatar_url" name="avatar_url" defaultValue={profile.avatarUrl ?? ""} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Save
      </Button>
    </form>
  );
}
