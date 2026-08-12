import { ADMIN_NAV } from "@/lib/admin/nav";
import { roleHasPermission } from "@/lib/auth/permissions";
import type { UserRole } from "@/types/database.types";
import { AdminNavLink } from "@/components/admin/nav-link";

export function AdminSidebarNav({ role, onNavigate }: { role: UserRole; onNavigate?: () => void }) {
  const items = ADMIN_NAV.filter((item) => !item.permission || roleHasPermission(role, item.permission));

  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {items.map((item) => (
        <AdminNavLink key={item.href} item={item} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

export function AdminSidebarBrand() {
  return (
    <div className="flex h-14 items-center gap-2 px-4">
      <div className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
        C
      </div>
      <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">Custom CMS</span>
    </div>
  );
}
