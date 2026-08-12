"use client";

import { useEffect, useState } from "react";

import type { CurrentProfile } from "@/lib/auth/guards";
import type { UserRole } from "@/types/database.types";
import { AdminSidebarBrand, AdminSidebarNav } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { CommandPalette } from "@/components/admin/command-palette";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AdminShell({
  profile,
  children,
}: {
  profile: CurrentProfile;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex min-h-svh bg-muted/20">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
        <AdminSidebarBrand />
        <ScrollArea className="flex-1 py-2">
          <AdminSidebarNav role={profile.role as UserRole} />
        </ScrollArea>
      </aside>

      <div className="flex min-h-svh flex-1 flex-col lg:pl-64">
        <AdminTopbar
          profile={profile}
          onOpenCommandPalette={() => setPaletteOpen(true)}
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
        />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      <CommandPalette role={profile.role as UserRole} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
