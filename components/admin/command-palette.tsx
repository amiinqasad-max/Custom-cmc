"use client";

import { useRouter } from "next/navigation";

import { ADMIN_NAV } from "@/lib/admin/nav";
import { roleHasPermission } from "@/lib/auth/permissions";
import type { UserRole } from "@/types/database.types";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function CommandPalette({
  role,
  open,
  onOpenChange,
}: {
  role: UserRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const items = ADMIN_NAV.filter((item) => !item.permission || roleHasPermission(role, item.permission));

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Quick navigation" description="Jump to any section">
      <CommandInput placeholder="Search pages…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {items.map((item) => (
            <CommandItem
              key={item.href}
              onSelect={() => {
                onOpenChange(false);
                router.push(item.href);
              }}
            >
              <item.icon />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
