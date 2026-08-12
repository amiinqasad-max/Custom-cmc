import Link from "next/link";

import { requireRole } from "@/lib/auth/guards";
import { getAllSettings } from "@/services/settings.service";
import { SettingsTabs } from "@/components/admin/settings/settings-tabs";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireRole("admin");
  const settings = await getAllSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          SEO defaults and redirects live in <Link href="/admin/seo" className="underline underline-offset-4">SEO</Link>,
          ad safety rules in <Link href="/admin/advertisements" className="underline underline-offset-4">Advertisements</Link>,
          and user roles in <Link href="/admin/users" className="underline underline-offset-4">Users</Link>.
        </p>
      </div>

      <Card><CardContent className="pt-2"><SettingsTabs settings={settings} /></CardContent></Card>
    </div>
  );
}
