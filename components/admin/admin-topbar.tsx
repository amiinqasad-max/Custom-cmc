"use client";

import { Menu, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/admin/theme-toggle";
import { UserMenu } from "@/components/admin/user-menu";
import { AdminSidebarBrand, AdminSidebarNav } from "@/components/admin/admin-sidebar";
import type { UserRole } from "@/types/database.types";
import type { CurrentProfile } from "@/lib/auth/guards";

export function AdminTopbar({
  profile,
  onOpenCommandPalette,
  mobileOpen,
  onMobileOpenChange,
}: {
  profile: CurrentProfile;
  onOpenCommandPalette: () => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => onMobileOpenChange(true)}>
          <Menu className="size-5" />
        </Button>
        <SheetContent side="left" className="w-64 bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Admin navigation menu</SheetDescription>
          <AdminSidebarBrand />
          <AdminSidebarNav role={profile.role as UserRole} onNavigate={() => onMobileOpenChange(false)} />
        </SheetContent>
      </Sheet>

      <button
        onClick={onOpenCommandPalette}
        className="ml-auto flex w-56 items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted sm:ml-0 sm:mr-auto"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Search or jump to…</span>
        <kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </button>

      <ThemeToggle />
      <UserMenu displayName={profile.displayName} email={profile.email} role={profile.role} />
    </header>
  );
}
