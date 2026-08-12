import { createPublicClient } from "@/lib/supabase/public";
import { getSetting } from "@/services/settings.service";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const general = await getSetting("general", createPublicClient());

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader siteName={general.site_name} />
      <div className="flex-1">{children}</div>
      <SiteFooter siteName={general.site_name} />
    </div>
  );
}
