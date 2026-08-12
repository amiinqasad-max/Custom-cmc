import { requireUser } from "@/lib/auth/guards";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const profile = await requireUser("/admin/dashboard");

  return <AdminShell profile={profile}>{children}</AdminShell>;
}
